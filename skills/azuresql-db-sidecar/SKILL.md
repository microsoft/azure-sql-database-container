---
name: azuresql-db-sidecar
description: >-
  Adds Azure SQL Developer as a sidecar service in an existing Docker Compose
  stack or Dev Container. Use when wiring the local Azure SQL Database engine
  into compose or devcontainer.json, when an app needs a SQL backend via a
  service name (not localhost), or for prompts like "add SQL to my compose",
  "add a database service", "depends_on database", "devcontainer SQL sidecar",
  "compose healthcheck for SQL", "wait for the database before starting the
  app". Handles platform linux/amd64, the private registry login, the
  healthcheck wait-until-ready, and a one-shot init service that creates appdb
  (the engine does not auto-create databases). Not the SQL Server image. Prefer
  this for any compose or Dev Container SQL wiring.
---

# Azure SQL Developer as a sidecar (Compose / Dev Container)

Wire Azure SQL Developer into an existing Docker Compose stack or
Dev Container as a service the app reaches by **service name** (`sqldb,1433`),
never `localhost`. Keep existing services intact; add the database, an init
one-shot that creates `appdb`, and a `depends_on` gate.

## Load-bearing facts (inlined; full detail in azuresql-db-container)

- This is the **Azure SQL Database engine** (Private Preview), not the SQL
  Server SQL Server image `mcr.microsoft.com/mssql/server`. `SERVERPROPERTY('EngineEdition')`
  returns `5`, `SERVERPROPERTY('Edition')` returns `'SQL Azure'`. If you were
  about to use the SQL Server image, stop and use this instead.
