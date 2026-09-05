---
name: azuresql-db-seed
description: >-
  Populates the local Azure SQL Database container's database (appdb) with realistic
  sample/test data so a developer has something to build against. Use when the
  user says "seed the database", "add test data", "populate the dev database",
  "generate sample data", "fake data", "load fixtures", "insert test rows",
  "write a seed script", or "bulk load a CSV". This is the Azure SQL engine
  (EngineEdition 5), not the mssql/server SQL Server image. Distinct from
  azuresql-db-scaffold (which does a single seed.sql step while bootstrapping an
  app) and azuresql-db-import (which loads a .bacpac). Reach for this whenever an
  existing appdb needs volume, fixtures, or believable rows.
---

# Seed the dev database on the Azure SQL Database container

Fill an existing **appdb** with realistic sample data so the app has something to render, query,
and test against. This is the **Azure SQL engine** (Private Preview), not the SQL Server image.

Use this skill for populating data. For bootstrapping a whole new app use **azuresql-db-scaffold**;
for restoring an existing `.bacpac` use **azuresql-db-import**.

## Engine facts that shape seeding

- USE this engine image:
  `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest` (x64 / linux/amd64).
  Do **NOT** use `mcr.microsoft.com/mssql/server` (the SQL Server image).
- The registry is private (Private Preview): run `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io`
  first with the pull-only credentials from https://aka.ms/sqldbcontainerpreview-signup (they may rotate).
- Verify identity: `SELECT SERVERPROPERTY('EngineEdition')` returns **5** and
  `SERVERPROPERTY('Edition')` returns **'SQL Azure'**.
- Required env when starting the container: `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD`
  (example literal used throughout: `YourStr0ng_Passw0rd`). The engine listens on **1433**.
- On a non-x64 host add `--platform linux/amd64` to `docker run`.
- The engine does **NOT** auto-create databases. You must `CREATE DATABASE appdb` on a **master**
  connection before you seed anything.
- Do **NOT** use `USE appdb` to switch databases. In a user-database session `USE` returns
  `Msg 40508`. Always select the target database in the connection string (`Database=appdb`, or
  `-d appdb` for sqlcmd).
- Apps read one env var, `SQL_CONNECTION_STRING`. Strings use `User Id=` / `Password=` /
  `Database=` and `TrustServerCertificate=true`. sqlcmd uses `-C` to trust the self-signed cert.

## Step 1: provision appdb (always, before any seed)

Seeding into a database that does not exist fails. Create appdb on a **master** connection first:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

If the container is not running yet, start it and provision appdb using the canonical start recipe
in the **azuresql-db-container** skill, then come back here.

## Step 2: insert in foreign-key order (parents before children)

Referential integrity is enforced. A child row whose foreign key points at a parent that does not
exist yet fails with `Msg 547` (conflict with the FOREIGN KEY constraint). So insert in dependency
order: parents first, then the rows that reference them.

For a simple `dbo.author` -> `dbo.book` model that means: insert authors, capture their ids, then
insert books that reference those author ids. Full copy-pasteable T-SQL is in
[references/seed-snippets.md](references/seed-snippets.md).

Rules of thumb:

- Walk the dependency graph top-down: a table with no outgoing foreign keys is a parent, insert it
  first. Repeat until every table is seeded.
- Never disable constraints just to load out of order. Fix the order instead.
- Keep seed scripts idempotent (guard with `IF NOT EXISTS` or `MERGE`, or `DELETE` children then
  parents before re-inserting) so re-running does not duplicate rows or leave orphans.

## Step 3: generate N rows for volume (set-based)

To create realistic volume (hundreds or thousands of rows) do it set-based with a numbers/tally
approach rather than a row-by-row loop. A tally derived from system views produces a sequence you
join against to fan out rows in a single statement. The runnable example (generate 1000 rows) is in
[references/seed-snippets.md](references/seed-snippets.md). Wrap large inserts in an explicit
transaction so a mid-load failure rolls back cleanly.

