---
name: azuresql-db-from-sql-server
description: Migrates a local SQL Server setup to Azure SQL Developer for Azure-faithful local development. Use when a project already uses mcr.microsoft.com/mssql/server, mssql/server, an sqlcmd plus SA password docker setup, a "SQL Server in docker" or "local mssql container", or a docker-compose with the mssql/server image; and use when the user asks for "SQL Server locally", "run mssql in Docker", "spin up a local SQL database", or "test against SQL Server" but actually wants the Azure SQL Database engine (EngineEdition 5). Detects the SQL Server image, rewrites it to Azure SQL Developer, adds --platform on non-x64 hosts, keeps the SA login, flags SQL Server-only features (SQL Agent, FILESTREAM, full Service Broker, cross-server distributed transactions, Windows Auth), and re-points connection strings from master to a provisioned user database.
---

# Migrate from the SQL Server image to Azure SQL Developer

This skill converts an existing local SQL Server setup (the SQL Server image
`mcr.microsoft.com/mssql/server`) into the **Azure SQL Database** container so
local dev matches Azure SQL Database behavior. The two are not the same engine:

| | SQL Server image | Azure SQL Developer |
|---|---|---|
| Image | `mcr.microsoft.com/mssql/server` | `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest` |
| `SERVERPROPERTY('EngineEdition')` | 2/3/4/8 | **5** |
| `SERVERPROPERTY('Edition')` | e.g. 'Developer Edition' | **'SQL Azure'** |
| DB model | one instance, many DBs, `USE` works | master for provisioning only; user DB for work; a user-database (SDS) session returns `Msg 40508` on `USE`, exactly as in the cloud; a `master` connection is a non-SDS provisioning session where the filter is not enforced |

If a project is using the SQL Server image but wants Azure-faithful local dev, **stop
and switch to Azure SQL Developer.** This skill is self-contained;
for full container detail see the **azuresql-db-container** skill.

## When to use

- The project Dockerfile, compose file, or run script references
  `mcr.microsoft.com/mssql/server` or `mssql/server`.
- There is an sqlcmd plus SA password setup, or someone says "SQL Server in
  Docker" / "a local mssql container".
- The user asks for "SQL Server locally" but actually targets Azure SQL Database.

## Migration steps

### 1. Detect SQL Server usage

Search the repo for the SQL Server image and the patterns that move with it:

```bash
grep -rniE 'mcr\.microsoft\.com/mssql/server|mssql/server|ACCEPT_EULA|MSSQL_SA_PASSWORD|SA_PASSWORD|sqlcmd|Server=localhost,1433|Database=master' . 2>/dev/null
```

Anything that hits is a candidate for rewrite below.

### 2. Sign in to the preview registry

The image is in a private preview registry; sign in once with the shared
pull-only credentials provided when you sign up at https://aka.ms/sqldbcontainerpreview-signup (they may
be rotated during the preview):

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io
```

Registry and tag are provisional during Private Preview.

### 3. Rewrite the image and add --platform

Replace the SQL Server image with the Azure SQL Database image. The Azure image is x64
only, so on a non-x64 host add `--platform linux/amd64`
(Docker) or `platform: linux/amd64` (compose).

- Old: `mcr.microsoft.com/mssql/server:2022-latest`
- New: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`

Keep `ACCEPT_EULA=Y`, keep the complex `MSSQL_SA_PASSWORD`, keep the SA login,
keep port 1433. See `references/migrate-compose.md` for a before/after compose.

### 4. Start the container and provision appdb first

The engine does **not** auto-create databases on connect, and it is **not**
ready the instant `docker run` returns. Use the canonical start recipe: it picks
a free host port, adds `--platform` only on non-x64 hosts, waits for readiness
with a retry loop, and provisions `appdb` inside that same loop. The `-b -l 2`
flags make a SQL error set the exit code so transient startup errors (e.g.
`Msg 913`) are retried, not masked.

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

A `master` connection is for provisioning only; do real work on `appdb`.

