# Environment variables

What the container requires at start, and the app-side convention.

## Container variables (required)

| Variable | Required | Notes |
| --- | --- | --- |
| `ACCEPT_EULA` | Yes | Must be `Y`. The container will not start without it. |
| `MSSQL_SA_PASSWORD` | Yes | The `sa` password. Must be complex. |

`MSSQL_SA_PASSWORD` policy: at least 8 characters and at least three of upper
case, lower case, digits, and symbols. A weak password makes the engine fail to
initialize (see `troubleshooting.md`). Example used throughout these docs:
`YourStr0ng_Passw0rd`.

The engine listens on container port `1433`. Map it to a host port at run time
(`-p HOST_PORT:1433`); see `run-the-container.md`.

```bash
docker run -d --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "1433:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

## App convention: SQL_CONNECTION_STRING

Applications read a single environment variable, `SQL_CONNECTION_STRING`, for
their connection. Standardize its value on the canonical string (note `appdb`
must already exist):

```bash
export SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
```

In compose, pass it to the app service:

```yaml
services:
  app:
    environment:
      SQL_CONNECTION_STRING: "Server=sqldb,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
```

Inside a compose network, use the service name (`sqldb`) as the host; from the
host machine, use `localhost,HOST_PORT`.

## Validation rules

- `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD` are both set before
  `docker run`.
- Apps read the connection from `SQL_CONNECTION_STRING`, not from scattered
  literals.
- The connection string uses `User Id=`/`Password=`/`Database=`, not the short
  forms.

## Do not

- Do not start without `ACCEPT_EULA=Y`.
- Do not use a weak `MSSQL_SA_PASSWORD`; the engine will fail to initialize.
- Do not hardcode the connection string in many places; centralize it in
  `SQL_CONNECTION_STRING`.
