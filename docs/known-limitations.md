---
title: "Known limitations"
description: "Current gaps and rough edges in the Private Preview, with workarounds where they exist."
---

## Table of Contents

- [Development use only](#development-use-only)
- [How to read this page](#how-to-read-this-page)
- [Active issues we are fixing](#active-issues-we-are-fixing)
- [Known behavior gaps](#known-behavior-gaps)
- [Out of scope by design](#out-of-scope-by-design)
- [Where to find live status](#where-to-find-live-status)
- [Related content](#related-content)

## Development use only

The Azure SQL Database container, the Azure SQL Database engine running locally, is for **local development**: development, testing, CI, and demos (the inner loop). It is **not a production database**, and it is not meant to be deployed to Azure or run as a production service. For production, deploy the same code to **Azure SQL Database** in the Microsoft Azure cloud (the outer loop), where backups, high availability, scaling, and security are managed for you. The Private Preview license is scoped to development, testing, CI, and demos.

## How to read this page

This page lists the limitations we know about as of the version date above. Two categories matter:

- **Active issues we are fixing** are blockers we are working on now. If you hit one, the workaround is listed inline and the fix is tracked.
- **Known behavior gaps** are functional differences from Azure SQL Database in the cloud. They may close, or they may not, depending on Private Preview feedback.

If you hit a limitation that is not on this page, please file a [GitHub issue](https://aka.ms/azuresqldb-container-bug) so we can either add it here or fix it.

## Active issues we are fixing

The following issues are the ones we are actively fixing.

### 1. Restriction enforcement gaps

Some PaaS restrictions that are enforced in Azure SQL Database in the cloud are not yet enforced by the container. This means a query that succeeds locally may fail at deployment time against the cloud database.

**Workaround:** Run your queries against an Azure SQL Database instance once before declaring readiness. The [local-to-cloud skill](https://github.com/microsoft/azure-sql-database-container/tree/main/skills/azuresql-db-local-to-cloud) can provision a target database for a one-shot validation pass.

### 2. Default value alignment

Some session-level and database-level defaults (collation, transaction isolation, ANSI defaults) do not match the cloud database defaults exactly. This may cause subtle behavior differences in edge cases.

**Workaround:** Set the defaults explicitly in your connection string or session. The [Getting started](getting-started.md) connection example covers the safe defaults.

### 3. Two-step provisioning

Two-step provisioning is a current limitation: you provision a database on a master connection, then reconnect directly to it. Public preview will let the container set a default startup database (for example `MSSQL_DB=appdb`) so you connect straight into an Azure-faithful session without going through master.

### 4. GUI tooling compatibility (MSSQL extension and SSMS)

Graphical tools are not yet 100% compatible with the container. The [VS Code MSSQL extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql) and SQL Server Management Studio (SSMS) can throw UI errors against it. We are actively working on full compatibility.

**Workaround:** Query with `sqlcmd` (on the host or the copy bundled in the container, via `docker exec`), or with any driver or ORM. These all work today. The MSSQL extension's [GitHub Copilot integration](https://aka.ms/vscode-mssql-copilot-docs) also works now, for example opening the schema designer or writing SQL from natural language.

## Known behavior gaps

The following gaps are functional differences from Azure SQL Database in the cloud that we are aware of. They may or may not close before Public Preview.

- **Vector index restrictions.** `CREATE VECTOR INDEX` (DiskANN) works on the container. We measured it on build `12.0.2000.8`. Four rules apply before the statement succeeds. First, the session needs `SET QUOTED_IDENTIFIER ON`, which is off by default in a `sqlcmd` session. Second, the table needs at least 100 rows with non-null vectors. At 99 rows the engine returns `Msg 42266`. Third, `TRUNCATE TABLE` is refused while the index exists, with `Msg 42232`. To empty the table, drop the index, truncate, reload the rows, and recreate the index. Fourth, a security policy and a vector index cannot share a table, in either order. Adding the policy after the index returns `Msg 37579`. Adding the index after the policy returns `Msg 42244`. That pair is a parity gap, because the two coexist in Azure SQL Database in the cloud, and Microsoft Learn documents neither message number. One further limit belongs to the column, not to the index: a `vector` column tops out at 1998 dimensions, and `vector(1999)` is refused with `Msg 2717`. That ceiling applies in the cloud too.
- **Only one query shape reads the vector index.** `SELECT TOP (N) WITH APPROXIMATE ... FROM VECTOR_SEARCH(...)` uses the index. A `VECTOR_DISTANCE` query is always exact and never uses the index, even when one exists, and Microsoft Learn states the same rule. On a small table both queries return the same rows, and the `VECTOR_DISTANCE` query raises no warning. An application that builds an index and keeps its old query therefore runs a full scan with no signal that anything is wrong.
- **We have measured the vector index at prototype scale only.** Our measurements cover a few hundred rows of low-dimension vectors. Nothing here measures recall or query time on a production corpus at 768 or 1536 dimensions. If you plan to depend on the index, measure it on your own corpus.
- **x64 image only; no native ARM64 build.** The image is x64 (`linux/amd64`). On an ARM64 host (for example an Apple Silicon Mac) it runs under emulation: add `--platform linux/amd64` (see [Step 2: start the container](getting-started.md#step-2-start-the-container)), or `platform: linux/amd64` in compose. Emulation is slower than a native build would be. If you want a native ARM64 build, [file a feature request](https://aka.ms/azuresqldb-container-feature-request): that is how we count demand.
- **Backup and restore.** `BACKUP DATABASE` and `RESTORE DATABASE` are not supported on the container (they return `Msg 40510`). Azure SQL Database in the cloud likewise does not support them, because backups there are managed by the platform. For local data persistence, use a Docker named volume (`-v sqldb-data:/var/opt/mssql`); for managed backups, point-in-time restore, and geo-replication, use Azure SQL Database in the cloud.
- **Always Encrypted with secure enclaves.** Always Encrypted basic functionality works. Secure enclaves require host TEE support and are not validated for the container.
- **Auditing to Log Analytics or Storage.** Audit-to-file works. Audit-to-cloud-targets is not applicable on the container.
- **Resource governance.** The container does not enforce the per-database DTU or vCore caps that exist in Azure SQL Database SKUs.
- **Connection model: two session types.** A connection to a user database is an Azure-faithful session and enforces Azure SQL Database semantics, including `USE` returning Msg 40508. A connection to master is a provisioning session where the Azure statement filter (`USE`, `SHUTDOWN`, `RECONFIGURE`) is NOT enforced, so `USE` works there. (`BACKUP` / `RESTORE` are not supported in either session; they return Msg 40510. Azure SQL Database in the cloud likewise does not support them.) Use master only to `CREATE`/`DROP DATABASE`; do all application work on the user database.
- **Container-only preview.** The image is not published to public registries (MCR / Docker Hub). The shared registry credentials are pull-only and may be rotated during the preview.

## Out of scope by design

These are intentional non-goals for the container:

- **Cloud-only management surfaces.** Azure portal, Azure CLI, ARM, Bicep, and Terraform target the cloud service. They are not applicable to the container.
- **PaaS multi-tenancy controls.** Elastic pools, hyperscale tier, serverless auto-pause, and similar PaaS service-tier features are properties of the cloud service, not the engine.
- **SQL Server behavior.** Features that exist in SQL Server but not in Azure SQL Database (e.g., SQL Agent, FILESTREAM, full Service Broker, Windows Authentication / NTLM, distributed transactions across multiple databases on different servers) are intentionally not present.

## Where to find live status

- **Open issues:** [GitHub Issues](https://github.com/microsoft/azure-sql-database-container/issues)
- **Roadmap discussion:** [GitHub Discussions](https://github.com/microsoft/azure-sql-database-container/discussions)

## Related content

- [What is the Azure SQL Database container](what-is-the-container.md)
- [Get started](getting-started.md)
- [Prerequisites](prerequisites.md)
- [Agent skills](agent-skills.md)
- [Feedback and how to engage](feedback-and-how-to-engage.md)
- [Report a bug](https://aka.ms/azuresqldb-container-bug)
- [Request a feature](https://aka.ms/azuresqldb-container-feature-request)
