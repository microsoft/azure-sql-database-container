# Migrate docker-compose: SQL Server image to Azure SQL Developer

Before/after for a `docker-compose.yml` that used the SQL Server image.

## Before (SQL Server image)

```yaml
services:
  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStr0ng_Passw0rd"
    ports:
      - "1433:1433"
  app:
    build: ./app
    environment:
      SQL_CONNECTION_STRING: "Server=db,1433;Database=master;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
    depends_on:
      - db
```

Problems carried over from the SQL Server image:

- Wrong image (different engine; `EngineEdition` is not 5).
- App connects to `master`; the Azure engine will not auto-create a user DB and
  `master` is for provisioning only.
- No readiness wait; the engine is not ready when the container starts.
- No `--platform`; the Azure image is x64 only.

## After (Azure SQL Developer)

```yaml
services:
  db:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
    # On a non-x64 host, uncomment the next line (the image is x64 only):
    # platform: linux/amd64
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStr0ng_Passw0rd"
    ports:
      - "1433:1433"
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$$MSSQL_SA_PASSWORD\" -C -b -l 2 -Q \"SELECT 1\""]
      interval: 5s
      timeout: 5s
      retries: 30
  provision:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
    # platform: linux/amd64
    depends_on:
      db:
        condition: service_healthy
    entrypoint: >
      /opt/mssql-tools18/bin/sqlcmd -S db,1433 -U sa -P "YourStr0ng_Passw0rd" -C -b
      -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
  app:
    build: ./app
    environment:
      SQL_CONNECTION_STRING: "Server=db,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
    depends_on:
      provision:
        condition: service_completed_successfully
```

## What changed and why

1. **Image** rewritten to Azure SQL Developer. Sign in first:
   `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io`.
2. **`platform: linux/amd64`** added (commented) for non-x64 hosts; the image is
   x64 only.
3. **Healthcheck** uses `sqlcmd -C -b -l 2` so a SQL error sets the exit code and
   transient startup errors (e.g. `Msg 913`) are retried, not masked.
4. **`provision` one-shot service** runs `CREATE DATABASE appdb` on a master
   connection before the app starts. The engine does not auto-create databases.
5. **App connection string** re-pointed from `Database=master` to
   `Database=appdb`. Keep `User Id=` / `Password=` / `Database=` (not `Uid=` /
   `Pwd=`), keep `TrustServerCertificate=true`.

## Seeding

The image does not auto-run `/docker-entrypoint-initdb.d/*.sql`. To seed, extend
the `provision` service to run your script after creating the database, for
example mount `seed.sql` and append `-i /seed.sql -d appdb`, or run it
separately after `appdb` exists:

```bash
docker compose run --rm provision \
  /opt/mssql-tools18/bin/sqlcmd -S db,1433 -U sa -P "YourStr0ng_Passw0rd" -C -d appdb -i /seed.sql
```

## SQL Server-only features to remove first

Before migrating, strip any SQL Server Agent jobs, FILESTREAM/FileTable, full
Service Broker, cross-server distributed transactions, and Windows Auth from the
schema and app config. See `sql-server-vs-azure-feature-matrix.md` for replacements.
