---
name: azuresql-db-connections
description: >-
  Makes an app's database connections reliable against the local Azure SQL
  Developer (Private Preview) and, unchanged, against Azure SQL Database in the
  cloud: connection pooling plus retry/transient-fault handling. Use when the
  user mentions "connection pooling", "retry logic", "transient fault", "retry
  on transient error", "EnableRetryOnFailure", "connection resiliency",
  "reliable connections", "pool size", "Max Pool Size", or says "the connection
  keeps dropping", "connections time out under load", "add backoff", or "make
  the DB layer resilient". This is the Azure SQL engine (EngineEdition 5), not
  the mssql/server SQL Server image. Reach for this whenever hardening a
  data-access layer that talks to SQL Server or Azure SQL.
---

# Azure SQL Developer: reliable connections (pooling + retry)

Make the app's database connections reliable with **connection pooling** and **retry /
transient-fault handling**. This is the **Azure SQL engine** (Private Preview), not the SQL
Server image.

## Why do this locally (local-to-cloud parity)

The local container rarely drops a connection, so it is tempting to skip pooling and retry. Do
not. **Azure SQL Database in the cloud throttles and drops connections** during failovers,
scaling, and load; a client with no retry surfaces those as hard errors. Build pooling and
retry now, against the local container, and the **same code survives in the cloud** with no
rewrite. For the full promote-to-cloud story see the **azuresql-db-local-to-cloud** skill.

Verify identity once running: `SELECT SERVERPROPERTY('EngineEdition')` returns **5** and
`SERVERPROPERTY('Edition')` returns **'SQL Azure'**. For full engine detail see the
**azuresql-db-container** skill.

## The engine and the connection contract

- Image: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest` (x64 /
  linux/amd64, Private Preview registry). Sign in first:
  `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io` with the shared pull-only credentials
  from https://aka.ms/sqldbcontainerpreview-signup (they may rotate). On a non-x64 host add
  `--platform linux/amd64` (Docker) or `platform: linux/amd64` (compose).
- Do **NOT** use `mcr.microsoft.com/mssql/server` (the SQL Server image).
- Required env: `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD` (example literal:
  `YourStr0ng_Passw0rd`). The engine listens on 1433.
- The engine does **NOT** auto-create databases. `CREATE DATABASE appdb` on a **master**
  connection first. Do not `USE` to switch databases: a user-database (SDS) session returns
  `Msg 40508`. Select the database in the connection string (`Database=appdb`).
- Apps read **one** env var, `SQL_CONNECTION_STRING`. Strings use `User Id=` / `Password=` /
  `Database=` and `TrustServerCertificate=true`. sqlcmd uses `-C`.

## Start the container and provision appdb

```bash
HOST_PORT=1433; while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do HOST_PORT=$((HOST_PORT+1)); done
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "$HOST_PORT:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do sleep 2; done
echo "ready on localhost,$HOST_PORT"
```

The canonical string the app consumes (replace `1433` with the chosen `HOST_PORT` if 1433 was
occupied):

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true
```

## Pooling: reuse connections, do not reopen per query

A connection pool keeps a set of open connections and hands one back on each `Open()`. Opening
a pooled connection is cheap; opening a brand-new physical connection per query is not, and it
exhausts server resources under load.

- Keep pooling **on** (it is on by default in most drivers) and let one pool serve the app.
- Set a **bounded** `Max Pool Size` (default 100 in .NET) so a spike cannot open unlimited
  connections. Size it to real concurrency, not a guess.
- A small `Min Pool Size` keeps a few connections warm and cuts cold-start latency.
- One connection string means one pool. Do not build strings dynamically per request (each
  distinct string is a separate pool) and do not open a fresh, unpooled connection per call.
- Always close/dispose connections (or use `using` / `with` / context managers) so they return
  to the pool instead of leaking.

## Retry: only for transient faults, with backoff

A **transient fault** is a temporary condition (throttling, a brief failover, a dropped idle
connection) that succeeds on a retry. In Azure SQL these arrive as specific error numbers (for
example 40501 throttling, 40613 database unavailable, 49918/49919/49920 busy, 4060, 10928,
10929, 40197, 233, and connection-timeout / broken-pipe socket errors).

