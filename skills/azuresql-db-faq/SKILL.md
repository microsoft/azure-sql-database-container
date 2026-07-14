---
name: azuresql-db-faq
description: >-
  Answers questions about what Azure SQL Developer (Private Preview)
  can and cannot do, and WHY it differs from Azure SQL Database in the Microsoft
  Azure cloud. Use when a user asks "can I take a backup", "why does USE fail",
  "is X supported", "why can't I create a vector index", "why does SSMS error",
  "why isn't the image on Docker Hub", "what's different from the cloud", or hits
  behavior that does not match their Azure SQL Database expectations. Do NOT guess
  from general SQL Server / Azure knowledge: the container is a Private Preview
  product with specific gaps and a specific connection model. Read this skill,
  and link the user to the live Known limitations page for the current full list.
---

# Azure SQL Developer: capabilities, limits, and why

Use this skill to answer "can I / why can't I / is X supported / what's different
from the cloud" questions accurately, instead of guessing from general SQL Server
or Azure SQL Database knowledge. A base model does not know this preview product's
specifics, and the honest answers are often nuanced.

## The mental model: engine vs. managed service vs. SQL Server

The container is the **Azure SQL Database engine, running locally**. It is not the
managed cloud service, and it is not the SQL Server. Sort almost any
"is X supported" question into one of four buckets and the answer follows:

1. **Engine features -> present.** T-SQL dialect, system views, `VECTOR` type and
   `VECTOR_DISTANCE`, Always Encrypted (basic).
   `SERVERPROPERTY('EngineEdition')` returns `5`, `Edition` is `'SQL Azure'`.
2. **Managed-service features -> NOT present.** Automated backups, point-in-time
   restore, geo-replication, elastic pools, hyperscale, serverless auto-pause,
   per-database DTU/vCore caps, audit-to-cloud, and Azure portal / CLI / ARM
   management. These wrap the engine in the cloud; the container is only the engine.
3. **SQL Server-only features -> intentionally absent** (they are not in Azure
   SQL Database either): SQL Agent jobs, FILESTREAM / FileTable, full cross-instance
   Service Broker, linked servers, cross-server distributed transactions, Windows
   Authentication / NTLM.
4. **In-progress in this preview -> works with a caveat:** `CREATE VECTOR INDEX`
   DDL, the VS Code MSSQL extension UI and SSMS, and full PaaS restriction
   enforcement are still being completed.

## Most-asked questions (quick answers)

