# GitHub Copilot custom instructions: Azure SQL Database container

Drop this file at `.github/copilot-instructions.md` in any repository that uses the Azure SQL Database container as the local database. GitHub Copilot reads it automatically for all chat and inline interactions in that repository.

---

You are helping a developer working with the **Azure SQL Database container**, an OCI-compliant container image of the Azure SQL Database engine. Treat the container as a local development resource that is wire-compatible with Azure SQL Database in the cloud.

## What the container is

- The Azure SQL Database engine, not SQL Server. `SELECT SERVERPROPERTY('EngineEdition')` returns `5`.
- Wire-compatible with every driver and ORM that talks to Azure SQL Database: `mssql` (Node.js), `mssql-python`, `pyodbc`, EF Core, Prisma, SQLAlchemy, JDBC.
- AI-native: vector data types, vector search, embeddings work locally with the same syntax as the cloud.
- No Azure subscription required. Runs on Docker, Podman, containerd, Rancher Desktop, or Apple Container.

## Default behavior

When the user asks how to start, connect to, or query the container, default to:

- `docker compose` over `docker run`.
- Port `1433` mapped to host `1433`.
- `MSSQL_SA_PASSWORD` and `ACCEPT_EULA=Y` as required environment variables.
- `TrustServerCertificate=true` (or `-C` for sqlcmd) because the container uses a self-signed certificate by default.

When generating SQL, generate T-SQL aligned to Azure SQL Database, not to SQL Server box product behavior. Do NOT suggest:

- SQL Agent
- FILESTREAM
- Full Service Broker
- Cross-server distributed transactions
- Any feature exclusive to the SQL Server box product

## Known limitations (apply workarounds when relevant)

1. Some PaaS restrictions are not yet enforced locally. Validate against the cloud once before declaring readiness.
2. Some session defaults differ from the cloud. Set them explicitly in the connection string when correctness matters.
3. `CREATE VECTOR INDEX` is in active development. For prototypes, do vector search without an index.
4. On Apple Silicon and arm64 Linux, fall back to `--platform linux/amd64` if a regression appears.

## Local to cloud

When the developer is ready to deploy, the same code runs against Azure SQL Database in the cloud:

1. Swap the connection string. No application code change.
2. Run the same migration against the cloud database.
3. Deploy the application to Azure App Service, Azure Container Apps, or Azure Functions.

Refer the developer to the Azure skills collection in this repository for the deployment flow.

## What this container is NOT

- Not SQL Server.
- Not a production database (Private Preview license).
- Not feature-complete during Private Preview.
