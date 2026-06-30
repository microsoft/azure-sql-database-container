# AI Prompt: Convert a SQL Server box-image setup to the Azure SQL Database container

**Role:** You are an expert agent converting the current project from the SQL Server box image (`mcr.microsoft.com/mssql/server`) to the Azure SQL Database container, so local development is Azure-faithful (the same engine you run in Azure SQL Database in the cloud).

**Purpose:** Detect the box image, swap it for the Azure SQL Database engine image, fix the connection model, flag features that exist only in the box product, and verify you are on the real engine.

**Scope:** A project that already runs `mcr.microsoft.com/mssql/server` (a `docker run`, a `docker-compose.yml`, a Dockerfile, or a Dev Container) with an `sa` login.

Read the entire instruction set before executing.

---

## Instructions

### 1. Detect the box image

Search the repo for `mcr.microsoft.com/mssql/server` (and `mssql/server`) in `docker-compose*.yml`, Dockerfiles, run scripts, CI, and `.devcontainer/`. Note where the image, the `ACCEPT_EULA`/`MSSQL_SA_PASSWORD` env, and the connection string live.

### 2. Sign in to the preview registry (Path B)

The engine image is in a private preview registry. Sign in with the shared, pull-only username and password provided when you sign up at https://aka.ms/sqldbcontainerpreview-signup (they may be rotated during the preview):

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>
```

### 3. Swap the image

Replace `mcr.microsoft.com/mssql/server:<tag>` with the engine image:

```
sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

Keep `ACCEPT_EULA=Y` and the `sa` password. The image is x64 only; on a non-x64 host add `--platform linux/amd64` (Docker) or `platform: linux/amd64` (compose). In a shell snippet that adds the flag conditionally, build it as an array so it is safe in both bash and zsh:

```bash
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker run -d --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
    -p 1433:1433 sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

### 4. Fix the connection model

The Azure SQL Database engine does **not** auto-create databases, and the connection model differs from the box product. Provision the application database on a `master` connection, then point the app at that database:

```bash
# The engine is not ready the instant docker run returns; retry until it accepts connections.
# -b makes a SQL error set the exit code so a transient startup error (Msg 913) is retried, not masked.
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
    -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do
  sleep 2
done
```

Re-point connection strings from `Database=master` to `Database=appdb`. Do not switch databases with `USE`: in a user-database (SDS) session `USE` returns `Msg 40508`, exactly as in Azure SQL Database in the cloud (a `master` connection is a non-SDS provisioning session where it appears to work, but `master` is for provisioning only). Select the database in the connection string.

### 5. Flag box-only features to remove

These exist in the SQL Server box product but **not** in Azure SQL Database; remove or replace any usage so the app works against the engine and the cloud:

- SQL Server Agent jobs (`msdb.dbo.sp_add_job`, etc.)
- FILESTREAM / FileTable
- Full Service Broker across instances
- Cross-server distributed transactions and linked servers
- Windows Authentication / NTLM (use the `sa` login locally, Microsoft Entra in the cloud)

### 6. Verify you are on the real engine

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
    -d appdb -Q "SELECT SERVERPROPERTY('EngineEdition') AS EngineEdition, SERVERPROPERTY('Edition') AS Edition;"
```

Expect `EngineEdition = 5` and `Edition = SQL Azure`. The box image returns different values; if you see those, the image was not swapped.

---

## Validation rules

- No `mcr.microsoft.com/mssql/server` remains in compose, Dockerfiles, run scripts, CI, or Dev Container.
- `--platform linux/amd64` is added on non-x64 hosts (compose `platform:` or the array-form shell snippet).
- `appdb` is created on a `master` connection before the app connects with `Database=appdb`; no `USE` to switch databases.
- At least one box-only feature is flagged (or the app confirmed not to use any).
- `EngineEdition = 5` against the running container.

## Do not

- Do not keep the box image or call arm64 / Apple Silicon "supported".
- Do not develop against `master`; do real work on the user database.
- Do not commit the SA password or the registry credentials.
