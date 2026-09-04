# PaaS parity checklist

This container is the Azure SQL Database engine (EngineEdition 5), not SQL
Server. Some SQL Server features are intentionally absent because
they are not part of the PaaS surface. Validate features against the cloud
before declaring readiness.

## Not present (vs SQL Server)

- **SQL Server Agent**: no Agent jobs/schedules. Use an external scheduler.
- **FILESTREAM / FileTable**: not available.
- **Full Service Broker**: not the full SQL Server Service Broker surface; do
  not assume cross-instance broker messaging.
- **Cross-server DTC / distributed transactions**: no cross-server MSDTC.
- **Windows Authentication / NTLM**: not available; use SQL authentication
  (`sa` or a SQL login) with the standardized connection string.
- **Cross-database `USE`**: avoid `USE` to switch databases. In a user-database
  session (the Azure-faithful context where you develop), `USE` returns
  `Msg 40508`, exactly as in Azure SQL Database in the cloud. A `master`
  connection is a provisioning session where the Azure statement filter
  is not enforced, so `USE` appears to work there, but
  `master` is for provisioning only, not application work. Always select the
  target database in the connection string (`Database=appdb`, or `-d appdb` for
  sqlcmd). See `connection-model.md`.

## Vectors: present, and the index works

- `VECTOR(n)` column type and `VECTOR_DISTANCE('cosine', a, b)` are available.
- Insert with `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))` where **n is a
  literal dimension, never a bind parameter**. A parameterized dimension fails
  with "Incorrect syntax near '@P3'". The inner `CAST(? AS NVARCHAR(MAX))` keeps
  a real embedding's JSON (which exceeds the driver's 4000-char threshold) from
  being sent as ntext, which the engine rejects (error 529).
- `CREATE VECTOR INDEX` (DiskANN) **works on this image**, measured, and the
  Known limitations page has not caught up. It needs `SET QUOTED_IDENTIFIER ON`
  in the session running the DDL (`Msg 1934` without it, and that message never
  names the setting) and at least 100 rows with non-null vectors (`Msg 42266`
  below that). Once it exists, `TRUNCATE TABLE` on that table is refused
  (`Msg 42232`).
- Full-scan top-k with `ORDER BY VECTOR_DISTANCE(...)` stays exact and stays the
  right choice for a small table. Reach for the index once a full scan hurts.

See the `azuresql-db-rag` task skill for full patterns.

## Current preview limitations

- **`master` is a provisioning session**: the Azure SQL statement filter (`USE`,
  `SHUTDOWN`, `RECONFIGURE`) is not enforced there, so `USE` works. (`BACKUP` and
  `RESTORE` are not supported in any session and return `Msg 40510`; Azure SQL
  Database in the cloud likewise does not support them.) Never develop or validate
  against `master`; use it only to
  `CREATE`/`DROP DATABASE`, then connect directly to the user database,
  which enforces Azure SQL Database semantics.
- **Two-step provisioning flow**: provisioning via `master`, then reconnecting to
  the user database, is a current preview limitation. Public preview will let the
  container set a default startup database (for example `MSSQL_DB=appdb`) so you
  connect straight into an Azure-faithful session without going through
  `master`.
- **Container-only preview**: the image is not published to public registries
  (MCR / Docker Hub); the shared registry credentials are pull-only and may be
  rotated.

## How to validate parity

Because this is the same engine family as the cloud, treat the cloud as the
source of truth:

1. Confirm identity locally: `SELECT SERVERPROPERTY('EngineEdition')` returns
   `5` and `SERVERPROPERTY('Edition')` returns `'SQL Azure'`.
2. For any feature you depend on (Agent-like scheduling, broker, distributed
   transactions, auth mode), confirm it exists in Azure SQL Database before
   building on it. If it is in the "not present" list above, design around it.
3. For features still in development (GUI tooling, full PaaS restriction
   enforcement), use the documented interim approach and re-check before
   declaring production readiness. Where a published limitation and the engine
   disagree, as they do for vector index DDL, say so and give the measured
   behavior rather than picking one silently.

## Do not

- Do not assume SQL Server features (Agent, FILESTREAM, full Service Broker,
  cross-server DTC, Windows Auth) are available.
- Do not declare readiness without validating the feature against Azure SQL
  Database in the cloud.
- Do not pass the `VECTOR` dimension as a bind parameter.
- Do not run `CREATE VECTOR INDEX` without `SET QUOTED_IDENTIFIER ON`, and do not
  build it on fewer than 100 rows with non-null vectors.
- Do not put a security policy and a vector index on the same table here; the
  container refuses both orders (`Msg 37579` and `Msg 42244`) while Azure SQL
  Database in the cloud allows them. This is a parity gap.
