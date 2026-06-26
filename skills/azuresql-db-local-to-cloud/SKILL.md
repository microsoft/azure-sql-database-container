---
name: azuresql-db-local-to-cloud
description: >-
  Proves that code built and tested against the local Azure SQL Database
  container runs unchanged against Azure SQL Database in the cloud, with only
  the connection string changing. Use when a user wants to develop locally then
  deploy to the cloud, asks "will this work in Azure", "same code local and
  cloud", "promote to Azure SQL", "swap the connection string", "dev/prod
  parity", "local to cloud", or is wiring SQL_CONNECTION_STRING for an app that
  must target both the container and a cloud server. Use this when an app uses
  local SA auth but needs Microsoft Entra auth in the cloud. Covers Node (mssql),
  .NET (Microsoft.Data.SqlClient), and Python (pyodbc). Reach for this skill
  before hand-editing app code to "make it work in Azure"; the rule is the code
  does not change, only the connection string does.
---

# Azure SQL Database: local to cloud, same code

Build and test against the local Azure SQL Database container, then deploy the
**same application code** to Azure SQL Database in the cloud. Only the
connection string changes. Nothing else.

This works because the local container is the **Azure SQL Database engine**, not
the SQL Server box image. `SELECT SERVERPROPERTY('EngineEdition')` returns `5`
and `SERVERPROPERTY('Edition')` returns `'SQL Azure'`, the same as the cloud. So
the SQL surface your code depends on is the same in both places.

## The one rule

**Do not change application code between local and cloud.** The application reads
its connection string from a single environment variable, `SQL_CONNECTION_STRING`.
Local development sets it to the container; cloud deployment sets it to the Azure
SQL server. Same binaries, same queries, same schema.

If you find yourself editing queries, drivers, or schema to "make it work in
Azure", stop: that is a bug. The only thing that legitimately differs is the
connection string (and, with it, the auth method).

## The single env var, two values

Standardize on `SQL_CONNECTION_STRING`. Use `User Id=` / `Password=` /
`Database=` (never `Uid=` / `Pwd=`).

Local (container, SA auth):

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true
```

Cloud (Azure SQL Database, Microsoft Entra auth):

```
Server=your-server.database.windows.net,1433;Database=appdb;Authentication=Active Directory Default;Encrypt=true
```

Note what stays identical: `Database=appdb`, the table names, the parameterized
SQL. Only `Server`, the auth fields, and TLS posture move.

## Local SA auth vs cloud Entra auth (why, not just how)

Local: the container is provisioned with one bootstrap login, `sa`, set via the
`MSSQL_SA_PASSWORD` environment variable. There is no identity provider in front
of a container on your laptop, so password auth over a trusted self-signed cert
(`TrustServerCertificate=true`) is the pragmatic local default.

Cloud: Azure SQL Database sits behind Microsoft Entra ID. Instead of shipping a
password, the app presents a token from its Entra identity (a managed identity
in production, your developer sign-in locally against the cloud). The driver
acquires the token; you never put a secret in the connection string. TLS is
real and enforced, so use `Encrypt=true` and drop `TrustServerCertificate`.

The application code does not branch on this. The driver reads the
`Authentication=` keyword (or its absence) from the connection string and does
the right thing. That is the whole point: auth is configuration, not code.

Full walkthrough, token flow, and per-stack auth setup: see
**references/auth-local-vs-cloud.md**.

## Minimal load-bearing facts about the local container

Just enough to run the examples on a fresh container. For full detail see the
**azuresql-db-container** skill.

- Image: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest`
  (x64, `linux/amd64`). Private preview registry: run
  `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io` first using the shared
  pull-only credentials provided to the Private Preview cohort (request them via
  the early-access feedback channel; they may rotate). Registry and tag are
  provisional during Private Preview.
- On a non-x64 host, add `--platform linux/amd64`.
- Required env: `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD`
  (8+ chars, upper/lower/digit/symbol). Engine listens on 1433.
- **The engine does not auto-create databases.** You must
  `CREATE DATABASE appdb` on a **master** connection before connecting with
  `Database=appdb`. The `master` connection is for provisioning only; do real
  work on `appdb`.