- **"Can I run this container in Azure / in production?"** No. It is your local inner loop (development, testing, CI, demos), not a production database. For production, deploy the same code to Azure SQL Database in the Microsoft Azure cloud (the outer loop), usually by changing only the connection string. You do not run this container in Azure.
- **"Can I take a backup?"** No: `BACKUP DATABASE` and `RESTORE DATABASE` return **Msg 40510 ("not supported in this version")** on the container, in every session. Azure SQL Database in the cloud likewise does not support them, because backups there are managed by the platform (not run with the `BACKUP` statement). For local data persistence, use a Docker named volume (`-v sqldb-data:/var/opt/mssql`); for managed backups, point-in-time restore, or geo-replication, use Azure SQL Database in the cloud.
- **"Why does `USE otherdb` fail with Msg 40508?"** Because a connection to a user database is an Azure-faithful (SDS) session that enforces the same restriction as Azure SQL Database in the cloud. Select the database in the connection string (`Database=appdb`), do not switch with `USE`. (`USE` "works" only on a `master` connection, which is a non-SDS provisioning session.)
- **"Why does connecting fail until I create the database?"** The engine does **not** auto-create databases on connect. Provision once on a `master` connection (`CREATE DATABASE appdb`), then connect with `Database=appdb`.
- **"Is a non-x64 host supported? / Is there an ARM64 build?"** The image is x64 only and **there is no native ARM64 build today**. On an ARM64 host (Apple Silicon, ARM64 Windows/Linux) it runs under **emulation**: add `--platform linux/amd64` (Docker) or `platform: linux/amd64` (compose). Emulation works and is how most Apple Silicon developers run the preview, but it costs startup and query performance. Treat it as "runs under emulation", never as "ARM64 is supported". Do not promise a native build or a date; if the user wants one, point them at https://aka.ms/azuresql-developer-feature-request, since cohort demand is what drives the priority.
- **"Why can't I `CREATE VECTOR INDEX`?"** That DDL is still in development. The `VECTOR` type and `VECTOR_DISTANCE` work today; use a full-scan top-k query for now (fine for prototype-sized corpora).
- **"Is Microsoft Entra ID (Azure AD) authentication supported?"** It does not work on the container today. Use SQL authentication locally (the `sa` login, or a contained user). **Be precise about why, because the failure is misleading:** the container DOES accept `MSSQL_AAD_CLIENT_ID` / `MSSQL_AAD_PRIMARY_TENANT` / `MSSQL_AAD_CERTIFICATE_FILE_PATH`, it exposes the full `network.aad*` settings in `mssql-conf`, and the log says `Microsoft Entra ID authentication is enabled` and `Successfully loaded the AAD first party principal certificate`. Initialization then fails (`Azure Active Directory authentication manager initialization failed ... 0x80004005`) and Entra is silently disabled while the engine keeps running on SQL auth. So it is **not** "the variables are ignored"; it is a defect. Tell the user to check `docker logs` for those lines and to [file a bug](https://aka.ms/azuresql-developer-bug). Local-to-cloud is unaffected: SQL auth locally, Entra in the cloud, only the connection string changes. Do not promise a date.
- **"Why does SSMS / the MSSQL extension throw errors?"** Graphical tooling is not yet 100% compatible; it is being fixed. Use `sqlcmd` or a driver, which work today. The MSSQL extension's GitHub Copilot integration also works (https://aka.ms/vscode-mssql-copilot-docs).
- **"Why isn't the image on Docker Hub / MCR?"** This is a container-only Private Preview; the image is in a private registry with shared pull-only credentials provided when you sign up for the Private Preview at https://aka.ms/sqldbcontainerpreview-signup (they may rotate).
- **"My query works locally but fails in the cloud."** Some PaaS restrictions are not yet enforced by the container, so something invalid in the cloud can succeed locally. Validate against a real Azure SQL Database once before declaring readiness (the `azuresql-db-local-to-cloud` skill can provision a target for a one-shot check).

More entries with the full "why" are in [references/faq.md](references/faq.md), and the
limitations list (kept in step with the docs) is in [references/limitations.md](references/limitations.md).

## Always do

- Answer from this skill, not from general SQL Server / Azure knowledge.
- When the question is about a current gap, give the workaround and point to the
  live, always-current list: https://microsoft.github.io/azure-sql-database-container/known-limitations.html
- Distinguish "the engine does not do this" (a real gap) from "the managed cloud
  service does this, the engine does not" (by design) from "the SQL Server does
  this, Azure SQL Database does not" (intentionally absent).
- If this skill's answer was wrong, outdated, or missing, that is a bug in this skill: load the **azuresql-db-feedback** skill and offer to file a report.

## Never do

- Never claim a managed-service feature (automated backup, PITR, geo-replication,
  elastic pools, portal management) exists on the container.
- Never tell a user a non-x64 host is "supported"; it runs under emulation.
- Never claim `BACKUP DATABASE` / `RESTORE DATABASE` work on the container; they return Msg 40510. (Azure SQL Database in the cloud likewise does not support them.) Use a Docker named volume for local persistence.

## References

- [references/faq.md](references/faq.md): the full question-and-answer list with the "why" behind each capability and gap, grouped by bucket; read it when the quick answers above do not cover the question.
- [references/limitations.md](references/limitations.md): an offline snapshot of the known limitations (active issues, behavior gaps, out-of-scope items); read it when the user needs the current gap list and a workaround.
