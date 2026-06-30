---
name: azuresql-db-ci
description: Run integration tests against the Azure SQL Database container (Private Preview, local engine) in CI. Use when setting up GitHub Actions, Azure Pipelines, or GitLab CI to test against Azure SQL DB; when adding a database service container to a CI workflow; when tests need a real Azure SQL engine in the pipeline; or when you see "service container", "health-cmd", "ACR_USERNAME/ACR_PASSWORD", "MSSQL_SA_PASSWORD secret", or "integration test database". Also use when a workflow was about to pull the SQL Server image mcr.microsoft.com/mssql/server, in which case stop and use the Azure SQL Database engine image instead. Covers pulling from the private ACR with credentials, the service health check that runs sqlcmd inside the container so the runner needs no client tools, provisioning appdb before tests, and pointing the test connection string at the user database not master.
---

# Azure SQL Database container in CI

Run integration tests against the **Azure SQL Database engine** (Private Preview) as a CI
service container. This is the local Azure SQL engine, not the SQL Server image
`mcr.microsoft.com/mssql/server`. `SELECT SERVERPROPERTY('EngineEdition')` returns **5** and
`SERVERPROPERTY('Edition')` returns **'SQL Azure'**. If a workflow was about to use the SQL Server image, stop and use this image instead.

For full container detail (readiness loop, connection model, vectors, seeding), see the
**azuresql-db-container** skill and its `wait-until-ready.md` and `image-and-registry.md`.

## Load-bearing facts (inlined)

- **Image:** `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest`
  (x64, linux/amd64). It lives in a private preview registry; the runner must sign in with
  `ACR_USERNAME` / `ACR_PASSWORD` secrets. Registry and tag are provisional during Private Preview.
- **Platform:** the image is x64 only; there is no arm64 image. CI hosted runners are x64, so no
  `--platform` flag is needed there. On a non-x64 self-hosted runner, add `--platform linux/amd64`.
- **Required env:** `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD` (8+ chars, upper/lower/digit/
  symbol), kept in a secret. Engine listens on 1433.
- **Provision appdb first.** The engine does **NOT** auto-create databases on connect. You must
  `CREATE DATABASE appdb` on a **master** connection before anything connects with `Database=appdb`.