### 5. Re-point connection strings from master to the user DB

SQL Server projects often connect straight to `master` (or rely on a DB that SQL Server auto-creates). Azure SQL Database will not auto-create a database. Select the
target database in the connection string (`Database=appdb`, or `-d appdb` for
sqlcmd). Avoid `USE` to switch databases. In a user-database (SDS) session (the
Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as
in Azure SQL Database in the cloud. A `master` connection is a non-SDS
provisioning session where the Azure statement filter is not enforced, so `USE` appears to work there, but `master` is for provisioning
only, not application work. Always select the target database in the connection
string (`Database=appdb`, or `-d appdb` for sqlcmd). Standardize on one
`SQL_CONNECTION_STRING` env var:

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true
```

Use `User Id=` / `Password=` / `Database=`, not `Uid=` / `Pwd=`. For sqlcmd use
`-C` to trust the self-signed cert and `-d appdb` to pick the database.

### 6. Seed AFTER provisioning (no auto-init folder)

The image does **not** auto-run `/docker-entrypoint-initdb.d/*.sql`. That is a
Postgres/MySQL convention and is not honored here; do not rely on it. Seed by
running your script against the provisioned database:

```bash
docker exec -i sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -d appdb -i /dev/stdin < seed.sql
```

### 7. Remove SQL Server-only features

Some features exist only in the SQL Server image and must be removed or replaced.
Flag and fix every hit. Full table in `references/sql-server-vs-azure-feature-matrix.md`.

- **SQL Server Agent** jobs: not available; use an external scheduler.
- **FILESTREAM / FileTable**: not supported; store blobs in columns or external storage.
- **Full Service Broker** cross-instance messaging: not supported.
- **Cross-server distributed transactions** (MS DTC, linked servers): not supported.
- **Windows Auth / NTLM / Integrated Security**: not supported; use SA / SQL auth.

### 8. Verify identity

Confirm you are on the Azure SQL Database engine:

```bash
docker exec -i sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -d appdb \
  -Q "SELECT SERVERPROPERTY('EngineEdition') AS EngineEdition, SERVERPROPERTY('Edition') AS Edition;"
```

Expect `EngineEdition = 5` and `Edition = SQL Azure`.

## Vectors (if the project uses embeddings)

The Azure SQL Database engine has a native `VECTOR(n)` type and
`VECTOR_DISTANCE('cosine', a, b)`. Insert with `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))` where **n
is a LITERAL, never a bind parameter** (a parameter dimension fails with
"Incorrect syntax near '@P3'"). `CREATE VECTOR INDEX` (DiskANN) is still in
development; use a full-scan top-k query for now.

## Validation rules

- Image is `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`, not `mcr.microsoft.com/mssql/server`.
- `appdb` is created on a master connection before any app connects to it.
- App connection strings use `Database=appdb`, never `Database=master` for real work.
- No `USE <db>` statements: in a user-database (SDS) session, `USE` returns `Msg 40508`, exactly as in Azure SQL Database in the cloud; a `master` connection is a non-SDS provisioning session where the filter is not enforced, but `master` is for provisioning only. Select the database in the connection string.
- `--platform linux/amd64` present on non-x64 hosts only.
- `EngineEdition` returns 5.

## Do not

- Do not keep `mcr.microsoft.com/mssql/server`; it is a different engine.
- Do not rely on database auto-creation or on `/docker-entrypoint-initdb.d/*.sql`.
- Do not use `USE appdb`; select the database in the connection string.
- Do not call a non-x64 host "supported"; just add `--platform linux/amd64` on non-x64 hosts.
- Do not use `Uid=` / `Pwd=`; use `User Id=` / `Password=`.
- Do not pass the vector dimension as a bind parameter.
- Do not keep SQL Agent, FILESTREAM, full Service Broker, cross-server distributed transactions, or Windows Auth.

## References

- `references/sql-server-vs-azure-feature-matrix.md`: what carries over, what changes, what is gone.
- `references/migrate-compose.md`: before/after docker-compose with a provision step.