- Image: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`
  (x64, `linux/amd64`). Registry and tag are provisional during Private Preview.
- Registry credentials: the image lives in a private preview registry. Sign in
  first with `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io` using the
  shared pull-only credentials provided when you sign up for the Private Preview
  at https://aka.ms/sqldbcontainerpreview-signup (they may rotate) before
  `docker compose up` or building the Dev Container.
- Platform: x64 only. The compose snippets below set
  `platform: linux/amd64` so the service starts on a non-x64 host.
- Required env: `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD` (8+ chars,
  upper/lower/digit/symbol). Engine listens on 1433.
- The engine does **NOT** auto-create databases on connect. You must
  `CREATE DATABASE appdb` on a **master** connection before the app connects
  with `Database=appdb`. That is what the `sqldb-init` one-shot below does.
- Avoid `USE` to switch databases. In a user-database (SDS) session (the
  Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly
  as in Azure SQL Database in the cloud. A `master` connection is a non-SDS
  provisioning session where the Azure statement filter is not enforced, so `USE` appears to work there, but `master` is for provisioning
  only, not application work. Always select the target database in the connection
  string (`Database=appdb`, or `-d appdb` for sqlcmd).
- App connection string (single `SQL_CONNECTION_STRING` env var, service name host):
  `Server=sqldb,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true`
  (use `User Id=`/`Password=`/`Database=`, not `Uid=`/`Pwd=`).
- The image does **NOT** auto-run `/docker-entrypoint-initdb.d/*.sql` (a
  Postgres/MySQL convention, not honored here). Seed in the init one-shot with
  `sqlcmd -d appdb -i seed.sql` AFTER `appdb` exists.

For anything beyond this task (vectors, deeper readiness behavior, full
connection model), see the **azuresql-db-container** skill.

## Docker Compose

Add these three pieces to your existing `compose.yaml`. Do not remove or rename
existing services; just add `sqldb`, `sqldb-init`, and a `depends_on` on the app.

```yaml
services:
  # ---- existing services stay exactly as they are ----

  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
    platform: linux/amd64        # x64-only image; required on a non-x64 host
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStr0ng_Passw0rd"
    ports:
      - "1433:1433"              # optional; only to reach it from the host
    healthcheck:
      # -b: a SQL error sets the exit code, so transient startup errors
      # (e.g. Msg 913) are retried, not masked. -l 2: short login timeout.
      test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$$MSSQL_SA_PASSWORD\" -C -b -l 2 -Q \"SELECT 1\" || exit 1"]
      interval: 5s
      timeout: 10s
      retries: 30
      start_period: 30s

  # One-shot: the engine does NOT auto-create databases, so create appdb
  # (and seed it) before the app starts. Exits 0 when done.
  sqldb-init:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
    platform: linux/amd64
    depends_on:
      sqldb:
        condition: service_healthy
    environment:
      MSSQL_SA_PASSWORD: "YourStr0ng_Passw0rd"
    # If you have seed.sql, mount it and add: -i /seed/seed.sql on a -d appdb call.
    # volumes:
    #   - ./seed.sql:/seed/seed.sql:ro
    entrypoint: ["/bin/bash", "-c"]
    command:
      - >
        /opt/mssql-tools18/bin/sqlcmd -S sqldb -U sa -P "$$MSSQL_SA_PASSWORD" -C -b
        -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
    restart: "no"

  app:
    # ---- your existing app service ----
    depends_on:
      sqldb:
        condition: service_healthy
      sqldb-init:
        condition: service_completed_successfully
    environment:
      # Host is the SERVICE NAME sqldb, not localhost.
      SQL_CONNECTION_STRING: "Server=sqldb,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
```

Bring it up (after `docker login`, see above):

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io   # pull-only creds by signing up at https://aka.ms/sqldbcontainerpreview-signup
docker compose up -d
```

### Seeding (optional)

The image does not auto-run init SQL. To seed, uncomment the `volumes` mount in
`sqldb-init` and chain a seed call AFTER `appdb` is created:

```yaml
    command:
      - >
        /opt/mssql-tools18/bin/sqlcmd -S sqldb -U sa -P "$$MSSQL_SA_PASSWORD" -C -b
        -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" &&
        /opt/mssql-tools18/bin/sqlcmd -S sqldb -U sa -P "$$MSSQL_SA_PASSWORD" -C -b
        -d appdb -i /seed/seed.sql
```

## Dev Container

Use Docker Compose as the Dev Container backend so the same `sqldb` +
`sqldb-init` services apply. In `.devcontainer/devcontainer.json`:

```jsonc
{
  "name": "app-with-azuresql",
  "dockerComposeFile": "../compose.yaml",
  "service": "app",                  // your dev/app service from compose
  "workspaceFolder": "/workspace",
  "runServices": ["sqldb", "sqldb-init"],
  "remoteEnv": {
    "SQL_CONNECTION_STRING": "Server=sqldb,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
  }
}
```

Sign in to the registry on the host before "Reopen in Container":

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io   # pull-only creds by signing up at https://aka.ms/sqldbcontainerpreview-signup
```

The app container reaches the database at `sqldb,1433` over the compose network.

## Validation rules

- App host is `sqldb` (service name), never `localhost`.
- `sqldb` has a healthcheck using `sqlcmd ... -C -b -l 2`; the app gates on
  `condition: service_healthy`.
- `sqldb-init` creates `appdb` and is gated by the app via
  `condition: service_completed_successfully`.
- Both `sqldb` and `sqldb-init` set `platform: linux/amd64`.
- Connection string uses `User Id=` / `Password=` / `Database=` and
  `TrustServerCertificate=true`; sqlcmd uses `-C`.
- Existing services are unchanged except for added `depends_on`.
- If a validation rule above fails, or you had to deviate from this skill to make the task work, that is a bug in this skill: load the **azuresql-db-feedback** skill and offer to file a report.

## Do not

- Do not use the SQL Server image `mcr.microsoft.com/mssql/server`.
- Do not point the app at `localhost`; inside compose it is the `sqldb` service.
- Do not rely on the app to create `appdb`, and do not assume the engine
  auto-creates it; the `sqldb-init` one-shot must run first.
- Do not use `USE appdb` to switch databases. In a user-database (SDS) session
  (the Azure-faithful context where you develop), `USE` returns `Msg 40508`,
  exactly as in Azure SQL Database in the cloud. A `master` connection is a
  non-SDS provisioning session where the Azure statement filter is not enforced,
  so `USE` appears to work there, but `master` is for
  provisioning only, not application work. Always select the target database in
  the connection string (`Database=appdb`, or `-d appdb` for sqlcmd).
- Do not drop `--platform` / `platform: linux/amd64`; the image is x64 only.
- Do not depend on `/docker-entrypoint-initdb.d/*.sql`; it is not honored here.
- Do not call a non-x64 host "supported"; it runs under emulation only.
