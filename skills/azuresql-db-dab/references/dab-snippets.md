# Data API Builder snippets

## Contents

- End-to-end with the CLI
- DAB as a container against the SQL container
- DAB as a compose service
- Sample REST calls
- Sample GraphQL calls
- Seeding a table to return rows

## End-to-end with the CLI

Assumes the container is running and `appdb` is provisioned (see
**azuresql-db-container** / **azuresql-db-scaffold**), with a `dbo.Books` table.

```bash
dotnet tool install --global Microsoft.DataApiBuilder   # once; needs .NET 8

export SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"

dab init --database-type mssql \
  --connection-string "@env('SQL_CONNECTION_STRING')" \
  --host-mode Development
dab add Book --source dbo.Books --source.type table --permissions "anonymous:*"
dab start            # http://localhost:5000
```

## DAB as a container against the SQL container

DAB in its own container must reach the SQL container over the Docker network,
so the host is the **service/container name**, not `localhost`. Put both on one
network:

```bash
docker network create appnet 2>/dev/null

# SQL engine on the network (name: sqldb)
docker run -d --name sqldb --network appnet --platform linux/amd64 \
  -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd \
  -p 1433:1433 sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
# ... wait for ready + CREATE DATABASE appdb (see azuresql-db-container) ...

# DAB on the same network; connection host is sqldb, not localhost
docker run -d --name dab --network appnet -p 5000:5000 \
  -e SQL_CONNECTION_STRING="Server=sqldb,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true" \
  -v "$PWD/dab-config.json:/App/dab-config.json" \
  mcr.microsoft.com/azure-databases/data-api-builder:latest
```

If the SQL engine runs on the host instead, DAB-in-a-container reaches it at
`host.docker.internal,1433`.

## DAB as a compose service

Add DAB alongside the `sqldb` sidecar (see **azuresql-db-sidecar** for the
engine service + `sqldb-init`). Host is the service name `sqldb`:

```yaml
services:
  # sqldb: ...        (engine, see azuresql-db-sidecar)
  # sqldb-init: ...   (creates appdb, see azuresql-db-sidecar)

  dab:
    image: mcr.microsoft.com/azure-databases/data-api-builder:latest
    depends_on:
      sqldb-init:
        condition: service_completed_successfully
    environment:
      SQL_CONNECTION_STRING: "Server=sqldb,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
    ports:
      - "5000:5000"
    volumes:
      - ./dab-config.json:/App/dab-config.json:ro
```

## Sample REST calls

```bash
curl http://localhost:5000/api/Book                         # list
curl http://localhost:5000/api/Book/id/1                    # by primary key
curl "http://localhost:5000/api/Book?\$filter=title eq 'Dune'&\$select=id,title"
curl -X POST http://localhost:5000/api/Book \
  -H 'Content-Type: application/json' -d '{"title":"New Title"}'
```

## Sample GraphQL calls

```bash
curl -s http://localhost:5000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ books(first:5) { items { id title } } }"}'

# mutation
curl -s http://localhost:5000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { createBook(item:{ title:\"New\" }) { id title } }"}'
```

## Seeding a table to return rows

DAB serves whatever is in the table; to see non-empty results, seed after
`appdb` exists:

```bash
docker exec -i sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa \
  -P YourStr0ng_Passw0rd -C -b -d appdb -Q \
  "IF OBJECT_ID('dbo.Books') IS NULL CREATE TABLE dbo.Books(id INT IDENTITY PRIMARY KEY, title NVARCHAR(200));
   INSERT INTO dbo.Books(title) VALUES (N'Dune'),(N'Neuromancer');"
```
