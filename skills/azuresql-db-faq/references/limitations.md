# Known limitations (snapshot)

This is a snapshot for offline use. The **live, always-current list is the source of
truth**: https://microsoft.github.io/azure-sql-database-container/known-limitations.html
(repo: `docs/known-limitations.md`). If they disagree, trust the live page and report
the drift. When a user hits something not listed, point them to
https://aka.ms/azuresql-developer-bug to file an issue.

## Active issues being fixed

1. **Restriction enforcement gaps.** Some PaaS restrictions enforced in the cloud are not yet enforced locally, so an invalid statement can succeed locally and fail at deployment. Workaround: validate against a real Azure SQL Database once before declaring readiness.
2. **Default value alignment.** Some session/database defaults (collation, transaction isolation, ANSI defaults) do not match the cloud exactly. Workaround: set the ones you depend on explicitly.
3. **Vector index DDL.** `CREATE VECTOR INDEX` is in development. The `VECTOR` type and `VECTOR_DISTANCE` work; use full-scan top-k for now.
4. **x64 image.** The image is `linux/amd64`; on a non-x64 host add `--platform linux/amd64`.
5. **Two-step provisioning.** Provision a database on a `master` connection, then reconnect to it. Public Preview plans a default startup database (e.g. `MSSQL_DB=appdb`).
6. **GUI tooling compatibility.** The VS Code MSSQL extension UI and SSMS are not yet 100% compatible (UI errors), being fixed. Use `sqlcmd` or a driver; the MSSQL extension's GitHub Copilot integration works (https://aka.ms/vscode-mssql-copilot-docs).

## Known behavior gaps (differences from the cloud)

- **Backup and restore.** `BACKUP DATABASE` / `RESTORE DATABASE` are not supported on the container (return `Msg 40510` in any session). Azure SQL Database in the cloud likewise does not support them. Use a Docker named volume for local persistence; use Azure SQL Database in the cloud for managed backups, point-in-time restore, and geo-replication.
- **Always Encrypted with secure enclaves.** Basic Always Encrypted works; secure enclaves need host TEE support and are not validated.
- **Auditing to Log Analytics or Storage.** Audit-to-file works; audit-to-cloud-targets is not applicable on the container.
- **Resource governance.** No per-database DTU or vCore caps (those are cloud SKU properties).
- **Connection model: two session types.** A user-database connection is an SDS (Azure-faithful) session that enforces Azure semantics (`USE` -> Msg 40508). A `master` connection is a non-SDS provisioning session where `USE` works (the filter is not enforced). `BACKUP`/`RESTORE` are not supported in either session (Msg 40510). Use `master` only to `CREATE`/`DROP DATABASE`; do app work on the user database.
- **Container-only preview.** The image is not on public registries (MCR / Docker Hub); shared pull-only credentials may rotate.

## Out of scope by design

- **Cloud-only management surfaces** (Azure portal, CLI, ARM, Bicep, Terraform) target the cloud service, not the container.
- **PaaS multi-tenancy controls** (elastic pools, hyperscale, serverless auto-pause) are cloud service-tier features, not engine features.
- **SQL Server behavior** not in Azure SQL Database (SQL Agent, FILESTREAM, full Service Broker, Windows Authentication / NTLM, cross-server distributed transactions) is intentionally absent.
