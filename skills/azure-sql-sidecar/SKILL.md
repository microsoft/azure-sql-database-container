---
name: azure-sql-sidecar
description: Use this skill when the user wants to add the Azure SQL Database container as a sidecar to an existing docker compose stack or Dev Container. Triggers include "add SQL Database to my compose file", "sidecar database", "add it to my devcontainer", "wire the database into my stack", or "my app should wait for the database". Start from the azure-sql-database-container skill for the container basics.
---

# Add the container as a sidecar

**Goal:** add the database as a service to the user's existing `docker compose` stack (and Dev Container), wired into the app, without removing their services.

## 1. Add the service and depend on it being healthy

```yaml
services:
  # ... existing app service(s) ...
  app:
    # ... existing config ...
    environment:
      SQL_CONNECTION_STRING: "Server=sqldb,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true"
    depends_on:
      sqldb:
        condition: service_healthy

  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
    ports:
      - "1433:1433"
    volumes:
      - sqldb-data:/var/opt/mssql
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost,1433 -U sa -P \"$$MSSQL_SA_PASSWORD\" -C -Q 'SELECT 1' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

volumes:
  sqldb-data:
```

Inside the compose network the app reaches the database at the **service name** (`sqldb,1433`), not `localhost`.

## 2. Dev Container

If `.devcontainer/devcontainer.json` uses `dockerComposeFile`, the new service is picked up automatically. Otherwise add the same `sqldb` service to the Dev Container compose file and forward port 1433.

## 3. Confirm ordering

```bash
docker compose up
```

The app should start only after the database reports healthy.

## Rules

- Use `depends_on: condition: service_healthy` so the app does not start before the database is ready.
- Connection host inside the network is the service name, not `localhost`.
- `ACCEPT_EULA: "Y"` is required; provide the connection string via the environment, not hardcoded in app code.
- Do not modify or remove the project's existing services beyond adding the sidecar and its wiring. Keep the SA password in a compose `.env` file or secrets.