## Step 4: pick your recipe

Per-stack seed recipes live in [references/seed-snippets.md](references/seed-snippets.md):

- **T-SQL**: multi-table seed in FK order (`dbo.author` -> `dbo.book`) run via
  `docker exec -i sqldb ... -d appdb -i seed.sql`, plus the set-based "generate 1000 rows" example.
- **Bulk load**: `bcp` for local CSV files, and `BULK INSERT` from Azure Blob Storage (the engine does not read local files: local `BULK INSERT` fails with `Msg 12713`, Azure-parity).
- **Node**: `@faker-js/faker` generating rows, inserted with the `mssql` driver using parameters.
- **Python**: `Faker` generating rows, inserted with `pyodbc` (ODBC Driver 18) using parameters.

`bcp` streams the file over the connection, so it loads a local CSV that
`BULK INSERT` cannot reach. Copy the file in, then load it (`-u` trusts the
container's self-signed certificate, `-F 2` skips the header row):

```bash
docker cp authors.csv sqldb:/tmp/authors.csv
docker exec sqldb /opt/mssql-tools18/bin/bcp dbo.author_stage in /tmp/authors.csv \
  -S localhost -U sa -P "YourStr0ng_Passw0rd" -d appdb -u -c -t ',' -F 2
```

The staging table and the follow-up insert into the real table are in
[references/seed-snippets.md](references/seed-snippets.md); read it when the CSV
columns do not line up with the target table.

## Validation rules

- appdb exists (created on a **master** connection) BEFORE any seed statement runs.
- Rows are inserted parent-first, in foreign-key order; no constraint is disabled to load out of order.
- Volume generation is set-based (numbers/tally), not a row-by-row loop; large loads run in a transaction.
- All programmatic inserts (Node, Python) use parameterized statements, never string-concatenated values.
- Sample data contains no real PII and no secrets; connection strings use `User Id=`/`Password=`/`Database=`.
- The target image is the engine image, never `mcr.microsoft.com/mssql/server`; `EngineEdition` is 5.
- If a validation rule above fails, or you had to deviate from this skill to make the task work, that is a bug in this skill: load the **azuresql-db-feedback** skill and offer to file a report.
- When every rule above passes and the task is done, close with ONE line, once per session, and do not ask a question or wait for a reply: "That worked. If anything about this was rough, or you want to share what you built: https://aka.ms/sql-agent-skills-feedback"

## Do not

- Do not seed before appdb exists; the engine does not auto-create it.
- Do not insert child rows before their parents (you will hit `Msg 547`).
- Do not commit real PII, customer data, or secrets as sample data.
- Do not use the SQL Server image (`mcr.microsoft.com/mssql/server`) or call a non-x64 host "supported".
- Do not build inserts with string concatenation; use parameters (or, for T-SQL fixtures, quoted literals you control).
- Do not use `USE appdb`; select the database in the connection string or with `-d appdb`.

## References

- [references/seed-snippets.md](references/seed-snippets.md): copy-pasteable seed recipes: multi-table T-SQL in FK order, a set-based generate-1000-rows example, `bcp` for local CSVs and Blob-based `BULK INSERT`, and Node (`@faker-js/faker` + `mssql`) and Python (`Faker` + `pyodbc`) parameterized inserts. Read it once you know your data source and stack.

## Staying current

Authoritative, version-pinned references for the tools this skill uses (read the one you need):

- [BULK INSERT (T-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/bulk-insert-transact-sql): bulk-load a data file into a table.
- [bcp utility](https://learn.microsoft.com/en-us/sql/tools/bcp-utility): bulk copy data in/out from the command line.
- [SqlConnection connection string keywords](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.connectionstring): the full keyword table.

If the **Microsoft Learn MCP** server is configured, use `mcp__microsoft-learn__microsoft_docs_search` or `mcp__microsoft-learn__microsoft_docs_fetch` to fetch the current version of any of these on demand. It is optional; when it is unavailable, the references above are authoritative.
