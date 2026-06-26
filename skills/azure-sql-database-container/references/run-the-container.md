# Running the container on any engine and architecture

Image: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest` (x64, `linux/amd64`); on a non-x64 host, add `--platform linux/amd64`. Sign in first (see the core skill, step 1). Required env: `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD`. Required memory: at least 2 GB.

## Docker

```bash
# on a non-x64 host, add --platform linux/amd64
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

## Architecture notes

The image is x64 (`linux/amd64`); on a non-x64 host, add `--platform linux/amd64`.

## Verify it is running

```bash
docker ps --filter "name=sqldb"      # docker / podman; expect "Up"
docker logs sqldb                     # wait for "SQL Server is now ready for client connections"
```

## Ports

The container listens on `1433`. To avoid a conflict with an existing local SQL Server, remap the host port, for example `-p 1436:1433`, and connect to `localhost,1436`.
