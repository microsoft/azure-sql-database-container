# Environment variables

## Required at container start

| Variable | Value | Notes |
| --- | --- | --- |
| `ACCEPT_EULA` | `Y` | Required. The container exits at startup if it is not set. |
| `MSSQL_SA_PASSWORD` | a strong password | SQL Server default complexity policy: at least 8 characters with characters from at least three of: uppercase, lowercase, digits, non-alphanumeric symbols. A password that fails the policy makes the container exit immediately. |

The product edition (`MSSQL_PID=SqlDbDev`) is baked into the image. Do not set it yourself.

## Application configuration (not container env)

Applications should read their connection string from a single environment variable so the same code runs locally and in the cloud. The convention used across the samples and task skills is `SQL_CONNECTION_STRING`.

```dotenv
# Local: the Azure SQL Database container
SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true"

# Cloud (later): Azure SQL Database. Only the server and auth change; the application does not.
# SQL_CONNECTION_STRING="Server=tcp:<your-server>.database.windows.net,1433;Database=appdb;Authentication=Active Directory Default;Encrypt=true"
```

Add `.env` to `.gitignore`. Never hardcode the password in application source or print it in logs.

## Secrets in CI

In CI, pass `MSSQL_SA_PASSWORD` from a repository secret (for example `${{ secrets.SQL_SA_PASSWORD }}` in GitHub Actions), never a literal. See the `azure-sql-ci` skill.
