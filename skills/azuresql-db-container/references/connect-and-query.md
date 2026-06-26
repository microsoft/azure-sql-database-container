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

The image ships sqlcmd at `/opt/mssql-tools18/bin/sqlcmd`. Use `-C` to trust the
self-signed certificate and `-b` so a SQL error sets the exit code.

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -b \
  -d appdb -Q "SELECT DB_NAME() AS db, SERVERPROPERTY('EngineEdition') AS EngineEdition;"
```

## sqlcmd from the host

Use the host port chosen by the free-port loop (here shown as `1433`). The
comma form `localhost,PORT` selects the port.

```bash
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -C -b \
  -d appdb -Q "SELECT SERVERPROPERTY('Edition') AS Edition;"
```

Expect `SQL Azure`.

## Standard connection string

Standardize on this shape everywhere. Use `Server=`, `Database=`, `User Id=`,
`Password=`, and `TrustServerCertificate=true`. Do not use the `Uid=`/`Pwd=`
short forms.

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true
```

Apps read this from a single `SQL_CONNECTION_STRING` env var (see
`environment-variables.md`).

## Driver / ORM connection strings

All target `appdb`, which must already exist.

| Stack | Connection string / config |
| --- | --- |
| ADO.NET / EF Core (SqlClient) | `Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true` |
| Go (microsoft/go-mssqldb) | `sqlserver://sa:YourStrong!Passw0rd@localhost:1433?database=appdb&TrustServerCertificate=true` |
| Python (pyodbc, ODBC 18) | `Driver={ODBC Driver 18 for SQL Server};Server=localhost,1433;Database=appdb;Uid=sa;Pwd=YourStrong!Passw0rd;TrustServerCertificate=yes` |
| Python (pymssql) | `pymssql.connect(server="localhost", port=1433, user="sa", password="YourStrong!Passw0rd", database="appdb")` |
| Node.js (mssql / tedious) | `{ server: "localhost", port: 1433, user: "sa", password: "YourStrong!Passw0rd", database: "appdb", options: { trustServerCertificate: true } }` |
| JDBC | `jdbc:sqlserver://localhost:1433;databaseName=appdb;user=sa;password=YourStrong!Passw0rd;trustServerCertificate=true` |

Note: the ODBC keyword form genuinely uses `Uid`/`Pwd`; that is an ODBC-specific
exception. For the .NET-style (`User Id=`/`Password=`) and the
`SQL_CONNECTION_STRING` convention, always use the long keywords.

## VS Code MSSQL

In the MSSQL extension, add a connection with:

- Server: `localhost,1433`
- Database: `appdb`
- Authentication: SQL Login
- User: `sa`
- Password: `YourStrong!Passw0rd`
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
