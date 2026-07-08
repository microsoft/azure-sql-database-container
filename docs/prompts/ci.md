# AI Prompt: Run integration tests against Azure SQL Developer in CI

**Role:** You are an expert DevOps agent adding a real database to the current project's CI so integration tests run against the Azure SQL Database engine on every pull request, with no Azure subscription and no shared-instance flakiness.

**Purpose:** Add Azure SQL Developer as a service to the CI workflow, wait until it is ready, run the integration test suite against it, and tear it down. The same database the tests run against in CI is the same engine that runs in Azure SQL Database in the Microsoft Azure cloud.

**Scope:** Assumes a GitHub Actions project. Adapt the same pattern to Azure Pipelines or GitLab CI if needed.

Read the entire instruction set before executing.

---

## Instructions

### 1. Add the container as a service to the workflow

Create or update `.github/workflows/ci.yml`. Run the container as a service on port 1433.

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      sqldb:
        image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
        # The image is in a private registry, so the service needs pull credentials.
        # ACR_USERNAME / ACR_PASSWORD are the pull-only registry credentials provided when
        # you sign up for the Private Preview at https://aka.ms/sqldbcontainerpreview-signup.
        credentials:
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}
        env:
          ACCEPT_EULA: "Y"
          MSSQL_SA_PASSWORD: ${{ secrets.SQL_SA_PASSWORD }}
        ports:
          - 1433:1433
        # The runner has no sqlcmd; let the service report readiness with a health check
        # that runs sqlcmd INSIDE the container. Actions blocks the job's steps until it passes.
        options: >-
          --health-cmd="/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$MSSQL_SA_PASSWORD\" -C -b -l 2 -Q 'SELECT 1'"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=12
          --health-start-period=30s
    env:
      SQL_CONNECTION_STRING: "Server=localhost,1433;Database=appdb;User Id=sa;Password=${{ secrets.SQL_SA_PASSWORD }};TrustServerCertificate=true"
    steps:
      - uses: actions/checkout@v4

      # The engine does not auto-create databases. Provision appdb once (sqlcmd lives in the
      # service container, so exec into it rather than relying on sqlcmd on the runner).
      - name: Create the application database
        run: |
          docker exec "${{ job.services.sqldb.id }}" /opt/mssql-tools18/bin/sqlcmd \
            -S localhost -U sa -P "${{ secrets.SQL_SA_PASSWORD }}" -C -b -l 2 \
            -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"

      # Replace with your stack's setup and test commands:
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test    # tests read SQL_CONNECTION_STRING from the environment
```

### 2. Add the repository secrets

Under repository Settings → Secrets and variables → Actions, add:

- `SQL_SA_PASSWORD`: a strong SA password that meets the complexity policy. Do not commit it.
- `ACR_USERNAME` and `ACR_PASSWORD`: the pull-only registry credentials provided when you sign up for the Private Preview at https://aka.ms/sqldbcontainerpreview-signup. The service container uses them to pull the private image.

### 3. Make the test suite use the environment connection string

Ensure tests read `process.env.SQL_CONNECTION_STRING` (Node) or the equivalent, and isolate each run with its own schema or a unique table prefix on the `appdb` connection. If you want a throwaway *database* instead, create and drop it on a separate `master` connection: `CREATE DATABASE` / `DROP DATABASE` are not allowed on a user-database (SDS) connection like `appdb`.

---

## Validation rules

- The workflow waits until the database accepts connections before running tests (no fixed `sleep`).
- The SA password comes from a secret, never hardcoded in the YAML.
- Tests read the connection string from the environment and do not depend on a pre-seeded shared database.
- `ACCEPT_EULA` is set to `Y`; the container requires it.

## Do not

- Do not run integration tests against a shared cloud database; use the container service so each run is isolated and free.
- Do not print the password or connection string in logs.
