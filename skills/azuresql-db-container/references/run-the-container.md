# Run the container

How to start the engine with Docker, Podman, or compose, including automatic
architecture selection, free-port selection, and volumes. The image tag lives
in `image-and-registry.md`. The readiness loop lives in `wait-until-ready.md`.

## Contents

- Canonical Docker recipe
- Explicit emulation testing
- Free-port selection
- Podman
- Docker compose (named volume + healthcheck)
- Volumes and persistence
- Do not

## Canonical Docker recipe

This is the shape to reuse. It picks a free host port, lets the runtime select
the matching architecture, removes any stale container, starts the engine, then
waits for readiness while provisioning `appdb` in the same loop.

```bash
# Pick a free host port (works in bash and zsh).
HOST_PORT=1433; while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do HOST_PORT=$((HOST_PORT+1)); done
MSSQL_SA_PASSWORD="${MSSQL_SA_PASSWORD:-Aa1%$(openssl rand -hex 16)}"
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=$MSSQL_SA_PASSWORD" \
  -p "127.0.0.1:$HOST_PORT:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do sleep 2; done
echo "ready on localhost,$HOST_PORT"
```

The engine always listens on `1433` inside the container; only the host port
varies.

## Explicitly test x64 emulation

The image supports `linux/amd64` and `linux/arm64`; the runtime selects the
matching architecture automatically. To explicitly test x64 emulation on an
ARM64 host, add `--platform linux/amd64` to the Docker or Podman command, or
`platform: linux/amd64` to Compose. Do not add the platform override to normal
development runs.

## Free-port selection

`1433` is often already taken. The `while lsof ...` loop walks upward (1434,
1435, ...) until it finds a free port and stores it in `HOST_PORT`. Use
`localhost,$HOST_PORT` in client connections.

## Podman

Podman uses the same arguments. Sign in first (see `image-and-registry.md`).

```bash
MSSQL_SA_PASSWORD="${MSSQL_SA_PASSWORD:-Aa1%$(openssl rand -hex 16)}"
podman run -d --name sqldb -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=$MSSQL_SA_PASSWORD" -p "127.0.0.1:1433:1433" \
  sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
```

Then provision and wait exactly as in `wait-until-ready.md` (use `podman exec`
in place of `docker exec`).

## Docker compose (named volume + healthcheck)

The runtime selects the matching architecture; use a `platform` override only
to explicitly test emulation.

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "${MSSQL_SA_PASSWORD:?Set MSSQL_SA_PASSWORD}"
    ports:
      - "127.0.0.1:1433:1433"
    volumes:
      - sqldb-data:/var/opt/mssql
    healthcheck:
      test: ["CMD", "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa",
             "-P", "${MSSQL_SA_PASSWORD:?Set MSSQL_SA_PASSWORD}", "-C", "-b", "-l", "2", "-Q", "SELECT 1"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 20s
volumes:
  sqldb-data:
```

Compose does not provision `appdb` for you. After the service is healthy, create
the database and seed it:

```bash
docker compose exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
docker compose exec -T sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b \
  -d appdb -i /path/in/container/seed.sql
```

## Volumes and persistence

- Mount a named volume at `/var/opt/mssql` to persist databases across
  `docker rm`. Without it, data is lost when the container is removed.
- To reset to a clean slate, remove the volume: `docker volume rm sqldb-data`.

## Do not

- Do not use `mcr.microsoft.com/mssql/server`.
- Do not add a platform override to normal runs; use one only to explicitly test emulation.
- Do not assume `appdb` exists after `docker run`; provision it (see
  `connection-model.md`).
- Do not rely on a seed directory; the image does not auto-run init SQL.
