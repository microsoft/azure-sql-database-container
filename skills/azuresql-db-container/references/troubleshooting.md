# Troubleshooting

Common failures and their fixes. Symptoms first.

## Contents

- Container won't start / exits immediately
- Password policy rejection
- Port already in use
- "no matching manifest" on a non-x64 host
- Msg 40508 on USE
- Cannot open database / database does not exist
- Connecting too early (Msg 913 and friends)
- Wrong image (EngineEdition is not 5)

## Container won't start / exits immediately

Check the logs:

```bash
docker logs sqldb
```

Most often this is a missing `ACCEPT_EULA=Y` or a weak `MSSQL_SA_PASSWORD`. Fix
the env vars and recreate:

```bash
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "1433:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

## Password policy rejection

The log shows a password validation failure. `MSSQL_SA_PASSWORD` needs 8+
characters with at least three of: upper case, lower case, digits, symbols. Pick
a stronger value and recreate the container.

## Port already in use

`docker run` fails binding the host port. Pick a free port with the loop:

```bash
HOST_PORT=1433; while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do HOST_PORT=$((HOST_PORT+1)); done
echo "using $HOST_PORT"
```

Then run with `-p "$HOST_PORT:1433"` and connect to `localhost,$HOST_PORT`.

## "no matching manifest" on a non-x64 host

The image is x64 only. On a non-x64 host the daemon cannot find a native
manifest. Add the platform flag to run under emulation:

```bash
docker run -d --name sqldb --platform linux/amd64 -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" -p "1433:1433" \
  sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

This is emulation, not native support. On an x64 host, omit `--platform`.

## Msg 40508 on USE

Avoid `USE` to switch databases. In a user-database (SDS) session (the
Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as
in Azure SQL Database in the cloud. A `master` connection is a non-SDS
provisioning session where the Azure statement filter is not enforced, so `USE` appears to work there, but `master` is for provisioning
only, not application work. Always select the target database in the connection
string (`Database=appdb`, or `-d appdb` for sqlcmd). Remove any `USE` line from
seed and migration scripts. See `connection-model.md`.

## Cannot open database / database does not exist

The engine does not auto-create `appdb`. If a connection to `Database=appdb`
fails because the database does not exist, provision it on a `master`
connection first:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

## Connecting too early (Msg 913 and friends)

Errors right after `docker run` usually mean the engine is still initializing.
Use the readiness retry loop with `-b -l 2` so transient errors are retried
rather than masked. See `wait-until-ready.md`.

## Wrong image (EngineEdition is not 5)

If `SELECT SERVERPROPERTY('EngineEdition')` does not return `5`, or
`SERVERPROPERTY('Edition')` is not `'SQL Azure'`, you started the SQL Server box
image. Stop it and start the Azure SQL Database image from
`image-and-registry.md`:

```bash
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "1433:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

## Do not

- Do not retry connecting without `-b -l 2`.
- Do not use `USE` to fix a "wrong database" error.
- Do not switch to `mcr.microsoft.com/mssql/server` to "make it work".
