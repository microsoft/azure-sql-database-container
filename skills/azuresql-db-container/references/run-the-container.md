# Run the container

How to start the engine with Docker, Podman, or compose, including the
conditional platform flag, free-port selection, and volumes. The image tag lives
in `image-and-registry.md`. The readiness loop lives in `wait-until-ready.md`.

## Contents

- Canonical Docker recipe
- Why the platform flag is conditional
- Free-port selection
- Podman
- Docker compose (named volume + healthcheck)
- Volumes and persistence
- Do not

## Canonical Docker recipe

This is the shape to reuse. It picks a free host port, adds the platform flag
only on a non-x64 host, removes any stale container, starts the engine, then
waits for readiness while provisioning `appdb` in the same loop.

```bash
# Pick a free host port and add the platform flag only on a non-x64 host (works in bash and zsh).
HOST_PORT=1433; while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do HOST_PORT=$((HOST_PORT+1)); done
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
  -p "$HOST_PORT:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do sleep 2; done
echo "ready on localhost,$HOST_PORT"
```

The engine always listens on `1433` inside the container; only the host port
varies.

## Why the platform flag is conditional

The image is x64 only. On an x64 host, passing `--platform` is unnecessary. On a
non-x64 host, the daemon would otherwise fail to find a matching manifest, so
add `--platform linux/amd64` to run under emulation. The `case` block above sets
`PLATFORM` only when needed. Do not call non-x64 a supported architecture; it
runs under emulation.

## Free-port selection

`1433` is often already taken. The `while lsof ...` loop walks upward (1434,
1435, ...) until it finds a free port and stores it in `HOST_PORT`. Use
`localhost,$HOST_PORT` in client connections.

## Podman

Podman uses the same arguments. Sign in first (see `image-and-registry.md`).

```bash
podman run -d --name sqldb --platform linux/amd64 -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" -p "1433:1433" \
  sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

Drop `--platform linux/amd64` on an x64 host. Then provision and wait exactly as
in `wait-until-ready.md` (use `podman exec` in place of `docker exec`).

## Docker compose (named volume + healthcheck)

On a non-x64 host keep `platform: linux/amd64`; remove that line on x64.

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
    platform: linux/amd64
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
    ports:
      - "1433:1433"
    volumes:
      - sqldb-data:/var/opt/mssql
    healthcheck:
      test: ["CMD", "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa",
             "-P", "YourStrong!Passw0rd", "-C", "-b", "-l", "2", "-Q", "SELECT 1"]
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
docker compose exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
docker compose exec -T sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -b \
  -d appdb -i /path/in/container/seed.sql
```

## Volumes and persistence

- Mount a named volume at `/var/opt/mssql` to persist databases across
  `docker rm`. Without it, data is lost when the container is removed.
- To reset to a clean slate, remove the volume: `docker volume rm sqldb-data`.

## Do not

- Do not use `mcr.microsoft.com/mssql/server`.
- Do not add `--platform` unconditionally; gate it on a non-x64 host.
- Do not assume `appdb` exists after `docker run`; provision it (see
  `connection-model.md`).
- Do not rely on a seed directory; the image does not auto-run init SQL.
