# AI Prompt: Scaffold a new project with the Azure SQL Database container as the default database

**Role:** You are an expert agent scaffolding a new project that uses the Azure SQL Database container as its default local database from the first commit.

**Purpose:** Create a new project for the user's chosen stack (.NET Aspire, FastAPI, Next.js, or NestJS), with the container wired in as the local database, an initial schema with one example entity, the first migration, and a typed data-access layer. The same code targets Azure SQL Database in the Microsoft Azure cloud by changing only the connection string.

**Scope:** A fresh or near-empty project directory with Docker available.

Read the entire instruction set before executing.

---

## Instructions

### 1. Ask which stack to scaffold

Ask the user to choose one and proceed accordingly:
1. **.NET Aspire** (use the Azure SQL Database container as the default resource and `Microsoft.Data.SqlClient` / EF Core).
2. **FastAPI** (Python, `mssql-python` or SQLAlchemy).
3. **Next.js** (TypeScript, `mssql` or Prisma with the `sqlserver` provider).
4. **NestJS** (TypeScript, TypeORM or Prisma).

### 2. Add the local database

Add a `docker-compose.yml` with the container so the database starts with one command:

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
    environment:
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
      ACCEPT_EULA: "Y"
    ports:
      - "1433:1433"
    volumes:
      - sqldb-data:/var/opt/mssql
volumes:
  sqldb-data:
```

Add a `.env` (gitignored) with a single connection string the app reads from the environment:

```dotenv
SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true"
```

Some ORMs read their own variable in their own format, not the ADO string above. For the **Prisma** `sqlserver` provider (Next.js / NestJS), also add a `DATABASE_URL` in Prisma's URL form. Prisma reads `DATABASE_URL`, not `SQL_CONNECTION_STRING`:

```dotenv
DATABASE_URL="sqlserver://localhost:1433;database=appdb;user=sa;password=YourStrong!Passw0rd;trustServerCertificate=true"
```

On Prisma 7+, the runtime client also needs a driver adapter: `npm i @prisma/adapter-mssql` and construct `PrismaClient` with the matching `PrismaMSSQL` adapter. `prisma migrate dev` creates the `appdb` database if it does not exist; for stacks whose migration tool does not (for example EF Core), first create it with `docker compose exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"`.

### 3. Scaffold schema, migration, and data-access layer

For the chosen stack:
- Define one example entity (for example `Product { id, name, price }`) using the stack's idiomatic model or ORM.
- Generate the first migration that creates the table (use `IDENTITY` for the primary key; this is the Azure SQL Database engine, so use T-SQL types: `NVARCHAR`, `DECIMAL`, `DATETIME2`).
- Add a small typed data-access layer (repository or service) with create/list/get operations using parameterized queries.
- Add a `README` section showing `docker compose up -d`, the migration command, and how to run the app.

### 4. Verify

Bring up the database, run the migration, run the app, and confirm a create/list round-trip works.

```bash
docker compose up -d
# run the stack's migration command, then start the app
```

---

## Validation rules

- The app reads the connection string from the environment; it is never hardcoded.
- Migrations and models use T-SQL-compatible types and `IDENTITY` keys.
- Data access uses the ORM or parameterized queries, never string concatenation.
- The project documents how to start the database and run migrations.
- `ACCEPT_EULA` is set to `Y`; the container requires it.

## Do not

- Do not default the project to the SQL Server image (`mcr.microsoft.com/mssql/server`); use the Azure SQL Database container.
- Do not commit secrets; keep the SA password in `.env` or a compose `.env` file.
- Do not assume cloud-only features; for parity, validate against Azure SQL Database before declaring production readiness.
