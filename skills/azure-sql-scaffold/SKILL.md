---
name: azure-sql-scaffold
description: Use this skill when the user wants to scaffold a new project that uses the Azure SQL Database container as its default local database. Triggers include "start a new project with SQL Database", "scaffold a .NET Aspire / FastAPI / Next.js / NestJS app with a local SQL database", "set up a new app against Azure SQL", or "new project with migrations and a data layer". Start from the azure-sql-database-container skill for the container basics.
---

# Scaffold a new project on the container

**Goal:** create a new project for the user's stack with the Azure SQL Database container wired in as the local database from the first commit, plus an initial schema, the first migration, and a typed data-access layer. The same code targets Azure SQL Database in the cloud by changing only the connection string.

## 1. Ask which stack

Ask the user to choose and proceed accordingly:
1. **.NET Aspire** (Azure SQL Database container as the default resource; `Microsoft.Data.SqlClient` / EF Core)
2. **FastAPI** (Python; `mssql-python` or SQLAlchemy)
3. **Next.js** (TypeScript; `mssql` or Prisma with the `sqlserver` provider)
4. **NestJS** (TypeScript; TypeORM or Prisma)

## 2. Add the local database

Add a `docker-compose.yml` so the database starts with one command:

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
    ports:
      - "1433:1433"
    volumes:
      - sqldb-data:/var/opt/mssql
volumes:
  sqldb-data:
```

Add a gitignored `.env` with a single connection string the app reads from the environment:

```dotenv
SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true"
```

Provision `appdb` once from a `master` connection (`CREATE DATABASE appdb;`); the app connects with `Database=appdb`.

## 3. Scaffold schema, migration, and data layer

For the chosen stack:
- Define one example entity (for example `Product { id, name, price }`) using the stack's idiomatic model or ORM.
- Generate the first migration that creates the table. Use `IDENTITY` keys and T-SQL types: `NVARCHAR`, `DECIMAL`, `DATETIME2`.
- Add a small typed data-access layer (repository or service) with create / list / get using parameterized queries.
- Document `docker compose up -d`, the migration command, and how to run the app in the README.

## 4. Verify

Bring up the database, run the migration, run the app, and confirm a create/list round-trip works.

## Rules

- Read the connection string from the environment; never hardcode it.
- Migrations and models use T-SQL-compatible types and `IDENTITY` keys.
- Default the project to the Azure SQL Database container, not the SQL Server box image (`mcr.microsoft.com/mssql/server`).
- `ACCEPT_EULA: "Y"` is required; keep the SA password in `.env` or secrets.
