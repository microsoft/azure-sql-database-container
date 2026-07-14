# Troubleshooting

Common failures and their fixes. Symptoms first.

## Contents

- Container won't start / exits immediately
- Password policy rejection (the container stays "Up" but nothing connects)
- Port already in use
- "no matching manifest" on a non-x64 host
- Msg 40508 on USE
- Cannot open database / database does not exist
- Connecting too early (Msg 913 and friends)
- EOF from host sqlcmd
- Wrong image (EngineEdition is not 5)

## Container won't start / exits immediately

Check the logs:

```bash
docker logs sqldb
```

A container that actually **exits** is usually a missing `ACCEPT_EULA=Y`. A weak
`MSSQL_SA_PASSWORD` does NOT exit the container: it stays `Up` while the engine
refuses to start, so read the next section before assuming the container is fine
just because `docker ps` says it is running. Fix the env vars and recreate:

```bash
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "1433:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
```

## Password policy rejection (the container stays "Up" but nothing connects)

**Do not trust the container status here.** With a password that fails the policy,
the container reports `Up` while the engine inside it never starts. Every
connection then fails with a login timeout or "server is not found", which looks
like a networking problem and is not one. Verified on the preview image.

The log is the source of truth:

```bash
docker logs sqldb 2>&1 | grep -i password
```

`MSSQL_SA_PASSWORD` needs 8+ characters with at least three of: upper case, lower
case, digits, symbols. Pick a stronger value and **recreate** the container
(`docker rm -f sqldb`, then run again). Setting the variable on an existing
container has no effect.

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
  sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
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

## EOF from host sqlcmd

An immediate `EOF` from host `sqlcmd` usually means either the engine is still
starting or the shell changed the `-P` password argument while pasting it.

First verify the container with the bundled client:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
  -Q "SELECT 1;"
```

If that succeeds, retry from the host with the same short timeout:

```bash
sqlcmd -S localhost,1433 -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 -Q "SELECT 1;"
```

In PowerShell, retype the password quotes as plain ASCII `"` characters and
make sure there is no leading space inside the password string. A pasted smart
quote or a leading space inside the password string can trigger `EOF`.

## Wrong image (EngineEdition is not 5)

If `SELECT SERVERPROPERTY('EngineEdition')` does not return `5`, or
`SERVERPROPERTY('Edition')` is not `'SQL Azure'`, you started the SQL Server image. Stop it and start the Azure SQL Database image from
`image-and-registry.md`:

```bash
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "1433:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
```

## Do not

- Do not retry connecting without `-b -l 2`.
- Do not use `USE` to fix a "wrong database" error.
- Do not switch to `mcr.microsoft.com/mssql/server` to "make it work".
