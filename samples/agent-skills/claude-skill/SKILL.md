---
name: azure-sql-database-container
description: Use this skill any time the user wants to start, stop, connect to, query, troubleshoot, or deploy applications against the Azure SQL Database container. Triggers include the user asking how to run SQL Database locally, how to scaffold an application against a local SQL database, how to write a docker-compose file for SQL Database, how to connect from a driver or ORM (Prisma, SQLAlchemy, EF Core, Aspire), how to switch from the local container to Azure SQL Database in the cloud, or how to fix container startup or connection errors. Use even when the user does not name the container explicitly, as long as the task involves a local Azure SQL Database engine.
---

# Azure SQL Database container skill

You are helping a developer work with the Azure SQL Database container, an OCI-compliant container image of the Azure SQL Database engine. This skill teaches you everything you need to provision, connect, query, and deploy.

## What the container is, in one sentence

The Azure SQL Database container is the Azure SQL Database engine packaged for local development. It is NOT SQL Server in a box; `SELECT SERVERPROPERTY('EngineEdition')` returns `5`, the same value Azure SQL Database returns in production.

## Prerequisites

Confirm before running any container command:

1. A supported container runtime is installed and running. Tested runtimes: Docker Desktop 4.30 or later, Podman 5.0 or later, Rancher Desktop 1.13 or later, containerd, Apple Container.
2. Port `1433` is available on the host. If it is in use, remap the host port in the `docker-compose.yml` or `docker run` command.
3. The user has at least 2 CPU cores, 4 GB of memory, and 10 GB of free disk available to the runtime VM.

On Apple Silicon: the container runs natively on arm64. If a regression appears, fall back to `--platform linux/amd64` to run under Rosetta.

## Required parameters

When starting the container, the following are required:

| Parameter            | Required | Notes                                                          |
| -------------------- | -------- | -------------------------------------------------------------- |
| `MSSQL_SA_PASSWORD`  | Yes      | Must meet complexity: 8+ chars, mix of upper/lower/digit/symbol |
| `ACCEPT_EULA`        | Yes      | Must be `Y`                                                    |
| Port mapping `1433`  | Yes      | Map host to container `1433`                                   |
| Volume for `/var/opt/mssql` | Recommended | Persists data across container recreates                |

## Canonical start command

Prefer `docker compose` over `docker run` because it is reproducible and survives a machine reboot.

```yaml
# docker-compose.yml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
    container_name: sqldb
    ports:
      - "1433:1433"
    environment:
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
      ACCEPT_EULA: "Y"
    volumes:
      - sqldb-data:/var/opt/mssql

volumes:
  sqldb-data:
```

Start: `docker compose up -d`. Verify: `docker ps --filter "name=sqldb"`.

## Connecting

| Tool                              | Connection string / command                                            |
| --------------------------------- | ---------------------------------------------------------------------- |
| `sqlcmd`                          | `sqlcmd -S localhost,1433 -U sa -P "<password>" -C`                    |
| VS Code MSSQL extension           | Server `localhost,1433`, user `sa`, trust server certificate           |
| Node.js (`mssql`)                 | `Server=localhost,1433;User Id=sa;Password=...;TrustServerCertificate=true;` |
| Python (`mssql-python`, `pyodbc`) | Same shape; `TrustServerCertificate=yes`                               |
| .NET (EF Core, Aspire)            | Aspire: `AddAzureSqlDatabase("sqldb").RunAsContainer()`                |
| Prisma                            | `sqlserver://localhost:1433;database=...;user=sa;password=...;trustServerCertificate=true` |
| SQLAlchemy                        | URL with `+pyodbc` or `+pymssql`; same connection params               |
| JDBC                              | `jdbc:sqlserver://localhost:1433;user=sa;password=...;trustServerCertificate=true` |

The container uses a self-signed certificate by default; every connection must trust it.

## Known limitations (apply workarounds automatically)

1. **Restriction enforcement gaps.** Some PaaS restrictions are not yet enforced. Always run the query against the cloud once before declaring readiness.
2. **Default value alignment.** Some session-level defaults differ from the cloud. Set them explicitly in the connection string.
3. **Vector index DDL.** `CREATE VECTOR INDEX` is in active development. For prototypes, do vector search without an index (full scan); fine for corpora under a few thousand documents.
4. **arm64 layer.** If a regression appears on Apple Silicon or arm64 Linux, fall back to `--platform linux/amd64`.

## Common errors

| Symptom                                        | Cause                                  | Fix                                                              |
| ---------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| Container exits immediately                    | Password does not meet complexity      | Strengthen `MSSQL_SA_PASSWORD`, recreate container               |
| Connection refused on `localhost:1433`         | Port already in use                    | Remap host port, or stop the conflicting process                 |
| TLS / certificate validation error             | Driver does not trust self-signed cert | Set `TrustServerCertificate=true` or `-C` flag                   |
| Slow startup on Apple Silicon                  | arm64 layer regression                 | Run under Rosetta: `--platform linux/amd64`                      |
| `BACKUP DATABASE` to a path fails              | Path not in `/var/opt/mssql/data`      | Backup to the data volume; copy out of the volume after          |

## Local to cloud handoff

When the user is ready to deploy:

1. Hand off to the Azure skills collection at `samples/azure-skills/`. It provisions an Azure SQL Database server and database with matching collation and tier.
2. Swap the connection string to the cloud endpoint. Do NOT change the application code. The container and the cloud database are wire-compatible.
3. Run the same migration (`prisma migrate deploy`, `alembic upgrade head`, `dotnet ef database update`, or equivalent) against the cloud database.
4. Deploy the application to the target cloud compute: Azure App Service, Azure Container Apps, or Azure Functions.

The local-to-cloud handoff is the most important property of this container. If you change application code between the inner loop and the outer loop, the user has hit a bug worth filing.

## What this container is NOT

- It is not SQL Server. Do not suggest features that exist in SQL Server but not in Azure SQL Database (e.g., SQL Agent, FILESTREAM, full Service Broker, cross-server distributed transactions).
- It is not a production database. The license is a Private Preview license scoped to development, testing, CI, and demos.
- It is not feature-complete during Private Preview. Vector index DDL and some restriction enforcement are still landing.