- **Prefer the connection string over `USE`.** Avoid `USE` to switch databases. In a user-database
  (SDS) session (the Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as
  in Azure SQL Database in the cloud. A `master` connection is a non-SDS provisioning session where
  the Azure statement filter is not enforced, so `USE` appears to work there,
  but `master` is for provisioning only, not application work. Always select the target database in
  the connection string (`Database=appdb`, or `-d appdb` for sqlcmd).
- **master is for provisioning only.** Tests run against the user database `appdb`, never master.
- **No auto-seed.** The image does **NOT** run `/docker-entrypoint-initdb.d/*.sql` (that is a
  Postgres/MySQL convention, not honored here). Seed by running `sqlcmd -d appdb -i seed.sql` after
  provisioning appdb.

## Connection string (standard)

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=<MSSQL_SA_PASSWORD>;TrustServerCertificate=true
```

Use `User Id=` / `Password=` / `Database=` (not `Uid=` / `Pwd=`). For sqlcmd use `-C` to trust the
self-signed cert. The app reads this from a single `SQL_CONNECTION_STRING` env var. Tests target
`appdb`, not master.

## GitHub Actions (canonical)

The service container starts the engine. Its **health check runs sqlcmd inside the container**, so
the runner needs no client tools. A separate step provisions `appdb` via `docker exec` before tests.

```yaml
name: integration
on: [push, pull_request]

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
          MSSQL_SA_PASSWORD: ${{ secrets.MSSQL_SA_PASSWORD }}
        ports:
          - 1433:1433
        # Health check runs INSIDE the container; -b makes a SQL error set the exit
        # code so transient startup errors (e.g. Msg 913) are retried, not masked.
        options: >-
          --health-cmd "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$MSSQL_SA_PASSWORD\" -C -b -l 2 -Q \"SELECT 1\""
          --health-interval 5s
          --health-timeout 3s
          --health-retries 20
          --health-start-period 30s
    steps:
      - uses: actions/checkout@v4

      # The engine does NOT auto-create databases. Provision appdb on master first,
      # via docker exec into the service container (runner needs no sqlcmd).
      - name: Provision appdb
        run: |
          CID=$(docker ps --filter "ancestor=sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest" --format '{{.ID}}')
          docker exec "$CID" /opt/mssql-tools18/bin/sqlcmd \
            -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b \
            -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
        env:
          MSSQL_SA_PASSWORD: ${{ secrets.MSSQL_SA_PASSWORD }}

      # Optional: seed appdb (no auto-seed). Copy the file in, then run it against appdb.
      - name: Seed appdb
        run: |
          CID=$(docker ps --filter "ancestor=sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest" --format '{{.ID}}')
          docker cp seed.sql "$CID:/tmp/seed.sql"
          docker exec "$CID" /opt/mssql-tools18/bin/sqlcmd \
            -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -d appdb -i /tmp/seed.sql
        env:
          MSSQL_SA_PASSWORD: ${{ secrets.MSSQL_SA_PASSWORD }}

      - name: Run integration tests
        run: |
          # Tests connect to the USER database appdb, NOT master.
          npm ci && npm run test:integration
        env:
          SQL_CONNECTION_STRING: "Server=localhost,1433;Database=appdb;User Id=sa;Password=${{ secrets.MSSQL_SA_PASSWORD }};TrustServerCertificate=true"
```

### Why these choices

- **`credentials:`** pulls from the private preview ACR using `ACR_USERNAME` / `ACR_PASSWORD`
  secrets. Without it the pull fails: the registry is private.
- **`--health-cmd` with `-l 2 -b`** waits for true readiness. `docker run` returning does not mean
  the engine is ready; `-b` retries transient SQL startup errors instead of masking them. The job
  blocks on health before steps run.
- **Provision step, not auto-create.** appdb must exist before tests open `Database=appdb`.
- **Test connection targets appdb.** master is for provisioning only.

## Required secrets

| Secret | Purpose |
| --- | --- |
| `ACR_USERNAME` | Private preview registry sign-in (using the shared pull-only credentials provided to the Private Preview cohort; get them by signing up at https://aka.ms/sqldbcontainerpreview-signup; they may rotate) |
| `ACR_PASSWORD` | Private preview registry sign-in |
| `MSSQL_SA_PASSWORD` | sa password for the engine; complex, 8+ chars |

## Adapting to other CI

- **Azure Pipelines:** there is no native `services:`. Sign in with
  `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u $(ACR_USERNAME) -p $(ACR_PASSWORD)`, run
  the container with the **canonical start recipe** below (it provisions appdb in the ready-wait
  loop), then run tests with `SQL_CONNECTION_STRING` pointed at appdb.
- **GitLab CI:** use a `services:` entry for the image, set `DOCKER_AUTH_CONFIG` for the private
  registry, set `ACCEPT_EULA` and `MSSQL_SA_PASSWORD`, then provision appdb in a `before_script` with
  `docker exec` (or a sqlcmd container) before tests.

### Canonical start recipe (self-hosted / non-service runners)

Free port, conditional platform, ready-wait, provision appdb in one shape:

```bash
HOST_PORT=1433; while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do HOST_PORT=$((HOST_PORT+1)); done
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "$HOST_PORT:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do sleep 2; done
echo "ready on localhost,$HOST_PORT"
```

## Validation rules

- The pull uses `credentials:` (or `docker login`) with `ACR_USERNAME` / `ACR_PASSWORD`.
- `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD` (from a secret) are set on the service.
- The health check runs sqlcmd **inside** the container with `-C -b -l 2`.
- A provisioning step creates `appdb` on master **before** any test connects.
- The test `SQL_CONNECTION_STRING` has `Database=appdb`, not master, and uses `User Id=` / `Password=`.

## Do not

- Do not use the SQL Server image `mcr.microsoft.com/mssql/server`; use the Azure SQL DB image.
- Do not connect with `Database=appdb` before provisioning appdb on master; the engine will not
  auto-create it.
- Do not `USE appdb` to switch databases. In a user-database (SDS) session (the Azure-faithful
  context where you develop), `USE` returns `Msg 40508`, exactly as in Azure SQL Database in the
  cloud. A `master` connection is a non-SDS provisioning session where the Azure statement filter is
  not enforced, so `USE` appears to work there, but `master` is for
  provisioning only, not application work. Always select the target database in the connection string
  (`Database=appdb`, or `-d appdb` for sqlcmd).
- Do not run tests against master; master is for provisioning only.
- Do not rely on `/docker-entrypoint-initdb.d/*.sql`; it is not honored. Seed with `sqlcmd -d appdb -i`.
- Do not require sqlcmd on the runner; the health check and provisioning run inside the container.
- Do not call arm64 "supported"; on a non-x64 self-hosted runner just add `--platform linux/amd64`.
