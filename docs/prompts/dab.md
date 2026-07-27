# AI Prompt: Add an instant REST + GraphQL API over Azure SQL Developer with Data API Builder

**Role:** You are an expert agent standing up a no-code REST and GraphQL API over the project's local Azure SQL Developer database using Microsoft Data API Builder (DAB).

**Purpose:** Expose existing tables as a working API - REST at `/api/<Entity>` and GraphQL at `/graphql` - driven entirely by `dab-config.json`, with the connection string supplied through an environment variable and no application code. Optionally expose DAB's built-in MCP endpoint (an API surface DAB provides, not a standalone SQL MCP server).

**Scope:** Assumes the Azure SQL Developer container is running and the application database (`appdb`) exists with at least one table. If it is not running, start it and provision `appdb` first (the engine does not auto-create databases).

Read the entire instruction set before executing.

---

## Instructions

### 1. Confirm the database is ready

The database is the Azure SQL engine image `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest` (`SERVERPROPERTY('EngineEdition')` = 5), not `mcr.microsoft.com/mssql/server`. `appdb` must already exist on a master connection, with a table to expose (seed one if needed).

### 2. Provide the connection string via an environment variable

```bash
export SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
```

Use `User Id=` / `Password=` / `Database=` and `TrustServerCertificate=true` (self-signed cert). Never write the connection string into `dab-config.json`.

### 3. Initialize DAB and add entities

```bash
dotnet tool install --global Microsoft.DataApiBuilder    # once; needs .NET 8

dab init --database-type mssql \
  --connection-string "@env('SQL_CONNECTION_STRING')" \
  --host-mode Development
dab add Book --source dbo.Books --source.type table --permissions "anonymous:*"
```

Add one `dab add` per table. The entity name is the API path; `--source` is the real `schema.table`. Declare relationships with `dab update <Entity> --relationship <name> --target.entity <Target> --cardinality one|many --relationship.fields "src:tgt"`.

### 4. Start and confirm

```bash
dab start        # http://localhost:5000
curl http://localhost:5000/api/Book
curl -s http://localhost:5000/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ books { items { id title } } }"}'
```

REST is at `/api/<Entity>`, GraphQL at `/graphql`, OpenAPI at `/api/openapi`, Swagger UI at `/swagger` (Development mode), health at `/health`.

### 5. (Optional) MCP endpoint

DAB (v1.7+; use the latest 2.x) also serves an MCP endpoint at `http://localhost:5000/mcp` from the same config, enabled by default. Present it as a DAB-provided API surface over your entities, governed by the same permissions - not as a standalone Microsoft SQL MCP server. Scope it with `runtime.mcp.dml-tools` (globally) or `dab update <Entity> --mcp.dml-tools false` (per entity).

---

## Validation rules

- The database is the Azure SQL engine (EngineEdition=5), never the SQL Server image.
- `appdb` exists before `dab start`; DAB connects with `Database=appdb` and `TrustServerCertificate=true`.
- The connection string is provided via `@env('SQL_CONNECTION_STRING')`, not hardcoded in `dab-config.json`.
- `dab start` serves REST at `/api/<Entity>` and GraphQL at `/graphql`; a `GET` on an entity returns rows.
- If the MCP endpoint is exposed, it is described as a DAB API surface, not a standalone SQL MCP server.

## Do not

- Do not use the SQL Server image `mcr.microsoft.com/mssql/server`.
- Do not hardcode the connection string or SA password into `dab-config.json`.
- Do not ship `anonymous:*` permissions beyond local development.
- Do not present DAB's MCP endpoint as a standalone Microsoft SQL MCP server.
