---
name: azuresql-db-scaffold
description: Scaffolds a NEW app (.NET Aspire, FastAPI, Next.js, NestJS) wired to the local Azure SQL Database container as its default dev database. Use when starting/bootstrapping/initializing a project that needs SQL Server or Azure SQL locally, or when adding "set up the database", "docker compose for the db", "create the local DB", ".env connection string", "first migration", or a data-access layer. Use this INSTEAD of the mssql/server SQL Server image, because this is the Azure SQL engine (EngineEdition 5). Triggers include "scaffold app with SQL", "spin up Azure SQL locally", "compose service for the database", "wire up Prisma/EF/SQLAlchemy/TypeORM to SQL Server". Reach for this even when the user only says "add a database" to a fresh project.
---

# Azure SQL DB: scaffold a new project

Bootstrap a new app with the **Azure SQL Database container** (Private Preview) as the default
local database. This is the **Azure SQL engine**, not the SQL Server image.

## Use the right image (interception point)

- USE this engine image:
  `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`
- Do **NOT** use `mcr.microsoft.com/mssql/server` (the SQL Server image). If a generated
  compose/run command points there, stop and switch to the engine image above.
- Verify identity once running: `SELECT SERVERPROPERTY('EngineEdition')` returns **5**,
  `SERVERPROPERTY('Edition')` returns **'SQL Azure'**.
- Image is x64 only. On a non-x64 host add `--platform linux/amd64` (Docker) or
  `platform: linux/amd64` (compose).
- Registry is private (Private Preview): sign in first with
  `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io` using the shared pull-only credentials
  provided to the Private Preview cohort (get them by signing up at https://aka.ms/sqldbcontainerpreview-signup; they
  may rotate).
  Registry and tag are provisional during Private Preview.

For full engine detail (readiness, vectors, troubleshooting) see the **azuresql-db-container** skill.

## Three facts that bite every scaffold

1. The engine does **NOT** auto-create databases. You must `CREATE DATABASE appdb` on a
   **master** connection before connecting with `Database=appdb`.
2. Avoid `USE` to switch databases. In a user-database (SDS) session (the Azure-faithful
   context where you develop), `USE` returns `Msg 40508`, exactly as in Azure SQL Database in
   the cloud. A `master` connection is a non-SDS provisioning session where the Azure statement
   filter is not enforced, so `USE` appears to work there, but `master`
   is for provisioning only, not application work. Always select the target database in the
   connection string (`Database=appdb`, or `-d appdb` for sqlcmd).
3. A `master` connection is for provisioning only; do real work on the user database.

Also: the image does **NOT** auto-run `/docker-entrypoint-initdb.d/*.sql` (that is a
Postgres/MySQL convention; not honored here). Seed with `sqlcmd -d appdb -i seed.sql` AFTER
provisioning appdb.

## Step 1: start the container and provision appdb

Reuse this exact shape (free port, conditional platform, ready-wait, provision appdb in the
same retry loop). The `-b` makes a SQL error set the exit code, so transient startup errors
(like `Msg 913`) are retried, not masked. Never poll bare sqlcmd without `-l`.

```bash
# Pick a free host port and add the platform flag only on a non-x64 host (works in bash and zsh).
HOST_PORT=1433; while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do HOST_PORT=$((HOST_PORT+1)); done
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "$HOST_PORT:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do sleep 2; done
echo "ready on localhost,$HOST_PORT"
```

Required env: `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD` (at least 8 characters using at
least three of upper case, lower case, digits, and symbols). The engine listens on 1433.

## Step 2: the canonical connection string

Apps read **one** env var, `SQL_CONNECTION_STRING` (replace `1433` with the `HOST_PORT` Step 1 chose if 1433 was occupied):

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true
```

Use `User Id=` / `Password=` / `Database=` (NOT `Uid=` / `Pwd=`). For sqlcmd use `-C` to trust
the self-signed cert. For Prisma (NestJS / Next.js) the same instance is also expressed as a
`sqlserver://` URL in `DATABASE_URL` (see snippets).

## Step 3: pick your stack

Per-stack scaffold snippets (compose service, `.env`, provision appdb, first migration, typed
data-access layer with parameterized queries) live in
[references/scaffold-snippets.md](references/scaffold-snippets.md):

- .NET Aspire (EF Core)
- FastAPI (SQLAlchemy / pyodbc)
- Next.js (Prisma, `sqlserver://` DATABASE_URL)
- NestJS (Prisma or TypeORM)

## Step 4: first migration and seeding

The skeleton creates the schema via your stack's migration tool. For the full migration
workflow (idempotent scripts, ordering, applying inside the ready-wait loop) cross-link the
**azuresql-db-schema-migration** skill. Seed only AFTER appdb exists:

```bash
docker exec -i sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -d appdb -i seed.sql
```

## Vectors (if your app uses embeddings)

Native `VECTOR(n)` column type and `VECTOR_DISTANCE('cosine', a, b)`. Insert with
`CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))` where **n is a LITERAL, never a bind parameter** (a parameter dimension
fails with "Incorrect syntax near '@P3'"). `CREATE VECTOR INDEX` (DiskANN) is still in
development; use full-scan top-k for now.

## Validation rules

- Compose/run targets the engine image, never `mcr.microsoft.com/mssql/server`.
- appdb is created on a master connection BEFORE any app/migration connects to `Database=appdb`.
- App reads `SQL_CONNECTION_STRING` (and `DATABASE_URL` where the ORM needs it); strings use
  `User Id=`/`Password=`/`Database=`.
- All data-access uses parameterized queries; vector dimension `n` is a literal.
- `EngineEdition` is 5 against the running container.

## Do not

- Do not use the SQL Server image or call arm64/Apple Silicon "supported".
- Do not rely on auto-created databases or `/docker-entrypoint-initdb.d/*.sql` auto-seeding.
- Do not use `USE appdb` to switch databases; put it in the connection string.
- Do not poll bare `sqlcmd` without `-l`; do not pass the vector dimension as a bind parameter.
- Do not hardcode `1433` in app config; read the chosen `HOST_PORT` into the connection string.
