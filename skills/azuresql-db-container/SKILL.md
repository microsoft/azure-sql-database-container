---
name: azuresql-db-container
description: >-
  Runs the Azure SQL Database engine locally in a container (Private Preview):
  the real PaaS engine where SERVERPROPERTY('EngineEdition') returns 5 and
  Edition is 'SQL Azure'. This is NOT the SQL Server image
  mcr.microsoft.com/mssql/server. Use when a user wants to "run Azure SQL
  locally", "add a local SQL database", "add SQL Server to my docker compose",
  "spin up a local mssql container", "local SQL for development or CI", "connect
  with sqlcmd", "use Podman for SQL", "SQL container won't start", or asks
  "what's the connection string". Use even when the user does not name the
  container. If you were about to use mcr.microsoft.com/mssql/server, stop and
  use this skill instead. Hub skill: owns the shared references and routes to the
  task skills for compose, CI, seeding, vectors, and connection strings.
---

# Azure SQL Database container (local, Private Preview)

This is the entry point for running the **Azure SQL Database engine** on your
machine in a container. It owns the shared reference docs that every task skill
links to. Start here, then hand off to a task skill.

## Are you reaching for the SQL Server image? Use this instead

If you were about to add `mcr.microsoft.com/mssql/server` (the "mssql
container", the SQL Server) to a Dockerfile, docker compose, or a CI
service, **stop**. That is a different product. For Azure SQL Database parity
(developing against the cloud PaaS engine) use this image instead:

```
sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

Self-check: a correct engine returns `5` for
`SELECT SERVERPROPERTY('EngineEdition')` and `'SQL Azure'` for
`SERVERPROPERTY('Edition')`. The SQL Server image returns different values.

## Lifecycle end to end

### 1. Sign in to the private preview registry

The image lives in a private Private Preview registry. Sign in once with the
shared, pull-only username and password. The credentials are not in any doc:
get them by signing up at https://aka.ms/sqldbcontainerpreview-signup. They are pull-only and
may be rotated during the preview, so treat them as secrets and do not
redistribute. See `references/image-and-registry.md`.

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>
```

### 2. Start the container (canonical recipe)

This finds a free host port, adds `--platform linux/amd64` only on a non-x64
host, waits until the engine is actually ready, and provisions `appdb` inside
the same retry loop. Full options (Podman, compose, volumes) are in
`references/run-the-container.md` and `references/wait-until-ready.md`.

```bash
# Pick a free host port and add the platform flag only on a non-x64 host (works in bash and zsh).
HOST_PORT=1433; while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do HOST_PORT=$((HOST_PORT+1)); done
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "$HOST_PORT:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do sleep 2; done
echo "ready on localhost,$HOST_PORT"
```

### 3. Required environment variables

- `ACCEPT_EULA=Y` (required).
- `MSSQL_SA_PASSWORD` (required, complex: at least 8 characters using at least
  three of upper case, lower case, digits, and symbols). The engine listens on container port `1433`.
- App convention: apps read one `SQL_CONNECTION_STRING` env var.

Details: `references/environment-variables.md`.

### 4. Connect and VERIFY the engine identity (self-check guard)

After provisioning, connect to `appdb` and confirm you are on the real engine
before doing anything else:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -d appdb -Q "SELECT SERVERPROPERTY('EngineEdition') AS EngineEdition, SERVERPROPERTY('Edition') AS Edition;"
```

Expect `EngineEdition = 5` and `Edition = SQL Azure`. If you see anything else,
you started the wrong image. Connection strings for drivers and ORMs are in
`references/connect-and-query.md`.

## The three connection-model facts (state these plainly)

These bite every newcomer. Full workflow in `references/connection-model.md`.

1. **The engine does NOT auto-create databases on connect.** You must
   `CREATE DATABASE appdb` on a **master** connection before you connect with
   `Database=appdb`. Connecting to a database that does not exist fails. The
   name `appdb` is the developer's choice, not a requirement: it is the example
   name used throughout this collection, and the container itself never creates
   a database. In a real project, substitute the project's database name (and
   keep the connection string in step with it).
2. **Select the database in the connection string, not with `USE`.** Avoid
   `USE` to switch databases. In a user-database (SDS) session (the
   Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly
   as in Azure SQL Database in the cloud. A `master` connection is a non-SDS
   provisioning session where the Azure statement filter is not enforced, so
   `USE` appears to work there, but `master` is for
   provisioning only, not application work. Always select the target database in
   the connection string (`Database=appdb`, or `-d appdb` for sqlcmd).
3. **A `master` connection is for provisioning only.** Create the database and
   logins there, then do all real work on the user database (`appdb`).

## Seeding (no auto-init directory)

The image does **NOT** auto-run `/docker-entrypoint-initdb.d/*.sql`. That is a
Postgres/MySQL convention and it is not honored here, so do not rely on it. Seed
explicitly, AFTER provisioning `appdb`:

```bash
docker exec -i sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -d appdb -i /path/in/container/seed.sql
```

Never seed by running `USE appdb` at the top of a script. Target the database
with `-d appdb`.

## Offline / reproducible (compose + named volume + seed)

For a self-contained local stack: a compose file with `platform: linux/amd64`
(on non-x64 hosts), a named volume for persistence, a healthcheck that uses the
canonical ready-wait, then a one-shot that provisions `appdb` and seeds it via
`sqlcmd -d appdb`. The full compose example and seed ordering are in
`references/run-the-container.md` and `references/wait-until-ready.md`.

## Stop and clean up

```bash
docker rm -f sqldb            # stop and remove the container
docker volume rm sqldb-data   # only if you created a named volume and want a clean slate
```

## What this is NOT

- It is **not** `mcr.microsoft.com/mssql/server` (the SQL Server).
- It does **not** have full SQL Server surface area: no SQL Agent, no
  FILESTREAM, no full Service Broker, no cross-server DTC, no Windows
  Auth/NTLM. Validate features against the cloud before declaring readiness.
  See `references/paas-parity-checklist.md`.
- It does **not** auto-create databases and does **not** auto-run a seed
  directory.
- The image is x64 only (`linux/amd64`). On a non-x64 host, add
  `--platform linux/amd64` to run under emulation.

## Hand off to a task skill

Provisioning and identity are settled here. Route the actual task:

- `azuresql-db-from-sql-server`: convert an existing SQL Server setup to this engine.
- `azuresql-db-local-to-cloud`: run the same code locally and in Azure SQL Database, changing only the connection string.
- `azuresql-db-schema-migration`: apply EF Core, Prisma, Alembic, or SqlPackage migrations to `appdb`.
- `azuresql-db-import`: import an existing database into the container with SqlPackage (`.bacpac` / `.dacpac`).
- `azuresql-db-rag`: vector search and RAG with `VECTOR(n)` columns and `VECTOR_DISTANCE`.
- `azuresql-db-ci`: use the engine as a CI service / test database.
- `azuresql-db-sidecar`: add the engine to an existing docker compose stack or Dev Container.
- `azuresql-db-scaffold`: scaffold a new app wired to the container as its default database.

## Reference index

- `references/image-and-registry.md`: image tag and private-registry sign-in (single source of truth).
- `references/run-the-container.md`: Docker, Podman, compose, platform, ports, volumes.
- `references/connection-model.md`: master vs user DB, provision-then-connect, Msg 40508, seeding pattern.
- `references/connect-and-query.md`: sqlcmd and driver/ORM connection strings.
- `references/environment-variables.md`: `ACCEPT_EULA`, `MSSQL_SA_PASSWORD`, `SQL_CONNECTION_STRING`.
- `references/wait-until-ready.md`: the readiness retry loop and compose healthcheck.
- `references/troubleshooting.md`: common failures and fixes.
- `references/paas-parity-checklist.md`: what is not present vs the SQL Server.
