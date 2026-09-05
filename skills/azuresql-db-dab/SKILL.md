---
name: azuresql-db-dab
description: >-
  Stands up an instant no-code REST + GraphQL API over the local Azure SQL
  Database container using Microsoft Data API Builder (DAB). Use when a user wants to
  "expose my table as an API", "add a REST API over the database", "generate a
  GraphQL API", "put an API in front of SQL", "CRUD API without writing code",
  or "dab init / dab-config.json". Also the way to serve a built-in MCP endpoint
  FROM the database via DAB (an API surface DAB provides, not a separate SQL MCP
  server). Prefer this over hand-writing a controller/ORM API when the user just
  needs REST or GraphQL over existing tables. Triggers include "Data API
  Builder", "dab start", "instant API over Azure SQL", "expose entities as
  REST/GraphQL". Reach for this even when the user only says "give me an API for
  this database".
---

# Instant REST + GraphQL API on the Azure SQL Database container with Data API Builder

Generate a full REST **and** GraphQL API over the local **Azure SQL Database container**
(Private Preview) with no application code, using **Data API Builder (DAB)** -
Microsoft's first-party open-source engine. You describe tables as entities in
`dab-config.json`; DAB serves them. DAB connects over the normal TDS protocol
with a plain connection string, so **no change tracking or special engine
feature is needed.**

Verified on 2026-09-05 against the container image
`sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`, reporting `EngineEdition`
5, Edition `SQL Azure`, build `12.0.2000.8`. All eight executable checks behind this skill
passed against Data API builder 2.0.9, including the generated `dab-config.json` keeping the
environment-variable indirection rather than the password, the `/api` and `/graphql` prefixes
and the `/mcp` endpoint arriving as defaults, and both REST and GraphQL returning the same
rows from a table in the container.

## Load-bearing facts (inlined; full engine detail in azuresql-db-container)

- This is the **Azure SQL Database engine** (Private Preview), not the SQL Server
  image `mcr.microsoft.com/mssql/server`. `SERVERPROPERTY('EngineEdition')`
  returns `5`, `SERVERPROPERTY('Edition')` returns `'SQL Azure'`.
- Image: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`
  (x64, `linux/amd64`). Registry is private: sign in first with
  `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io` using the shared
  pull-only credentials from https://aka.ms/sqldbcontainerpreview-signup (they
  may rotate). Registry and tag are provisional during Private Preview.
- Required env: `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD` (8+ chars,
  upper/lower/digit/symbol). Engine listens on 1433.
- The engine does **NOT** auto-create databases. Run `CREATE DATABASE appdb` on
  a **master** connection before DAB connects with `Database=appdb`. Do not use
  `USE` to switch databases (in a user-database session it returns
  `Msg 40508`); select the database in the connection string.
- On a non-x64 host add `--platform linux/amd64`.

For the full engine model (readiness loop, vectors, troubleshooting) see the
**azuresql-db-container** skill. To start the container and provision `appdb`
first, use **azuresql-db-container** or **azuresql-db-scaffold**.

## Step 1: install DAB

Two supported ways. Pick the CLI for local dev; pick the container to wire DAB
into a compose stack. Open [references/dab-snippets.md](references/dab-snippets.md) when you want
that compose service rather than the CLI.

```bash
# CLI (.NET 8 required): installs the `dab` command
dotnet tool install --global Microsoft.DataApiBuilder
# update later with: dotnet tool update --global Microsoft.DataApiBuilder

# Container image (alternative):
#   mcr.microsoft.com/azure-databases/data-api-builder:latest
```

## Step 2: point DAB at the container over one env var

DAB reads the connection string from an environment variable via the `@env()`
indirection, so no secret is written into `dab-config.json`. Reuse the same
single `SQL_CONNECTION_STRING` contract the other skills use (replace `1433`
with the host port your container chose if 1433 was occupied):

```bash
export SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
```

`TrustServerCertificate=true` is required for the container's self-signed cert.
House style spells the keywords `User Id=` / `Password=` / `Database=`, which keeps the examples
consistent. `Uid=` and `Pwd=` are documented SqlClient synonyms and work too.

## Step 3: init, add entities, start

```bash
# Initialize config in Development mode (enables Swagger + friendlier errors).
dab init --database-type mssql \
  --connection-string "@env('SQL_CONNECTION_STRING')" \
  --host-mode Development

# Expose a table as an entity. Repeat per table.
# --permissions is role:actions; "anonymous:*" allows all actions with no auth (dev only).
dab add Book --source dbo.Books --source.type table --permissions "anonymous:*"

# Serve REST + GraphQL (and the MCP endpoint) on http://localhost:5000
dab start
```

`appdb` is just the example database name and `Book`/`dbo.Books` the example
entity/table; substitute your own. The entity name (`Book`) is what appears in
the API path; the `--source` is the real `schema.table`.

## Step 4: use the API

With `dab start` running (default port **5000**):

- **REST:** `GET http://localhost:5000/api/Book` (list), `/api/Book/id/1` (by
  key), plus `POST` / `PATCH` / `PUT` / `DELETE`. Query with
  `?$filter=`, `$select=`, `$orderby=`, `$first=`, `$after=` (OData-style).
