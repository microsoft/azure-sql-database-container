# FAQ: capabilities and limits, with the why

## Contents

- [Development vs production](#development-vs-production)
- [Backups and recovery](#backups-and-recovery)
- [Connection model and databases](#connection-model-and-databases)
- [Vectors / AI](#vectors--ai)
- [Platform / image / access](#platform--image--access)
- [Tooling](#tooling)
- [Parity with the cloud](#parity-with-the-cloud)
- [Box-product features (intentionally absent, like the cloud)](#box-product-features-intentionally-absent-like-the-cloud)
- [Managed-service surfaces (not applicable to a container)](#managed-service-surfaces-not-applicable-to-a-container)

Grouped by the four buckets from `SKILL.md`. When a question is not here, fall back
to the bucket model and the live Known limitations page:
https://microsoft.github.io/azure-sql-database-container/known-limitations.html

## Development vs production

**Can I run this container in Azure, or use it as my production database?** No. The container is
for **local development** (your inner loop): development, testing, CI, and demos. It is not a
production database and is not meant to be deployed to Azure or run as a production service. For
production, deploy the same application code to **Azure SQL Database** in the Microsoft Azure cloud
(the outer loop), typically by changing only the connection string; the cloud service provides
managed backups, high availability, scaling, and security. You connect your app to Azure SQL
Database in the cloud; you do not run this container there.

## Backups and recovery

**Can I back up a database?** No. On the container, `BACKUP DATABASE` and
`RESTORE DATABASE` return `Msg 40510` ("not supported in this version of SQL Server")
in every session (verified live: the statement errors from both a `master` and a
user-database connection). Azure SQL Database in the cloud likewise does not support
these statements, because backups there are a managed platform service, not something
you run with `BACKUP`.

**Then how do I keep my data, or recover it?** For local persistence across container
restarts, mount a Docker named volume: `-v sqldb-data:/var/opt/mssql`. To move a
schema and data around, use SqlPackage (`.dacpac`/`.bacpac`) or migration scripts, not
`BACKUP`. For real managed backups, point-in-time restore, and geo-replication, use
Azure SQL Database in the cloud, where the platform provides them.

## Connection model and databases

**Why does `USE otherdb` return Msg 40508?** A connection to a user database is an
SDS (Azure-faithful) session and enforces Azure SQL Database semantics, where `USE`
is not allowed. Select the database in the connection string (`Database=appdb` or
`-d appdb` for sqlcmd). `USE` appears to work only on a `master` connection, which is
a non-SDS provisioning session, but `master` is for provisioning, not application work.

**Why do I have to create the database first?** The engine does not auto-create a
database on connect, and it does not run `/docker-entrypoint-initdb.d/*.sql` (that is
a Postgres/MySQL convention). Provision once on `master` with `CREATE DATABASE appdb`
inside the ready-wait loop, then connect with `Database=appdb`. (`appdb` is an example
name; use whatever you like.)

**Why is there a two-step "provision on master, then reconnect" dance?** It is a
current limitation. Public Preview plans a default startup database (for example
`MSSQL_DB=appdb`) so you connect straight into an SDS session without going through master.

## Vectors / AI

**Why can't I `CREATE VECTOR INDEX`?** The vector index DDL is still in development.
The `VECTOR(n)` type and `VECTOR_DISTANCE('cosine', ...)` work today; run a full-scan
top-k query for now, which is fine for prototype-sized corpora.

**Why does my embedding insert fail with "ntext to vector is not allowed (529)"?**
A long JSON embedding bound as a parameter is sent as ntext. Cast it to NVARCHAR(MAX)
first: `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))`, with `n` a literal dimension.
(529 is the error number; the dimension, e.g. 768, is unrelated.)

## Platform / image / access

**Is a non-x64 host supported?** The image is x64 only (`linux/amd64`). On a
non-x64 host it runs under emulation when you add `--platform linux/amd64` (Docker) or
`platform: linux/amd64` (compose). Treat that as "runs under emulation", not "supported".

**Why isn't the image on Docker Hub or MCR?** This is a container-only Private Preview.
The image is in a private registry; the shared, pull-only username and password are
provided when you sign up for the Private Preview at https://aka.ms/sqldbcontainerpreview-signup
and may be rotated during the preview.

## Tooling

**Why does SSMS or the VS Code MSSQL extension UI throw errors?** Graphical tooling is
not yet 100% compatible with the container and is being fixed. Use `sqlcmd` (host, or
the copy bundled in the container via `docker exec`, no install) or any driver/ORM,
which work today. The MSSQL extension's GitHub Copilot integration also works (for
example the schema designer or natural-language SQL): https://aka.ms/vscode-mssql-copilot-docs.

## Parity with the cloud

**Is Microsoft Entra ID (Azure AD) authentication supported?** No, not on the container
today. Use SQL authentication locally: the `sa` login, or a contained user you create.
This is the one place people expect parity and do not get it, because the SQL Server
image (`mcr.microsoft.com/mssql/server`) *does* support Entra through the
`MSSQL_AAD_CLIENT_ID`, `MSSQL_AAD_PRIMARY_TENANT`, and `MSSQL_AAD_CERTIFICATE_FILE_PATH`
environment variables. **Those variables have no effect on this image**, and setting them
will not enable Entra authentication; the container log will show the login failing.

It does not break the local-to-cloud story. Azure SQL Database in the cloud supports
Entra, so the intended pattern is SQL auth locally and Entra in the cloud, with only the
connection string changing (see the `azuresql-db-local-to-cloud` skill). Do not promise a
date for local Entra support: say it is not supported today and point at the live Known
limitations page.

**My query works locally but fails when I deploy to Azure SQL Database.** Some PaaS
restrictions enforced in the cloud are not yet enforced by the container, so an
invalid statement can succeed locally. Validate against a real Azure SQL Database
once before declaring readiness; the `azuresql-db-local-to-cloud` skill can provision
a target database for a one-shot validation pass.

**Are session/database defaults identical to the cloud?** Mostly. Some defaults
(collation, transaction isolation, ANSI settings) do not match the cloud exactly and
can cause subtle edge-case differences. Set the ones you depend on explicitly.

## Box-product features (intentionally absent, like the cloud)

**Why are SQL Agent jobs / FILESTREAM / linked servers / Windows Authentication /
cross-server distributed transactions missing?** These exist in SQL Server but not in Azure SQL Database, so they are intentionally absent here too.
Removing a dependency on them is part of being cloud-ready. Use the `sa` login locally
and Microsoft Entra in the cloud instead of Windows Authentication.

## Managed-service surfaces (not applicable to a container)

**Why can't I manage it from the Azure portal / az CLI / ARM / Bicep / Terraform?**
Those target the cloud service, not a local container. **Why no elastic pools,
hyperscale, serverless auto-pause, or DTU/vCore limits?** Those are properties of the
cloud service tiers, not the engine, so the container does not have them (and does not
throttle on them). **Auditing:** audit-to-file works; audit to Log Analytics or Storage
is a cloud target and is not applicable locally. **Always Encrypted:** basic
functionality works; secure enclaves require host TEE support and are not validated here.
