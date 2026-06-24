---
name: azure-sql-database-container
description: Use this skill whenever the user wants to run, start, stop, connect to, query, or troubleshoot the Azure SQL Database container, or build an application against a local Azure SQL Database. Triggers include "run Azure SQL Database locally", "add a local SQL database to my project", "start the SQL container", "write a docker-compose for SQL Database", "connect with sqlcmd", "use Apple Containers or Podman for SQL", "fix the SQL container not starting", "what is the connection string", or moving from the local container to Azure SQL Database in the cloud. Use it even when the user does not name the container, as long as the task involves a local Azure SQL Database engine. This is the entry-point skill for the container and hands off to the task skills for application scenarios.
---

# Azure SQL Database container

You are helping a developer work with the Azure SQL Database container: the Azure SQL Database engine, running locally for development and CI. It is wire-compatible with Azure SQL Database in the Microsoft Azure cloud (same drivers, same T-SQL, same migrations), so moving to the cloud is a connection-string change, not a code change.

It is not the SQL Server box product. `SELECT SERVERPROPERTY('EngineEdition')` returns `5` and `SERVERPROPERTY('Edition')` returns `SQL Azure`, the same values Azure SQL Database returns in the cloud.

## The lifecycle, end to end

1. **Confirm prerequisites.** A container engine is installed and running (Docker, Podman, or Apple Containers), port `1433` is free, and the runtime has at least 2 CPUs and 4 GB of memory.
2. **Sign in to the preview registry.** The image is private; the user has a username and password from the welcome email.
3. **Start the container** with `ACCEPT_EULA=Y` and a strong `MSSQL_SA_PASSWORD`, publishing port `1433`.
4. **Connect and verify** with `sqlcmd` (or a driver / the VS Code MSSQL extension). Confirm `EngineEdition = 5`.
5. **Build, then hand off** to a task skill for the user's scenario.

## 1. Sign in to the registry

The image lives in a private preview registry. Sign in first; the credentials come from the user's welcome email.

```bash
# Docker or Podman
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>

# Apple Containers (run `container system start` once per boot first)
container registry login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>
```

Image reference: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest` (x64, `linux/amd64`). On Apple Silicon and arm64 Linux it runs under emulation (`--platform linux/amd64`). The exact registry, tag, and credentials are provisional during Private Preview and arrive in the welcome email.

## 2. Start the container

Pick the engine the user has. Both `ACCEPT_EULA=Y` and `MSSQL_SA_PASSWORD` are required, and the engine refuses to start without 2 GB of memory. For the full matrix (Podman, Apple Containers `--memory`, persistent volumes, port remap), read `references/run-the-container.md`.

**Docker or Podman (single command):**

```bash
docker run --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
    -p 1433:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

**docker compose (reproducible, recommended for projects):**

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
    container_name: sqldb
    ports:
      - "1433:1433"
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
    volumes:
      - sqldb-data:/var/opt/mssql
volumes:
  sqldb-data:
```

**Apple Containers (Apple Silicon):** the image is x64, so pass `--arch amd64 --rosetta` to run under emulation. It also defaults to 1 GB of memory, which is below the engine minimum, so always pass `--memory 4g`.

```bash
container run -d --name sqldb --arch amd64 --rosetta --memory 4g --cpus 4 \
    -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
    -p 1433:1433 sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

## 3. Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `ACCEPT_EULA` | Yes | Must be `Y`. The container will not start without it. |
| `MSSQL_SA_PASSWORD` | Yes | SQL complexity policy: at least 8 characters with a mix of upper, lower, digit, and a non-alphanumeric symbol. |

Do not hardcode the password in application code or commit it; read it from the environment. See `references/environment-variables.md` for details and how apps should read `SQL_CONNECTION_STRING`.

## 4. Connect and verify

Connect from the host and confirm the engine identity in one command (`-C` trusts the container's self-signed certificate):

```bash
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -C -Q "SELECT @@VERSION;"
```

You should see `Microsoft SQL Azure`. To verify the edition: `-Q "SELECT SERVERPROPERTY('EngineEdition') AS EngineEdition, SERVERPROPERTY('Edition') AS Edition;"` returns `5` and `SQL Azure`.

No `sqlcmd` on the host? Run the copy bundled in the container at `/opt/mssql-tools18/bin/sqlcmd` via `docker exec` / `container exec`, or use the VS Code MSSQL extension (server `localhost,1433`, SQL Login `sa`, trust server certificate). Driver and ORM connection strings (mssql, mssql-python, pyodbc, EF Core, Prisma, SQLAlchemy, JDBC) and the VS Code steps are in `references/connect-and-query.md`.

## The connection model (important, Azure-faithful)

This container reproduces the Azure SQL Database connection model, which differs from a normal SQL Server instance:

- A connection to **`master`** is for **provisioning only** (`CREATE DATABASE` / `DROP DATABASE`). Do not develop application logic here; it does not apply the full Azure SQL Database statement semantics.
- A connection **directly to a user database** is the Azure-faithful session. As in the cloud, **`USE <db>` cannot switch databases** (it returns `Msg 40508`), so select the target database in the connection string (`Database=appdb` / `Initial Catalog=appdb`) and open a connection to it.

Workflow: connect to `master` to `CREATE DATABASE appdb;`, then open a new connection with `Database=appdb` for all real work. Full detail in `references/connection-model.md`.

## Stop and clean up

```bash
docker rm -f sqldb            # docker / podman
docker compose down           # if started with compose (add -v to drop the data volume)
container rm -f sqldb         # Apple Containers
```

## Known limitations (apply automatically)

- **The image is x64 (`linux/amd64`); arm64 runs under emulation.** There is no native arm64 image. On Apple Silicon or arm64 Linux, run with `--platform linux/amd64` (Docker), or `--arch amd64 --rosetta` (Apple Containers). The engine, T-SQL, and `VECTOR_DISTANCE` work under emulation; enable Rosetta in Docker Desktop for speed.
- **Windows on ARM is not supported.** Use an x64 Windows host, or macOS / Linux on arm64 under emulation.
- **Restriction parity is still landing.** Some PaaS restrictions are not yet enforced locally, and a few session-level defaults differ. Validate against an Azure SQL Database instance once before declaring production readiness, and set defaults explicitly in the connection string when they matter.

More symptoms and fixes (password complexity, port in use, TLS) are in `references/troubleshooting.md`.

## Hand off to a task skill

Once the container is reachable, route to the skill that matches the user's goal:

- Develop locally and deploy to Azure unchanged -> `azure-sql-local-to-cloud`
- Vector search / RAG / embeddings -> `azure-sql-rag`
- Run integration tests in CI -> `azure-sql-ci`
- Fully offline development and demos -> `azure-sql-offline`
- Add it to an existing docker compose / Dev Container stack -> `azure-sql-sidecar`
- Scaffold a brand-new project (.NET Aspire, FastAPI, Next.js, NestJS) -> `azure-sql-scaffold`

The local-to-cloud guarantee is the point of this container: if application code has to change between the local container and Azure SQL Database in the cloud, that is a bug worth filing.

## What this container is NOT

- Not the SQL Server box product. Do not suggest SQL Server features absent from Azure SQL Database (SQL Agent, FILESTREAM, full Service Broker, cross-server distributed transactions, Windows Authentication / NTLM).
- Not a production database. The license is a Private Preview license scoped to development, testing, CI, and demos.
- Not feature-complete during Private Preview. Expect rough edges and breaking changes between drops.
