---
name: azuresql-db-schema-migration
description: Runs database schema migrations against the local Azure SQL Database container so the same migrations apply identically on the local engine and in the Azure cloud. Use when asked to "run my migrations against the local SQL", "apply schema to the container", "apply EF Core / dotnet ef database update", "Prisma migrate dev / deploy", "Alembic upgrade head", or deploy a DACPAC / SqlPackage to the container. Covers provisioning appdb on master first, then applying schema to the user database, plus per-tool commands and connection-string hygiene. This is the Azure SQL Database engine (EngineEdition 5), not the SQL Server box image; reach for this skill whenever schema migration tooling targets the local container.
---

# Azure SQL Database: schema migrations

Apply schema migrations to the local **Azure SQL Database** container the same way
you would against the cloud, so dev and prod stay identical. This is the Azure SQL
Database engine (`SELECT SERVERPROPERTY('EngineEdition')` returns **5**,
`Edition` returns **'SQL Azure'**), **not** the SQL Server box image
`mcr.microsoft.com/mssql/server`. If a tool or template points at the box image,
stop and use the image below instead.

## The one rule that breaks every migration tool

The engine does **NOT** auto-create databases on connect. Every migration tool
assumes the target database already exists. So:

1. Provision `appdb` on a **master** connection FIRST.
2. Then point the migration tool at the **user** database (`Database=appdb`).

Avoid `USE` to switch databases. In a user-database (SDS) session (the
Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as in
Azure SQL Database in the cloud. A `master` connection is a non-SDS provisioning
session where the Azure statement filter is not enforced, so `USE` (and
`BACKUP`/`RESTORE`) appear to work there, but `master` is for provisioning only, not
application work. Always select the target database in the connection string
(`Database=appdb`, or `-d appdb` for sqlcmd). A `master` connection is for
provisioning only; run migrations against `appdb`.

## Start the container and provision appdb (canonical recipe)

The engine is not ready the instant `docker run` returns. Wait with a retry loop
and create `appdb` inside that same loop. Image is x64 only; on a non-x64 host the
recipe adds `--platform linux/amd64` automatically. The registry is private during
Private Preview, so sign in first.

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io   # pull-only creds from the Private Preview cohort (feedback channel)

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

`-C` trusts the self-signed cert; `-b` makes a SQL error set the exit code so
transient startup errors (like `Msg 913`) are retried instead of masked. Never
poll bare `sqlcmd` without `-l`. For full lifecycle detail, see the
**azuresql-db-container** skill.

## Connection-string hygiene

Standardize on one form and read it from a single `SQL_CONNECTION_STRING` env var:

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true
```

- Use `User Id=` / `Password=` / `Database=`, NOT `Uid=` / `Pwd=`.
- `Database=appdb`, never `master`, for migrations and app work.
- `TrustServerCertificate=true` for the local self-signed cert.
- If you chose a non-default `HOST_PORT` above, use `Server=localhost,<HOST_PORT>`.

## Apply migrations (per tool)

Provision `appdb` (above) BEFORE any of these. Full options, env wiring, and
troubleshooting per tool are in `references/migration-tools.md`.

### EF Core (.NET)

```bash
export SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
dotnet ef database update
```

EF Core's `EnsureCreated`/`Migrate` will create `appdb` only if your account can
create databases; provisioning on master first is the reliable path. See
references for the design-time factory and CI (`migrations bundle`) form.

### Prisma (Node)

Prisma needs the `sqlserver://` URL form in `DATABASE_URL`:

```bash
npm install -D prisma@6
npm install @prisma/client@6
export DATABASE_URL="sqlserver://localhost:1433;database=appdb;user=sa;password=YourStr0ng_Passw0rd;trustServerCertificate=true"
npx prisma migrate deploy          # apply committed migrations (CI / prod-like)
npx prisma migrate dev --name init # author + apply a new migration (local dev)
```

Pinned to Prisma 6; Prisma 7 moved the datasource `url` into a prisma.config.ts and
requires a driver adapter (@prisma/adapter-mssql). See references for the adapter wiring.

### Alembic (Python)

```bash
export SQL_CONNECTION_STRING="mssql+pyodbc://sa:YourStr0ng_Passw0rd@localhost,1433/appdb?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
alembic upgrade head
```

### SqlPackage / DACPAC

```bash
sqlpackage /Action:Publish /SourceFile:./app.dacpac \
  /TargetServerName:"localhost,1433" /TargetDatabaseName:appdb \
  /TargetUser:sa /TargetPassword:"YourStr0ng_Passw0rd" \
  /TargetTrustServerCertificate:true
```

## Vectors in migrations

The engine has a native `VECTOR(n)` column type and `VECTOR_DISTANCE('cosine', a, b)`.
In a migration, the dimension `n` is a **literal** in DDL (`embedding VECTOR(1536)`).
When inserting via `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))`, `n` must be a
literal, never a bind parameter (a parameter dimension fails with "Incorrect
syntax near '@P3'"); the inner `NVARCHAR(MAX)` cast keeps a real embedding's
JSON from being sent as ntext, which the engine rejects (error 529).
`CREATE VECTOR INDEX` (DiskANN) is still in development; use full-scan top-k for now.

## Seeding after migration

The image does **NOT** auto-run `/docker-entrypoint-initdb.d/*.sql` (that is a
Postgres/MySQL convention and is not honored here). Seed explicitly AFTER
migrating:

```bash
docker exec -i sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa \
  -P "YourStr0ng_Passw0rd" -C -b -d appdb -i seed.sql
```

## Validation rules

- `appdb` exists on master before the migration tool runs.
- Migration tool targets `Database=appdb`, not `master`.
- Connection string uses `User Id=`/`Password=`/`Database=` and `TrustServerCertificate=true`.
- No `USE appdb` anywhere; select the database in the connection string. In a user-database (SDS) session `USE` returns `Msg 40508`, exactly as in Azure SQL Database in the cloud; it appears to work only on a `master` non-SDS provisioning session, which is for provisioning only.
- Ran the ready-wait loop with `-b -l`; container reported "ready" before migrating.

## Do not

- Do NOT use the SQL Server box image `mcr.microsoft.com/mssql/server`.
- Do NOT expect databases to be auto-created on connect.
- Do NOT use `USE <db>` to switch databases.
- Do NOT rely on `/docker-entrypoint-initdb.d/` auto-seeding.
- Do NOT call arm64/Apple Silicon "supported"; just add `--platform linux/amd64` on a non-x64 host.
- Do NOT pass a vector dimension as a bind parameter.
- Do NOT run migrations on a `master` connection.
