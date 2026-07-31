# Auth and secrets: least-privilege users, connection strings, secret storage

## Contents

- Create a least-privilege SQL user on the container (login + mapped user)
- Contained user with password (cloud only; does not work on the container)
- An Entra principal as a database user
- Connection strings per environment
- Managed identity in the cloud (and why not Default)
- Custom token handling (optional, advanced)
- Keep the secret out of source

## Create a least-privilege SQL user on the container (login + mapped user)

Provision `appdb` as `sa` on a master connection first (the engine does not
auto-create databases). Then create a **server login** on `master` and map a
**database user** to it in `appdb`, granting only the roles the app needs. On the
container this login-plus-user path is the one that works for SQL auth; the
contained-user path below does not (see the next section).

```sql
-- On a master connection:
CREATE LOGIN applogin WITH PASSWORD = 'An0ther_Str0ng_Passw0rd';

-- On an appdb connection (Database=appdb):
CREATE USER appuser FOR LOGIN applogin;
ALTER ROLE db_datareader ADD MEMBER appuser;
ALTER ROLE db_datawriter ADD MEMBER appuser;
-- Only if the app executes stored procedures:
-- GRANT EXECUTE TO appuser;
```

The app connects as `applogin`. Do not add `appuser` to `db_owner`. If the app
only reads, grant just `db_datareader`. Narrower still: `GRANT SELECT, INSERT,
UPDATE, DELETE ON SCHEMA::dbo TO appuser;` or per-object grants.

## Contained user with password (cloud only; does not work on the container)

In Azure SQL Database in the cloud, the norm is a **contained user** created
directly in the database, with no server login:

```sql
-- Azure SQL Database (cloud), connected to appdb:
CREATE USER appuser WITH PASSWORD = 'An0ther_Str0ng_Passw0rd';
ALTER ROLE db_datareader ADD MEMBER appuser;
ALTER ROLE db_datawriter ADD MEMBER appuser;
```

**This does not work on the container today.** `CREATE USER ... WITH PASSWORD`
returns `Msg 15007` ('...' is not a valid login or you do not have permission),
and trying to enable it with `ALTER DATABASE appdb SET CONTAINMENT = PARTIAL`
returns `Msg 12824` (contained database authentication must be configured).
Locally, use the login-plus-user recipe above; the app code and connection string
are identical either way (username plus password). This is the inverse of the
cloud, where contained users are preferred and server logins are limited.

## An Entra principal as a database user

To let the app authenticate as a Microsoft Entra identity (user, group, or
managed identity), enable Entra on the engine first (see the
**azuresql-db-container** skill, `references/entra-auth.md`), then create the
database user from the external provider. This is the same statement you use in
Azure SQL Database in the cloud.

```sql
-- Connected to appdb, as an Entra admin:
CREATE USER [my-app-identity] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [my-app-identity];
ALTER ROLE db_datawriter ADD MEMBER [my-app-identity];
```

For a server-scoped Entra login (server admin path), run
`CREATE LOGIN [name] FROM EXTERNAL PROVIDER` on a master connection.

## Connection strings per environment

Only the connection string changes between environments; the app code does not.

```text
# Local container, least-privilege SQL login:
Server=localhost,1433;Database=appdb;User Id=applogin;Password=An0ther_Str0ng_Passw0rd;Encrypt=true;TrustServerCertificate=true

# Cloud, Entra (interactive/dev or a specific method in prod):
Server=your-server.database.windows.net,1433;Database=appdb;Authentication=Active Directory Default;Encrypt=true

# Cloud, managed identity (production):
Server=your-server.database.windows.net,1433;Database=appdb;Authentication=Active Directory Managed Identity;Encrypt=true
```

`Encrypt=true` everywhere. `TrustServerCertificate=true` **only** for the local
self-signed cert; never against the cloud. Use `User Id=` / `Password=` (not
`Uid=` / `Pwd=`) for the .NET/ADO.NET form; for ODBC (pyodbc) the equivalents are
`Uid=` / `Pwd=` and `Authentication=ActiveDirectoryMsi` for managed identity.

## Managed identity in the cloud (and why not Default)

For a production app under load, prefer `Authentication=Active Directory Managed
Identity` over `Active Directory Default`. `Default` uses `DefaultAzureCredential`,
which walks a chain of credential sources (env vars, then the hosting service's
managed identity, then developer sign-in) until one works. That flexibility is
right for getting started and for running locally against the cloud, but under
load a specific method is faster (it skips chain probing) and unambiguous about
which identity is used. `Microsoft.Data.SqlClient` caches the acquired token, so
you are not fetching one on every connection. For a user-assigned managed
identity, add `User Id=<client-id>`.

## Custom token handling (optional, advanced)

To control token caching yourself, or to choose the credential based on whether
the app runs with a managed identity versus a username/password, register a custom
`SqlAuthenticationProvider` at startup with
`SqlAuthenticationProvider.SetProvider(...)`. This is **startup wiring, not
data-layer code** - your queries, schema, and driver calls do not change.

## Keep the secret out of source

The connection string carries a credential; never commit it or the SA password.

- **Env var + git-ignored `.env`:** the app reads one `SQL_CONNECTION_STRING`;
  keep local values in a `.env` listed in `.gitignore`.
- **.NET dev:** `dotnet user-secrets set "ConnectionStrings:Sql" "<string>"`
  keeps it out of the repo and out of `appsettings.json`.
- **Azure Key Vault (cloud):** store the connection string as a secret and read it
  at startup (for example via `DefaultAzureCredential` + the Key Vault SDK), or
  reference it from App Service / Container Apps configuration.
- **Managed identity:** the strongest option - there is no password to store at
  all; the platform identity gets the token.
