# Auth: local SA vs cloud Microsoft Entra

How authentication differs between the local Azure SQL Database container and
Azure SQL Database in the cloud, why the application code stays the same, plus a
third stack (Python) and a deployment checklist.

## Contents

- [The principle](#the-principle)
- [Local: SA auth](#local-sa-auth)
- [Cloud: Microsoft Entra auth](#cloud-microsoft-entra-auth)
- [Token flow, plainly](#token-flow-plainly)
- [Per-stack auth setup](#per-stack-auth-setup)
- [Python (pyodbc) full example](#python-pyodbc-full-example)
- [Deployment checklist](#deployment-checklist)
- [Do not](#do-not)

## The principle

Authentication is configuration, not code. The application reads one variable,
`SQL_CONNECTION_STRING`, and hands it to the driver. The driver inspects the
connection keywords and chooses how to authenticate. Because the local container
and the cloud are the same engine (`EngineEdition = 5`, `Edition = 'SQL Azure'`),
the queries, schema, and driver calls are byte-for-byte identical. Only the
connection string moves.

## Local: SA auth

The container is bootstrapped with a single login, `sa`, whose password comes
from the `MSSQL_SA_PASSWORD` environment variable you set at `docker run`. There
is no identity provider in front of a container on your machine, so the practical
local choice is username/password over a trusted self-signed certificate.

Local string:

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true
```

`TrustServerCertificate=true` accepts the container's self-signed cert. This is
fine on localhost; it is not what you ship to the cloud.

The `sa` login is a bootstrap and provisioning identity. Use it to create
`appdb` and the schema; your application does its real work against `appdb`.

## Cloud: Microsoft Entra auth

Azure SQL Database sits behind Microsoft Entra ID. Rather than embedding a
password, the application presents a short-lived token proving its Entra
identity. In production that identity is a managed identity assigned to the
hosting service (App Service, Container Apps, AKS, a VM); locally against the
cloud it is your developer sign-in (Azure CLI / IDE login). No secret lives in
the connection string.

Cloud string:

```
Server=your-server.database.windows.net,1433;Database=appdb;Authentication=Active Directory Default;Encrypt=true
```

- `Authentication=Active Directory Default` tells the driver to walk the default
  Entra credential chain: managed identity in production, your developer login
  when running locally against the cloud. The same string works in both, with no
  code change.
- `Encrypt=true` enforces real TLS. Drop `TrustServerCertificate`: the cloud
  presents a CA-issued certificate, so there is nothing to "trust over".
- `Database=appdb` is unchanged from local.

One-time cloud setup (outside the app): create the database, then create a
contained database user mapped to the app's Entra identity and grant it the
roles it needs. For example, connected to `appdb` as an Entra admin:

```sql
CREATE USER [my-app-identity] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [my-app-identity];
ALTER ROLE db_datawriter ADD MEMBER [my-app-identity];
```

## Token flow, plainly

1. App starts and reads `SQL_CONNECTION_STRING`.
2. Driver sees `Authentication=Active Directory Default` and asks the Entra
   credential chain for a token scoped to Azure SQL.
3. In production the managed identity returns a token with no secret on disk;
   locally your signed-in developer credential returns one.
4. Driver opens an encrypted connection and presents the token. The server maps
   it to the contained user you created and authorizes by role.
5. Token expires; the driver silently refreshes on the next connection.

The app never sees the token. That is why the same binary runs in both places.

## Per-stack auth setup

The only thing each stack needs is the auth-capable driver and (for production)
the platform identity. App logic is unchanged.

- **Node (mssql)**: `mssql` uses the Tedious driver. For Entra, supply an
  `authentication` config or pass an `Authentication=...` connection string and
  the appropriate Azure identity package. Locally, the SA connection string just
  works with no extra package.
- **.NET (Microsoft.Data.SqlClient)**: `Authentication=Active Directory Default`
  is understood natively by `Microsoft.Data.SqlClient`; pair it with
  `Azure.Identity` so `DefaultAzureCredential` resolves managed identity or your
  developer login. Locally, the SA string needs nothing extra.
- **Python (pyodbc)**: use the ODBC Driver 18 for SQL Server. For Entra, add
  `Authentication=ActiveDirectoryDefault` to the ODBC connection string (driver
  18.1+). Locally, the SA string with `TrustServerCertificate=yes` is enough.

## Python (pyodbc) full example

Runs on a fresh container after `appdb` is provisioned (see the canonical recipe
in SKILL.md). Reads `SQL_CONNECTION_STRING`, ensures the table, runs a
parameterized CRUD transaction. Same code for local and cloud; only the env var
differs.

For pyodbc, set `SQL_CONNECTION_STRING` in ODBC keyword form.

Local:

```
Driver={ODBC Driver 18 for SQL Server};Server=localhost,1433;Database=appdb;Uid=sa;Pwd=YourStrong!Passw0rd;TrustServerCertificate=yes
```

Cloud:

```
Driver={ODBC Driver 18 for SQL Server};Server=your-server.database.windows.net,1433;Database=appdb;Authentication=ActiveDirectoryDefault;Encrypt=yes
```

(Note: ODBC keyword syntax uses `Uid`/`Pwd`; the application-level mssql and
.NET strings use `User Id`/`Password`. Keep each in its native form.)

```python
# app.py  ->  python app.py
import os, pyodbc

conn = pyodbc.connect(os.environ["SQL_CONNECTION_STRING"], autocommit=False)
cur = conn.cursor()
try:
    cur.execute("""IF OBJECT_ID('dbo.todo') IS NULL
        CREATE TABLE dbo.todo (id INT IDENTITY PRIMARY KEY, title NVARCHAR(200), done BIT);""")
    # CREATE
    cur.execute(
        "INSERT INTO dbo.todo(title, done) OUTPUT inserted.id VALUES (?, 0);",
        "ship local-to-cloud")
    todo_id = cur.fetchone()[0]
    # UPDATE
    cur.execute("UPDATE dbo.todo SET done = 1 WHERE id = ?;", todo_id)
    # READ
    cur.execute("SELECT id, title, done FROM dbo.todo WHERE id = ?;", todo_id)
    print(cur.fetchone())
    conn.commit()
except Exception:
    conn.rollback()
    raise
finally:
    conn.close()
```

## Deployment checklist

1. Build and test locally with the SA connection string against the container.
2. Provision the cloud database `appdb` and create a contained user for the
   app's Entra identity (see the SQL above).
3. Assign a managed identity to the hosting service and grant it the database
   roles it needs.
4. Set `SQL_CONNECTION_STRING` in the cloud environment to the Entra string.
   Change nothing else.
5. Deploy the same artifact. Confirm the app connects and the CRUD path runs.
6. Confirm the diff to application code between local and cloud is zero lines.

## Do not

- Do not ship `TrustServerCertificate=true` to the cloud; use `Encrypt=true`.
- Do not put a password in the cloud connection string; use Entra tokens.
- Do not branch app code on environment; keep auth in the connection string.
- Do not reuse `sa` as your application identity in the cloud; map a contained
  user to the app's Entra identity with least-privilege roles.
- Do not connect to `appdb` before it is created on `master` locally, or before
  it exists in the cloud.