- Avoid `USE` to switch databases. In a user-database (SDS) session (the
  Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly
  as in Azure SQL Database in the cloud. A `master` connection is a non-SDS
  provisioning session where the Azure statement filter is not enforced, so `USE`
  (and `BACKUP`/`RESTORE`) appear to work there, but `master` is for provisioning
  only, not application work. Always select the target database in the connection
  string (`Database=appdb`, or `-d appdb` for sqlcmd).

## Start the container and provision appdb (canonical recipe)

Run this once. It picks a free host port, adds `--platform` only when needed,
waits for real readiness, and provisions `appdb` inside the retry loop. The
`-b -l 2` makes a transient startup error (for example `Msg 913`) set the exit
code so the loop retries instead of masking it.

```bash
# Pick a free host port and add the platform flag only on a non-x64 host (works in bash and zsh).
HOST_PORT=1433; while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do HOST_PORT=$((HOST_PORT+1)); done
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "$HOST_PORT:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do sleep 2; done
echo "ready on localhost,$HOST_PORT"
```

Then point the app at it (assuming the loop above settled on 1433):

```bash
export SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
```

To run against the cloud later, change only this variable; do not touch the app.

## Proof: same code, two stacks

Each example assumes `appdb` already exists (provisioned by the recipe above) and
reads `SQL_CONNECTION_STRING` from the environment. It creates a table if needed
and runs a **parameterized** CRUD transaction. Run it once with the local string,
then again with the cloud string: identical code, identical result.

### Node (mssql)

```js
// app.js  ->  node app.js
import sql from 'mssql';

const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);
const tx = new sql.Transaction(pool);
await tx.begin();
try {
  const r = new sql.Request(tx);
  await r.query(`IF OBJECT_ID('dbo.todo') IS NULL
    CREATE TABLE dbo.todo (id INT IDENTITY PRIMARY KEY, title NVARCHAR(200), done BIT);`);
  // CREATE
  const ins = await new sql.Request(tx)
    .input('title', sql.NVarChar, 'ship local-to-cloud')
    .query('INSERT INTO dbo.todo(title, done) OUTPUT inserted.id VALUES (@title, 0);');
  const id = ins.recordset[0].id;
  // UPDATE
  await new sql.Request(tx)
    .input('id', sql.Int, id)
    .query('UPDATE dbo.todo SET done = 1 WHERE id = @id;');
  // READ
  const read = await new sql.Request(tx)
    .input('id', sql.Int, id)
    .query('SELECT id, title, done FROM dbo.todo WHERE id = @id;');
  console.log(read.recordset[0]);
  await tx.commit();
} catch (e) { await tx.rollback(); throw e; }
await pool.close();
```

### .NET (Microsoft.Data.SqlClient)

```csharp
// Program.cs  ->  dotnet run   (uses Microsoft.Data.SqlClient)
using Microsoft.Data.SqlClient;

var cs = Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING");
using var conn = new SqlConnection(cs);
conn.Open();
using var tx = conn.BeginTransaction();
try {
    new SqlCommand(@"IF OBJECT_ID('dbo.todo') IS NULL
        CREATE TABLE dbo.todo (id INT IDENTITY PRIMARY KEY, title NVARCHAR(200), done BIT);",
        conn, tx).ExecuteNonQuery();
    // CREATE
    var ins = new SqlCommand(
        "INSERT INTO dbo.todo(title, done) OUTPUT inserted.id VALUES (@title, 0);", conn, tx);
    ins.Parameters.AddWithValue("@title", "ship local-to-cloud");
    int id = (int)ins.ExecuteScalar();
    // UPDATE
    var upd = new SqlCommand("UPDATE dbo.todo SET done = 1 WHERE id = @id;", conn, tx);
    upd.Parameters.AddWithValue("@id", id);
    upd.ExecuteNonQuery();
    // READ
    var sel = new SqlCommand("SELECT id, title, done FROM dbo.todo WHERE id = @id;", conn, tx);
    sel.Parameters.AddWithValue("@id", id);
    using var r = sel.ExecuteReader();
    while (r.Read()) Console.WriteLine($"{r["id"]} {r["title"]} {r["done"]}");
    tx.Commit();
} catch { tx.Rollback(); throw; }
```

### Python (pyodbc) reference

A third stack and the deployment checklist live in
**references/auth-local-vs-cloud.md** so this body stays an overview.

## Validation rules

- `appdb` must exist before the app connects. Provision it on `master` first
  (the recipe does this). The engine never auto-creates it.
- The app reads exactly one connection variable, `SQL_CONNECTION_STRING`.
- Local string uses SA auth + `TrustServerCertificate=true`; cloud string uses
  `Authentication=Active Directory Default` + `Encrypt=true`.
- Use `User Id=` / `Password=` / `Database=`, not `Uid=` / `Pwd=`.
- Switching environments changes the connection string only. The diff to app
  code between local and cloud is zero lines.

## Do not

- Do not use the SQL Server box image `mcr.microsoft.com/mssql/server`. If you
  were about to, stop and use the image above; this is the Azure SQL engine.
- Do not connect to `Database=appdb` before creating it on `master`.
- Do not use `USE appdb` to switch databases; set the database in the connection
  string (`Database=appdb`, or `-d appdb` for sqlcmd). In a user-database (SDS)
  session (the Azure-faithful context where you develop), `USE` returns
  `Msg 40508`, exactly as in Azure SQL Database in the cloud. A `master`
  connection is a non-SDS provisioning session where the Azure statement filter is
  not enforced, so `USE` (and `BACKUP`/`RESTORE`) appear to work there, but
  `master` is for provisioning only, not application work. Always select the
  target database in the connection string (`Database=appdb`, or `-d appdb` for
  sqlcmd).
- Do not put a password or secret in the cloud connection string; use Entra
  auth and let the driver fetch a token.
- Do not branch app logic on environment; keep auth in configuration.
- Do not call arm64 / Apple Silicon "supported"; on a non-x64 host just add
  `--platform linux/amd64`.
