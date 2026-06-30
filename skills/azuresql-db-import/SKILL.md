---
name: azuresql-db-import
description: Imports an existing Azure SQL Database or SQL Server schema and data INTO the local Azure SQL Database container using SqlPackage. Use when asked to "import a bacpac", "load my existing database locally", "restore a dacpac into the container", "bring my prod schema into the dev container", "run my .bacpac/.dacpac against the local Azure SQL engine", or migrate an existing database into the preview container. Handles provisioning the target database on master first, then running SqlPackage /Action:Import against the provisioned user database. Use this for any "get my real database running in the container" request instead of hand-writing SqlPackage flags.
---

# Azure SQL Database container: import a database

Bring an existing database INTO the local Azure SQL Database container from a
`.bacpac` (schema + data) or `.dacpac` (schema only) using SqlPackage.

## What this is (load-bearing facts)

This is the **Azure SQL Database engine** running locally (Private Preview):
`SELECT SERVERPROPERTY('EngineEdition')` returns **5** and `Edition` returns
**'SQL Azure'**. It is **NOT** the SQL Server image
`mcr.microsoft.com/mssql/server`. If you were about to use that SQL Server image, stop
and use this instead.

- Image: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`
  (x64, linux/amd64; private preview registry, sign in first). Registry/tag are
  provisional during Private Preview.
- On a non-x64 host, add `--platform linux/amd64`.
- The engine does **NOT** auto-create databases. You must `CREATE DATABASE appdb`
  on a **master** connection before importing into it.
- Avoid `USE` to switch databases. In a user-database (SDS) session (the
  Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as
  in Azure SQL Database in the cloud. A `master` connection is a non-SDS
  provisioning session where the Azure statement filter is not enforced, so `USE` appears to work there, but `master` is for provisioning
  only, not application work. Always select the target database in the connection
  string (`Database=appdb`, or `-d appdb` for sqlcmd).

For full container detail (start recipe, connection model, readiness), see the
**azuresql-db-container** skill. The minimum you need is inlined below.

## The three steps

1. Have a running container with the target database provisioned on master.
2. Run SqlPackage `/Action:Import` targeting the provisioned user database.
3. Validate what landed (PaaS restrictions may drop some objects).

This is the Private Preview supported import path. Always validate the result.

## Step 0: start the container and provision the target DB

Reuse the canonical start recipe. It picks a free host port, adds `--platform`
only on a non-x64 host, waits for readiness with a retry loop, and provisions the
target database `appdb` on master in that same loop.

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

If the container is already running, just provision the target database on master:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

> The target database MUST exist and be empty before import. SqlPackage imports
> the **user** database; it does not create it on the server for you here.

## Step 1: import with SqlPackage

Point `/TargetConnectionString` at the provisioned database (`Database=appdb`).
Use the canonical connection string shape: `User Id=`/`Password=`/`Database=`,
`TrustServerCertificate=true`.

Schema + data (`.bacpac`):

```bash
SqlPackage /Action:Import \
  /SourceFile:"./mydatabase.bacpac" \
  /TargetConnectionString:"Server=localhost,$HOST_PORT;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
```

Schema only (`.dacpac`) uses `/Action:Publish`, not Import:

```bash
SqlPackage /Action:Publish \
  /SourceFile:"./myschema.dacpac" \
  /TargetConnectionString:"Server=localhost,$HOST_PORT;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
```

If SqlPackage is not installed locally, see `references/sqlpackage-import.md` for
install options and a container-based fallback.

## Step 2: validate

Confirm the engine identity and spot-check that objects landed:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -d appdb \
  -Q "SELECT SERVERPROPERTY('EngineEdition') AS EngineEdition; SELECT COUNT(*) AS Tables FROM sys.tables;"
```

`EngineEdition` must be `5`. Then verify row counts on a few key tables against
the source.

## What may not transfer (PaaS restrictions)

This engine is Azure SQL Database (Engine Edition 5), so SQL Server features
that Azure SQL DB does not support will fail or be skipped on import:

- Cross-database three-part-name references and most cross-DB queries.
- `USE <db>` in scripts: avoid `USE` to switch databases. In a user-database
  (SDS) session (the Azure-faithful context where you develop), `USE` returns
  `Msg 40508`, exactly as in Azure SQL Database in the cloud. A `master` connection
  is a non-SDS provisioning session where the Azure statement filter is not
  enforced, so `USE` appears to work there, but `master` is
  for provisioning only, not application work. Always select the target database in
  the connection string (`Database=appdb`, or `-d appdb` for sqlcmd).
- Server-scoped objects: SQL Agent jobs, server-level logins/linked servers,
  filestream, certain CLR and filegroup/physical-file settings.
- Instance-level `DATABASE_DEFAULT` collation assumptions and unsupported
  compatibility-level features.

Read SqlPackage output for skipped/blocking items. See
`references/sqlpackage-import.md` for the common error patterns and fixes.

## Validation rules

- Target database exists on master and is empty BEFORE import.
- `/TargetConnectionString` sets `Database=appdb` (never the literal `master`).
- After import, `SERVERPROPERTY('EngineEdition')` on the target is `5`.
- Use `.bacpac` for schema + data via `/Action:Import`; `.dacpac` for schema via
  `/Action:Publish`.

## Do not

- Do not use the `mcr.microsoft.com/mssql/server` SQL Server image.
- Do not import into `master`; import into the provisioned user database.
- Do not put `USE appdb` in any pre/post script; select the DB in the connection
  string instead.
- Do not rely on `/docker-entrypoint-initdb.d/*.sql` auto-seeding; it is NOT
  honored by this image.
- Do not call a non-x64 host "supported"; just add `--platform linux/amd64`
  on a non-x64 host.
- Do not treat a clean `docker run` as "ready"; provision inside the retry loop.

## References

- `references/sqlpackage-import.md`: SqlPackage install, full flag reference,
  container-based fallback, and common import errors with fixes.