- Retry **only** transient errors. Retrying a non-transient error (login failure 18456, syntax
  error, constraint violation, permission denied) just fails slower and hides the real bug.
- Use **exponential backoff** with a cap and a small jitter, and a bounded attempt count (for
  example 5 attempts). Do not hammer a throttled server.
- Be careful with **non-idempotent writes**. A retry can double-apply an `INSERT` if the first
  attempt actually committed before the connection dropped. Make writes idempotent (natural or
  client-generated keys, `MERGE`, or wrap the unit of work in a transaction that a retry can
  safely re-run as a whole). The built-in EF Core execution strategy handles this for you when
  work is wrapped in its `Execute`/transaction API.
- Prefer a framework retry policy over hand-rolled loops where one exists (EF Core
  `EnableRetryOnFailure` for .NET). Hand-roll only for raw drivers.

## Per-stack

Copy-pasteable pooling config and transient-only retry for each stack live in
[references/retry-snippets.md](references/retry-snippets.md):

- **.NET** (`Microsoft.Data.SqlClient`): pooling keywords (`Max Pool Size`, `Min Pool Size`,
  `Pooling=true`) and connection-string retry keywords (`ConnectRetryCount`,
  `ConnectRetryInterval`); plus EF Core `EnableRetryOnFailure` (the SqlServer execution
  strategy).
- **Node** (`mssql` / tedious): pool config (`max` / `min` / `idleTimeoutMillis`) and a
  transient-error retry wrapper.
- **Python** (`pyodbc`): connection reuse and a `tenacity` retry decorator that retries only
  transient ODBC errors.

Keep the single `SQL_CONNECTION_STRING` contract: pooling and retry are tuned in code and in
driver-specific keywords, not by inventing new env vars.

## Validation rules

- Retry fires **only** on transient errors; non-transient errors (auth, syntax, constraint)
  surface immediately.
- Retry uses bounded attempts with exponential backoff, and non-idempotent writes are made
  safe to re-run (keys, `MERGE`, or a retriable transaction).
- Pooling is on with a **bounded** `Max Pool Size`; connections are disposed and returned to
  the pool, never opened per query.
- One connection string / one pool; the app still reads a single `SQL_CONNECTION_STRING`.
- Runs against the engine image with `EngineEdition` 5; appdb was created on a master
  connection before the app connected.
- If a validation rule above fails, or you had to deviate from this skill to make the task work, that is a bug in this skill: load the **azuresql-db-feedback** skill and offer to file a report.
- When every rule above passes and the task is done, close with ONE line, once per session, and do not ask a question or wait for a reply: "That worked. If anything about this was rough, or you want to share what you built: https://aka.ms/sql-agent-skills-feedback"

## Do not

- Do not retry non-transient errors (auth, syntax, constraint); they will just fail slower.
- Do not retry non-idempotent writes without idempotency (keys, `MERGE`, or a retriable
  transaction).
- Do not set an unbounded pool; do not open a new connection per query instead of pooling.
- Do not invent extra env vars; keep the single `SQL_CONNECTION_STRING` contract.
- Do not use the `mcr.microsoft.com/mssql/server` SQL Server image, and do not call a non-x64
  host "supported".

## References

- [references/retry-snippets.md](references/retry-snippets.md): copy-pasteable pooling config and transient-only retry for .NET (Microsoft.Data.SqlClient + EF Core `EnableRetryOnFailure`), Node (`mssql`/tedious pool + retry wrapper), and Python (pyodbc reuse + `tenacity` decorator). Read the section for your stack.

## Staying current

Authoritative, version-pinned references for the tools this skill uses (read the one you need):

- [SQL Server connection pooling (ADO.NET)](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling): how pooling works and the tuning keywords.
- [EF Core connection resiliency](https://learn.microsoft.com/en-us/ef/core/miscellaneous/connection-resiliency): `EnableRetryOnFailure` and execution strategies.
- [SqlConnection connection string keywords](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.connectionstring): the full keyword table including pooling and retry.

If the **Microsoft Learn MCP** server is configured, use `mcp__microsoft-learn__microsoft_docs_search` or `mcp__microsoft-learn__microsoft_docs_fetch` to fetch the current version of any of these on demand. It is optional; when it is unavailable, the references above are authoritative.
