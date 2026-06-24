---
title: "Known limitations"
description: "Current gaps and rough edges in the Private Preview, with workarounds where they exist."
---

## Table of Contents

- [How to read this page](#how-to-read-this-page)
- [Active issues we are fixing](#active-issues-we-are-fixing)
- [Known behavior gaps](#known-behavior-gaps)
- [Out of scope by design](#out-of-scope-by-design)
- [Where to find live status](#where-to-find-live-status)

## How to read this page

This page lists the limitations we know about as of the version date above. Two categories matter:

- **Active issues we are fixing** are blockers we are working on now. If you hit one, the workaround is listed inline and the fix is tracked.
- **Known behavior gaps** are functional differences from Azure SQL Database in the cloud. They may close, or they may not, depending on Private Preview feedback.

If you hit a limitation that is not on this page, please file a [GitHub issue](https://github.com/microsoft/azure-sql-database-container/issues/new?template=bug_report.yml) so we can either add it here or fix it.

## Active issues we are fixing

The following four issues are the ones we are actively fixing.

### 1. Restriction enforcement gaps

Some PaaS restrictions that are enforced in Azure SQL Database in the cloud are not yet enforced by the container. This means a query that succeeds locally may fail at deployment time against the cloud database.

**Workaround:** Run your queries against an Azure SQL Database instance once before declaring readiness. The [Azure skills collection](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/azure-skills/) provisions a target database you can use for a one-shot validation pass.

### 2. Default value alignment

Some session-level and database-level defaults (collation, transaction isolation, ANSI defaults) do not match the cloud database defaults exactly. This may cause subtle behavior differences in edge cases.

**Workaround:** Set the defaults explicitly in your connection string or session. The [Getting Started](getting-started.md) connection example covers the safe defaults.

### 3. Vector index DDL

`CREATE VECTOR INDEX` syntax is in active development. Vector data types and `VECTOR_DISTANCE` work today; the vector index DDL surface is incomplete and may change before Public Preview.

**Workaround:** For Private Preview prototypes, run vector search without an index (full scan). This is fine for the corpus sizes typical of a prototype. For larger corpora, file a feature request and we will prioritize.

### 4. Apple Silicon and arm64: run under emulation

The image is x64 (`linux/amd64`). It runs natively on x64 hosts: Linux, Windows (Docker Desktop or WSL2), and Intel Macs.

- **Apple Silicon and arm64 Linux run under emulation.** There is no native arm64 image. On an arm64 host, run the x64 image under emulation by passing `--platform linux/amd64`. The engine, T-SQL, and `VECTOR_DISTANCE` similarity search all work this way; expect some overhead compared with a native x64 host.
- **Windows on ARM is not supported.** Use an x64 Windows host, or macOS or Linux on arm64 under emulation.

**Tip:** On Apple Silicon, enable "Use Rosetta for x86/amd64 emulation" in Docker Desktop (Settings, General) for a large speedup over the default emulator. For the smoothest experience with heavier workloads, use a native x64 host.

## Known behavior gaps

The following gaps are functional differences from Azure SQL Database in the cloud that we are aware of. They may or may not close before Public Preview.

- **Backup and restore.** The container supports `BACKUP DATABASE` and `RESTORE DATABASE` for local files. Long-term backup, geo-replication, and point-in-time restore are not in scope for the container.
- **Always Encrypted with secure enclaves.** Always Encrypted basic functionality works. Secure enclaves require host TEE support and are not validated for the container.
- **Auditing to Log Analytics or Storage.** Audit-to-file works. Audit-to-cloud-targets is not applicable on the container.
- **Resource governance.** The container does not enforce the per-database DTU or vCore caps that exist in Azure SQL Database SKUs.

## Out of scope by design

These are intentional non-goals for the container:

- **Cloud-only management surfaces.** Azure portal, Azure CLI, ARM, Bicep, and Terraform target the cloud service. They are not applicable to the container.
- **PaaS multi-tenancy controls.** Elastic pools, hyperscale tier, serverless auto-pause, and similar PaaS service-tier features are properties of the cloud service, not the engine.
- **SQL Server box-product behavior.** Features that exist in SQL Server but not in Azure SQL Database (e.g., SQL Agent, FILESTREAM, full Service Broker, distributed transactions across multiple databases on different servers) are intentionally not present.

## Where to find live status

- **Open issues:** [GitHub Issues](https://github.com/microsoft/azure-sql-database-container/issues)
- **Roadmap discussion:** [GitHub Discussions](https://github.com/microsoft/azure-sql-database-container/discussions)
