# Connect and query

How to connect with sqlcmd (host and in-container) and the standardized
connection strings for drivers, ORMs, and VS Code. Every example assumes `appdb`
was already provisioned (see `connection-model.md`).

## Contents

- sqlcmd in the container
- sqlcmd from the host
- Standard connection string
- Driver / ORM connection strings
- VS Code MSSQL
- Validation rules
- Do not

## sqlcmd in the container

The image ships sqlcmd at `/opt/mssql-tools18/bin/sqlcmd`, so the host does not
need sqlcmd installed. Prefer this form when sqlcmd is not on the host (or to
avoid a dependency at all). Use `-C` to trust the self-signed certificate and
`-b` so a SQL error sets the exit code.

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -d appdb -Q "SELECT DB_NAME() AS db, SERVERPROPERTY('EngineEdition') AS EngineEdition;"
```

## sqlcmd from the host

Use the host port chosen by the free-port loop (here shown as `1433`). The
comma form `localhost,PORT` selects the port.

```bash
sqlcmd -S localhost,1433 -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -d appdb -Q "SELECT SERVERPROPERTY('Edition') AS Edition;"
```

Expect `SQL Azure`.

## Standard connection string

Standardize on this shape everywhere. Use `Server=`, `Database=`, `User Id=`,
`Password=`, and `TrustServerCertificate=true`. Do not use the `Uid=`/`Pwd=`
short forms.

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true
```

Apps read this from a single `SQL_CONNECTION_STRING` env var (see
`environment-variables.md`).

## Driver / ORM connection strings

All target `appdb`, which must already exist.

| Stack | Connection string / config |
| --- | --- |
| ADO.NET / EF Core (SqlClient) | `Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true` |
| Go (microsoft/go-mssqldb) | `sqlserver://sa:YourStr0ng_Passw0rd@localhost:1433?database=appdb&TrustServerCertificate=true` |
| Python (pyodbc, ODBC 18) | `Driver={ODBC Driver 18 for SQL Server};Server=localhost,1433;Database=appdb;Uid=sa;Pwd=YourStr0ng_Passw0rd;TrustServerCertificate=yes` |
| Python (pymssql) | `pymssql.connect(server="localhost", port=1433, user="sa", password="YourStr0ng_Passw0rd", database="appdb")` |
| Node.js (mssql / tedious) | `{ server: "localhost", port: 1433, user: "sa", password: "YourStr0ng_Passw0rd", database: "appdb", options: { trustServerCertificate: true } }` |
| JDBC | `jdbc:sqlserver://localhost:1433;databaseName=appdb;user=sa;password=YourStr0ng_Passw0rd;trustServerCertificate=true` |

Note: the ODBC keyword form genuinely uses `Uid`/`Pwd`; that is an ODBC-specific
exception. For the .NET-style (`User Id=`/`Password=`) and the
`SQL_CONNECTION_STRING` convention, always use the long keywords.

## VS Code MSSQL

The MSSQL extension's GitHub Copilot integration works against the container
today (for example writing SQL from natural language or opening the schema
designer): https://aka.ms/vscode-mssql-copilot-docs. The extension's graphical
UI is not yet fully compatible with the container and some UI features may
error; prefer sqlcmd or a driver for non-Copilot work. Add a connection with:

- Server: `localhost,1433`
- Database: `appdb`
- Authentication: SQL Login
- User: `sa`
- Password: `YourStr0ng_Passw0rd`
- Trust server certificate: enabled

## Validation rules

- Every connection names `appdb`; none rely on a default of `master` for app
  work.
- A health query returns `EngineEdition = 5` and `Edition = SQL Azure`.
- No client issues `USE`.

## Do not

- Do not use `Uid=`/`Pwd=` in the standardized .NET-style string or in
  `SQL_CONNECTION_STRING`.
- Do not omit `TrustServerCertificate=true` (the cert is self-signed).
- Do not connect to a database before provisioning it.
