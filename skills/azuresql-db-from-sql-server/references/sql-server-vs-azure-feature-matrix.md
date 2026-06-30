# SQL Server image vs Azure SQL Database container: feature matrix

How a `mcr.microsoft.com/mssql/server` setup maps to the Azure SQL
Database container. Use this when auditing a project for migration.

## Contents

- [Identity and connection](#identity-and-connection)
- [Carries over unchanged](#carries-over-unchanged)
- [Changes behavior](#changes-behavior)
- [Gone: remove or replace](#gone-remove-or-replace)
- [New capabilities](#new-capabilities)

## Identity and connection

| Aspect | Box image | Azure SQL Database container |
|---|---|---|
| Image | `mcr.microsoft.com/mssql/server` | `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest` |
| Registry | public (mcr) | private preview; `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io` first |
| `EngineEdition` | 2/3/4/8 | 5 |
| `Edition` | e.g. 'Developer Edition' | 'SQL Azure' |
| Architecture | x64 and arm64 | x64 only; add `--platform linux/amd64` on non-x64 hosts |
| Port | 1433 | 1433 |
| Login | SA / SQL auth | SA / SQL auth (same) |

## Carries over unchanged

- The SA login and a complex `MSSQL_SA_PASSWORD` (8+ chars, upper/lower/digit/symbol).
- `ACCEPT_EULA=Y`.
- Port 1433 and `TrustServerCertificate=true` for the self-signed cert.
- Core T-SQL: tables, views, indexes, stored procedures, functions, triggers,
  most data types, transactions within a single database.
- sqlcmd as the CLI (use `-C` to trust the cert, `-d appdb` to pick the database).

## Changes behavior

| Behavior | Box image | Azure SQL Database container | What to do |
|---|---|---|---|
| Database creation | apps often auto-create or use a pre-created DB | engine does NOT auto-create on connect | `CREATE DATABASE appdb` on a master connection first |
| Switching DBs | `USE appdb` works | a user-database (SDS) session returns `Msg 40508` on `USE`, exactly as in the cloud; a `master` connection is a non-SDS provisioning session where the filter is not enforced, so `USE` appears to work there | select DB in the connection string (`Database=appdb` / `-d appdb`); avoid `USE`; use `master` for provisioning only |
| master DB | used freely | provisioning only | do real work on the user DB |
| Auto init scripts | many setups copy SQL into the image | `/docker-entrypoint-initdb.d/*.sql` NOT honored | seed with `sqlcmd -d appdb -i seed.sql` after provisioning |
| Readiness | varies | not ready when `docker run` returns | retry loop with `sqlcmd -C -b -l 2`; provision appdb in the loop |

## Gone: remove or replace

These exist in the SQL Server image but not in the Azure SQL Database engine. Find and
remove or replace every usage.

| Feature | Why it is gone | Replacement |
|---|---|---|
| SQL Server Agent (jobs, schedules) | not part of the Azure SQL Database engine | external scheduler (cron, app-side scheduler) |
| FILESTREAM / FileTable | not supported | store blobs in columns or external object storage |
| Full Service Broker (cross-instance messaging) | not supported | app-level queue or messaging service |
| Cross-server distributed transactions (MS DTC, linked servers) | single-database engine | redesign to single-DB operations or app-coordinated work |
| Windows Auth / NTLM / `Integrated Security=true` | not supported | SA / SQL authentication |
| Cross-database `USE` and three-part cross-DB queries | single-DB model | keep objects in one user database |

## New capabilities

- Native `VECTOR(n)` column type and `VECTOR_DISTANCE('cosine', a, b)` for
  embedding search. Insert with `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))` where `n` is a literal,
  never a bind parameter. `CREATE VECTOR INDEX` (DiskANN) is still in
  development; use a full-scan top-k query for now.
- Behavior matches Azure SQL Database, so local dev catches Azure-specific
  differences before deployment.
