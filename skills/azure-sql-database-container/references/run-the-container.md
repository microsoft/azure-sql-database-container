# Running the container on any engine and architecture

Image: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest` (x64, `linux/amd64`). On Apple Silicon and arm64 Linux it runs under emulation. Sign in first (see the core skill, step 1). Required env: `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD`. Required memory: at least 2 GB.

## Docker

```bash
docker run --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
    -p 1433:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

Persist data across recreation with a named volume (recommended over a host bind mount, which hits permission and locking problems on Windows hosts):

```bash
docker run --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
    -p 1433:1433 -v sqldb-data:/var/opt/mssql -d \
    sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

## Podman

Identical to Docker; replace `docker` with `podman`.

```bash
podman run --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
    -p 1433:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

## docker compose (reproducible)

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

`docker compose up -d` to start, `docker compose down` to stop (`-v` also removes the data volume).

## Apple Containers (Apple Silicon, under emulation)

Apple Containers uses the `container` CLI (not `docker`). The image is x64, so on Apple Silicon pass `--arch amd64 --rosetta` to run it under emulation. It also defaults to **1 GB** of memory, which is below the engine minimum, so it exits with `requires at least 2000 megabytes of memory`. Always pass `--memory 4g`. Start the system once per boot.

```bash
container system start
container run -d --name sqldb --arch amd64 --rosetta --memory 4g --cpus 4 \
    -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
    -p 1433:1433 sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

Port publishing (`-p 1433:1433`) reaches the host at `localhost,1433`. There is no `docker compose` equivalent; use `container run`.

## Architecture notes

The image is x64 (`linux/amd64`). There is no native arm64 image.

- **x64 hosts (Linux x64, Windows x64 via Docker Desktop or WSL2, Intel Mac):** native.
- **Apple Silicon and arm64 Linux:** run under emulation. Use `--platform linux/amd64` (Docker) or `--arch amd64 --rosetta` (Apple Containers). The engine, T-SQL, and `VECTOR_DISTANCE` work; enable Rosetta in Docker Desktop for speed.
- **Windows on ARM:** not supported in the preview (use a native x64 Windows host). Apple Silicon and arm64 Linux are fine under emulation.

## Verify it is running

```bash
docker ps --filter "name=sqldb"      # docker / podman; expect "Up"
container ls                          # Apple Containers; expect "running"
docker logs sqldb                     # wait for "SQL Server is now ready for client connections"
```

## Ports

The container listens on `1433`. To avoid a conflict with an existing local SQL Server, remap the host port, for example `-p 1436:1433`, and connect to `localhost,1436`.
