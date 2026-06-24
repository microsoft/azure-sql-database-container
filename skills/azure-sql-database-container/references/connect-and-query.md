# Connecting and querying

The container uses a self-signed certificate, so every connection must trust the server certificate (`-C` for sqlcmd, `TrustServerCertificate=true`/`yes` in connection strings).

## sqlcmd from the host

```bash
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -C -Q "SELECT @@VERSION;"
```

Confirm the engine identity (this is the Azure SQL Database engine, not SQL Server box):

```bash
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -C -h-1 \
    -Q "SET NOCOUNT ON; SELECT SERVERPROPERTY('EngineEdition') AS EngineEdition, SERVERPROPERTY('Edition') AS Edition;"
```

Expected: `EngineEdition = 5`, `Edition = SQL Azure`.

## sqlcmd bundled in the container (no host install)

The image ships `sqlcmd` at `/opt/mssql-tools18/bin/sqlcmd`:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "YourStrong!Passw0rd" -C -Q "SELECT @@VERSION;"

# Apple Containers
container exec sqldb /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "YourStrong!Passw0rd" -C -Q "SELECT @@VERSION;"
```

## VS Code MSSQL extension

Install the MSSQL extension, **Add Connection**, then: server `localhost,1433`, authentication SQL Login, user `sa`, the password you set, leave Database blank for the default, **Trust server certificate: Yes**. Use the extension's inline Copilot assistance to write SQL from natural language.

## Drivers and ORMs

Every driver and ORM that talks to Azure SQL Database talks to the container unchanged. Use `localhost,1433`, user `sa`, and trust the certificate. Select the target database in the connection string (see `connection-model.md`).

| Stack | Connection |
| --- | --- |
| Node.js (`mssql`) | `Server=localhost,1433;Database=appdb;User Id=sa;Password=...;TrustServerCertificate=true` |
| Python (`mssql-python`, `pyodbc`) | `Server=localhost,1433;Database=appdb;Uid=sa;Pwd=...;TrustServerCertificate=yes` |
| Prisma | `sqlserver://localhost:1433;database=appdb;user=sa;password=...;trustServerCertificate=true` |
| SQLAlchemy / Django | mssql URL via `pyodbc`/`pymssql`; same params; `TrustServerCertificate=yes` |
| EF Core / .NET Aspire | `Server=localhost,1433;Database=appdb;User Id=sa;Password=...;Encrypt=True;TrustServerCertificate=True`; Aspire can add the container as a resource |
| JDBC | `jdbc:sqlserver://localhost:1433;databaseName=appdb;user=sa;password=...;trustServerCertificate=true` |

When the container runs as a service inside a compose network, connect to the **service name** (for example `sqldb,1433`), not `localhost`. See the `azure-sql-sidecar` skill.
