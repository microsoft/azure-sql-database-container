# Environment variables

What the container requires at start, and the app-side convention.

## Container variables (required)

| Variable | Required | Notes |
| --- | --- | --- |
| `ACCEPT_EULA` | Yes | Must be `Y`. The container will not start without it. |
| `MSSQL_SA_PASSWORD` | Yes | The `sa` password. Must be complex. |

`MSSQL_SA_PASSWORD` policy: at least 8 characters and at least three of upper
case, lower case, digits, and symbols. A weak password makes the engine fail to
initialize (see `troubleshooting.md`). Generate a unique value for each local
environment or supply one through your secret-management workflow.

The engine listens on container port `1433`. Map it to a host port at run time
(`-p 127.0.0.1:HOST_PORT:1433`); see `run-the-container.md`.

```bash
docker run -d --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=${MSSQL_SA_PASSWORD:?Set MSSQL_SA_PASSWORD}" \
  -p "127.0.0.1:1433:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
```

## Optional: Microsoft Entra ID (`MSSQL_AAD_*`)

Entra authentication works on this image. When you want Entra locally, set
`MSSQL_AAD_CLIENT_ID`, `MSSQL_AAD_PRIMARY_TENANT`, and
`MSSQL_AAD_CERTIFICATE_FILE_PATH` (required) plus optional
`MSSQL_AAD_SERVER_ADMIN_NAME`, `MSSQL_AAD_SERVER_ADMIN_TYPE`, and
`MSSQL_AAD_SERVER_ADMIN_SID`, with a mounted `.pfx`. SQL auth remains the
default. Full variable table and recipe: [entra-auth.md](entra-auth.md).

## App convention: SQL_CONNECTION_STRING

Applications read a single environment variable, `SQL_CONNECTION_STRING`, for
their connection. Standardize its value on the canonical string (note `appdb`
must already exist):

```bash
export MSSQL_SA_PASSWORD="${MSSQL_SA_PASSWORD:-Aa1%$(openssl rand -hex 16)}"
export SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=${MSSQL_SA_PASSWORD};TrustServerCertificate=true"
```

In compose, pass it to the app service (compose reads `MSSQL_SA_PASSWORD` from the shell or a
`.env` file next to the compose file, so the app and database services stay in sync):

```yaml
services:
  app:
    environment:
      SQL_CONNECTION_STRING: "Server=sqldb,1433;Database=appdb;User Id=sa;Password=${MSSQL_SA_PASSWORD};TrustServerCertificate=true"
```

Inside a compose network, use the service name (`sqldb`) as the host; from the
host machine, use `localhost,HOST_PORT`.

## Validation rules

- `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD` are both set before
  `docker run`.
- Apps read the connection from `SQL_CONNECTION_STRING`, not from scattered
  literals.
- The connection string spells the keywords `User Id=`/`Password=`/`Database=`.
  That is house style; the short forms are valid synonyms, not a failure.

## Do not

- Do not start without `ACCEPT_EULA=Y`.
- Do not use a weak `MSSQL_SA_PASSWORD`; the engine will fail to initialize.
- Do not hardcode the connection string in many places; centralize it in
  `SQL_CONNECTION_STRING`.
