---
name: azure-sql-offline
description: Use this skill when the user wants to develop, run, or demo a project fully offline against the Azure SQL Database container. Triggers include "work offline", "no internet demo", "run the workshop without connectivity", "seed the database for a demo", or "air-gapped local SQL". Start from the azure-sql-database-container skill to pull the image once (the only step that needs the internet).
---

# Fully offline development

**Goal:** after the first image pull, the project runs end to end with no network. The container is the Azure SQL Database engine, so the same schema and seed data work later against Azure SQL Database in the cloud.

Prerequisite: pull the image once while online (use the `azure-sql-database-container` skill). Everything below runs offline.

## 1. docker compose with a seed script

The container runs initialization `.sql` files mounted at `/docker-entrypoint-initdb.d/` on first start, which loads seed data with no network.

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
    container_name: sqldb
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
    ports:
      - "1433:1433"
    volumes:
      - sqldb-data:/var/opt/mssql
      - ./db/seed.sql:/docker-entrypoint-initdb.d/seed.sql:ro
volumes:
  sqldb-data:
```

## 2. Schema and seed data

Create `db/seed.sql` with the schema and enough realistic rows to demo offline. Provision the database first (a `master`-context operation), then create objects in it.

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

## 3. Start and point the app at it

```bash
docker compose up -d
```

```dotenv
SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true"
```

Verify offline operation by disabling the network and confirming the app still reads and writes.

## Rules

- Seed data loads from a mounted `.sql` script, so nothing external is needed at runtime.
- A named volume persists data across restarts.
- The app reads `SQL_CONNECTION_STRING` from the environment; never hardcode the password.
