# AI Prompt: Run integration tests against the Azure SQL Database container in CI

**Role:** You are an expert DevOps agent adding a real database to the current project's CI so integration tests run against the Azure SQL Database engine on every pull request, with no Azure subscription and no shared-instance flakiness.

**Purpose:** Add the Azure SQL Database container as a service to the CI workflow, wait until it is ready, run the integration test suite against it, and tear it down. The same database the tests run against in CI is the same engine that runs in Azure SQL Database in the Microsoft Azure cloud.

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
        image: mcr.microsoft.com/azure-sql-database:latest
        env:
          MSSQL_SA_PASSWORD: ${{ secrets.SQL_SA_PASSWORD }}
        ports:
          - 1433:1433
    env:
      SQL_CONNECTION_STRING: "Server=localhost,1433;Database=master;User Id=sa;Password=${{ secrets.SQL_SA_PASSWORD }};TrustServerCertificate=true"
    steps:
      - uses: actions/checkout@v4

      - name: Wait for SQL to accept connections
        run: |
          for i in $(seq 1 30); do
            if /opt/mssql-tools18/bin/sqlcmd -S localhost,1433 -U sa -P "${{ secrets.SQL_SA_PASSWORD }}" -C -Q "SELECT 1" >/dev/null 2>&1; then
              echo "ready"; exit 0
            fi
            echo "waiting ($i)"; sleep 3
          done
          echo "database did not become ready"; exit 1

      # Replace with your stack's setup and test commands:
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test    # tests read SQL_CONNECTION_STRING from the environment
```

### 2. Add the SA password as a repository secret

Add a strong password as the `SQL_SA_PASSWORD` secret under repository Settings → Secrets and variables → Actions. Do not commit it.

### 3. Make the test suite use the environment connection string

Ensure tests read `process.env.SQL_CONNECTION_STRING` (Node) or the equivalent, and create/drop their own schema or a throwaway database so runs are isolated.

---

## Validation rules

- The workflow waits until the database accepts connections before running tests (no fixed `sleep`).
- The SA password comes from a secret, never hardcoded in the YAML.
- Tests read the connection string from the environment and do not depend on a pre-seeded shared database.
- `ACCEPT_EULA` is not set; the container does not require it.

## Do not

- Do not run integration tests against a shared cloud database; use the container service so each run is isolated and free.
- Do not print the password or connection string in logs.
