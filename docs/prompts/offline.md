# AI Prompt: Set up fully offline development on the Azure SQL Database container

**Role:** You are an expert agent configuring the current project to develop, run, and demo entirely offline against the Azure SQL Database container. After the first image pull, nothing should require the internet.

**Purpose:** Add a reproducible `docker compose` setup, an initial schema migration, and a seed script with realistic sample data, so the app runs end-to-end with no network connection. The container is the Azure SQL Database engine, so the same schema and data work later against Azure SQL Database in the Microsoft Azure cloud.

**Scope:** Assumes the current project with Docker available. The first `docker pull` needs the internet once; everything after runs offline.

Read the entire instruction set before executing.

---

## Instructions

### 1. Add a docker compose service with a persistent volume and a seed script

Create `docker-compose.yml`. The Azure SQL Database engine does not auto-run mounted `.sql` files, so the seed is mounted into the container and applied with one explicit command in step 3 (still fully offline, no network needed).

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
    # The image is x64-only. platform: linux/amd64 pins it so it runs on a non-x64 host
    # (Apple Silicon) under emulation; on an x64 host it is a no-op.
    platform: linux/amd64
    container_name: sqldb
    environment:
      MSSQL_SA_PASSWORD: "YourStr0ng_Passw0rd"
      ACCEPT_EULA: "Y"
    ports:
      - "1433:1433"
    volumes:
      - sqldb-data:/var/opt/mssql
      - ./db/seed.sql:/seed.sql:ro
volumes:
  sqldb-data:
```

### 2. Create the schema and seed data

Create `db/seed.sql` with the schema and enough realistic rows to demo the app offline. It targets `appdb` (selected with `-d appdb` in step 3), so it contains no `CREATE DATABASE` and no `USE`:

```sql
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL
);
GO
INSERT INTO products (name, price) VALUES
    (N'Keyboard', 49.99), (N'Mouse', 24.50), (N'Monitor', 199.00),
    (N'Webcam', 79.00), (N'Desk lamp', 34.95);
GO
```

### 3. Start it and load the seed

```bash
docker compose up -d

# Wait until the engine is ready and create appdb (it is not auto-created). The -b makes a SQL
# error set the exit code, so transient startup errors are retried, not masked.
until docker compose exec -T sqldb /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
    -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do
  sleep 2
done
# Apply the schema and data to appdb. Select the database with -d; do not USE.
docker compose exec -T sqldb /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -d appdb -i /seed.sql
```

The seed runs once; the named volume keeps `appdb` and its data across restarts, so later `docker compose up -d` runs need no network and no re-seed.

Set the app connection string (in `.env`, read from the environment, never hardcoded):

```dotenv
SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
```

Verify offline operation by disabling the network and confirming the app still reads and writes data.

---

## Validation rules

- Seed data loads from a mounted `.sql` script, so no external service is needed at runtime.
- A named volume persists data across restarts.
- The app reads `SQL_CONNECTION_STRING` from the environment.
- `ACCEPT_EULA` is set to `Y`; the container requires it.

## Do not

- Do not depend on any network call at runtime, including cloud auth or remote seed sources.
- Do not commit the SA password; keep it in `.env` (gitignored) or a compose `.env` file.
