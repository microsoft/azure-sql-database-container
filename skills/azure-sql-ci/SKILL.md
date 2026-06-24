---
name: azure-sql-ci
description: Use this skill when the user wants to run integration tests against the Azure SQL Database container in CI. Triggers include "run tests against SQL in CI", "add SQL Database to GitHub Actions", "container as a CI service", "integration tests with a real database", or "CI without an Azure subscription". Start from the azure-sql-database-container skill for the container basics. Adapt the GitHub Actions pattern to Azure Pipelines or GitLab CI as needed.
---

# Integration tests in CI

**Goal:** run the integration suite against the Azure SQL Database engine on every pull request, with no Azure subscription and no shared-instance flakiness. The same engine the tests hit in CI is the one that runs in Azure SQL Database in the cloud.

## GitHub Actions: container as a service

The image is in a private registry, so the service needs registry credentials (`credentials:`), and the SA password must come from a secret. Add repository secrets `ACR_USERNAME`, `ACR_PASSWORD`, and `SQL_SA_PASSWORD`.

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
        image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
        credentials:
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}
        env:
          ACCEPT_EULA: "Y"
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

## Rules

- Wait until the database accepts connections before running tests (no fixed `sleep`).
- `ACCEPT_EULA: "Y"` is required; the SA password and registry credentials come from secrets, never literals.
- Tests read the connection string from the environment and create/drop their own schema or a throwaway database so runs are isolated. Provision via a `master` connection, then connect to the user database directly.