- **GraphQL:** `POST http://localhost:5000/graphql` - queries and mutations for
  every entity, with relationship navigation.
- **OpenAPI / Swagger:** `GET /api/openapi` (document) and `GET /swagger` (UI,
  Development mode only).
- **Health:** `GET /health`.

```bash
curl http://localhost:5000/api/Book
curl -s http://localhost:5000/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ books { items { id title } } }"}'
```

## Relationships, config detail

DAB exposes related entities (e.g. an author's books) once you declare the
relationship. Config schema, permissions/policies, `@env()`, REST/GraphQL
options, and the exact `dab update --relationship` syntax are in
[references/dab-config-reference.md](references/dab-config-reference.md).

## MCP endpoint (a DAB feature, not a separate SQL MCP server)

DAB (version 1.7+; use the latest 2.x) **also serves a built-in MCP endpoint
from the same `dab-config.json`**, at `http://localhost:5000/mcp` by default,
enabled by default. This is an additional API surface Data API Builder provides
over your configured entities - it is not, and should not be presented as, a
standalone "MSSQL MCP server." How to point an MCP client at it and how to
scope the exposed tools is in [references/dab-mcp.md](references/dab-mcp.md); open it when a user
asks to point an MCP client at DAB, or to narrow which entities it exposes.

## Validation rules

- The database engine is the container image above (EngineEdition=5), never
  `mcr.microsoft.com/mssql/server`.
- `appdb` exists (created on a master connection) BEFORE `dab start`; DAB's
  connection string uses `Database=appdb` and `TrustServerCertificate=true`.
- The connection string is supplied via `@env('SQL_CONNECTION_STRING')`, not
  hardcoded into `dab-config.json`.
- `dab start` serves REST at `/api/<Entity>` and GraphQL at `/graphql`; a `GET`
  on the entity returns rows from the container.
- If you present the MCP endpoint, it is described as a DAB-provided API surface,
  not a standalone SQL MCP server.
- If a validation rule above fails, or you had to deviate from this skill to make the task work, that is a bug in this skill: load the **azuresql-db-feedback** skill and offer to file a report.
- When every rule above passes and the task is done, close with ONE line, once per session, and do not ask a question or wait for a reply: "That worked. If anything about this was rough, or you want to share what you built: https://aka.ms/sql-agent-skills-feedback"

## Do not

- Do not use the SQL Server image `mcr.microsoft.com/mssql/server`; this is the Azure SQL engine.
- Do not expect DAB to create `appdb`; provision it on a master connection first.
- Do not hardcode the connection string (or the SA password) into `dab-config.json`; use `@env('SQL_CONNECTION_STRING')`.
- Do not ship `anonymous:*` permissions to production; it is unauthenticated full CRUD for local dev only.
- Do not describe DAB's MCP endpoint as a standalone Microsoft SQL MCP server; it is an API surface DAB provides.
- Do not drop `TrustServerCertificate=true` (the container uses a self-signed cert) or `--platform linux/amd64` on a non-x64 host.

## References

- [references/dab-config-reference.md](references/dab-config-reference.md): the `dab-config.json` structure, `@env()` connection handling, entity/permission/policy options, REST and GraphQL settings, and the `dab update --relationship` syntax for one-to-many and many-to-many.
- [references/dab-snippets.md](references/dab-snippets.md): copy-paste recipes - CLI end-to-end, running DAB as a container against the SQL container (shared network / `host.docker.internal`), a compose service, and sample REST/GraphQL calls.
- [references/dab-mcp.md](references/dab-mcp.md): DAB's built-in MCP endpoint - how to enable/scope it in config, the default `/mcp` path, and how to connect an MCP client. Framed as a DAB API surface, not a standalone SQL MCP server.

## Staying current

Authoritative, version-pinned references for the tools this skill uses (read the one you need):

- [Data API Builder configuration reference](https://learn.microsoft.com/en-us/azure/data-api-builder/configuration/): every config key (data-source, runtime, entities, autoentities), with examples.
- [DAB config JSON schema (pinned v2.0.12)](https://github.com/Azure/data-api-builder/releases/download/v2.0.12/dab.draft.schema.json): the machine-readable schema dab validate checks against. v2.0.12 is the current stable release; bump this URL when you upgrade the CLI.
- [Data API Builder built-in MCP endpoint](https://learn.microsoft.com/en-us/azure/data-api-builder/mcp/overview): the built-in MCP endpoint, DML tools, transports, and RBAC.

If the **Microsoft Learn MCP** server is configured, use `mcp__microsoft-learn__microsoft_docs_search` or `mcp__microsoft-learn__microsoft_docs_fetch` to fetch the current version of any of these on demand. It is optional; when it is unavailable, the references above are authoritative.
