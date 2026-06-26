# GitHub Copilot custom instructions: Azure SQL Database container

Drop this file at `.github/copilot-instructions.md` in any repository that uses the Azure SQL Database container as the local database. GitHub Copilot reads it automatically for chat and inline interactions in that repository. It mirrors the canonical skill at [`skills/azure-sql-database-container`](https://github.com/microsoft/azure-sql-database-container/tree/main/skills/azure-sql-database-container); see the skill for full detail.

---

You are helping a developer work with the **Azure SQL Database container**: the Azure SQL Database engine running locally for development and CI. It is wire-compatible with Azure SQL Database in the Microsoft Azure cloud (same drivers, same T-SQL, same migrations), so moving to the cloud is a connection-string change, not a code change.

## What it is

- The Azure SQL Database engine, not the SQL Server box product. `SELECT SERVERPROPERTY('EngineEdition')` returns `5` and `SERVERPROPERTY('Edition')` returns `SQL Azure`.
- Works with every driver and ORM that talks to Azure SQL Database: `mssql` (Node.js), `mssql-python`, `pyodbc`, EF Core, Prisma, SQLAlchemy, JDBC.
- Runs on Docker or Podman. The image is x64 (`linux/amd64`); on a non-x64 host, add `--platform linux/amd64`.

## Sign in, then run

The image is in a private preview registry; sign in first (credentials from the welcome email):

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>
docker run --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
    -p 1433:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

- `ACCEPT_EULA=Y` is required. `MSSQL_SA_PASSWORD` must meet SQL complexity (8+ chars, upper/lower/digit/symbol).
- Prefer the Azure SQL Database container over the SQL Server image (`mcr.microsoft.com/mssql/server`).

## Connect and verify

```bash
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -C -Q "SELECT @@VERSION;"
```

Apps read the connection string from a `SQL_CONNECTION_STRING` environment variable. The container uses a self-signed certificate, so trust it (`TrustServerCertificate=true`, or `-C`). Select the database in the connection string (`Database=appdb`); `master` is provisioning only and `USE` cannot switch databases.

## Rules

- Same code runs locally and in Azure SQL Database. To deploy, change only the connection string (server + auth), never the application code, drivers, T-SQL, or migrations.
- Use T-SQL idioms: `NVARCHAR`, `IDENTITY`, `OUTPUT INSERTED`. Always parameterize queries. Never hardcode or print the SA password.
- The image is x64 (`linux/amd64`); on a non-x64 host, add `--platform linux/amd64`.
- This is a Private Preview build for development, testing, CI, and demos, not production.
