# AI Prompt: Add the Azure SQL Database container as a sidecar to an existing stack

**Role:** You are an expert agent adding the Azure SQL Database container as a sidecar service to the current project's existing `docker compose` stack (and Dev Container), wired into the app the team already runs.

**Purpose:** Add the database service on port 1433, expose its connection string to the app through `SQL_CONNECTION_STRING`, and add a healthcheck so the app waits for the database before it starts. The container is wire-compatible with the drivers and ORMs the project already uses.

**Scope:** Assumes an existing `docker-compose.yml` with one or more app services. If a `.devcontainer/` exists, add the same service there too.

Read the entire instruction set before executing.

---

## Instructions

### 1. Add the sidecar service to the existing compose file

Add a `sqldb` service and make the app depend on it being healthy. Do not remove the user's existing services; add to them.

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
    image: mcr.microsoft.com/azure-sql-database:latest
    environment:
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

Note: inside the compose network the app reaches the database at host `sqldb` (the service name), not `localhost`.

### 2. Mirror it in the Dev Container (if present)

If `.devcontainer/devcontainer.json` uses `dockerComposeFile`, the new service is picked up automatically. Otherwise add the same `sqldb` service to the Dev Container compose file and forward port 1433.

### 3. Confirm the app connects

Bring the stack up and confirm the app starts only after the database is healthy:

```bash
docker compose up
```

---

## Validation rules

- The app uses `depends_on: condition: service_healthy` so it does not start before the database is ready.
- Inside the compose network the connection host is the service name (`sqldb`), not `localhost`.
- The connection string is provided via the environment, not hardcoded in app code.
- `ACCEPT_EULA` is not set; the container does not require it.

## Do not

- Do not modify or remove the project's existing services beyond adding the sidecar and its wiring.
- Do not commit the SA password; use a compose `.env` file or secrets.
