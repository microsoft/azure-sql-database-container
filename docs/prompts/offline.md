# AI Prompt: Set up fully offline development on the Azure SQL Database container

**Role:** You are an expert agent configuring the current project to develop, run, and demo entirely offline against the Azure SQL Database container. After the first image pull, nothing should require the internet.

**Purpose:** Add a reproducible `docker compose` setup, an initial schema migration, and a seed script with realistic sample data, so the app runs end-to-end with no network connection. The container is the Azure SQL Database engine, so the same schema and data work later against Azure SQL Database in the Microsoft Azure cloud.

**Scope:** Assumes the current project with Docker available. The first `docker pull` needs the internet once; everything after runs offline.

Read the entire instruction set before executing.

---

## Instructions

### 1. Add a docker compose service with a persistent volume and a seed script

Create `docker-compose.yml`. The container runs initialization `.sql` files mounted at `/docker-entrypoint-initdb.d/` on first start, which is how the seed data loads with no network.

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
    container_name: sqldb
    environment:
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
      ACCEPT_EULA: "Y"
    ports:
      - "1433:1433"
    volumes:
      - sqldb-data:/var/opt/mssql
      - ./db/seed.sql:/docker-entrypoint-initdb.d/seed.sql:ro
volumes:
  sqldb-data:
```

### 2. Create the schema and seed data

Create `db/seed.sql` with the schema and enough realistic rows to demo the app offline.

```sql
IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;
GO
USE appdb;
GO
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

### 3. Start it and point the app at it

```bash
docker compose up -d
```

Set the app connection string (in `.env`, read from the environment, never hardcoded):

```dotenv
SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true"
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
