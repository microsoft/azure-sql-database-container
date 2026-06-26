# Azure SQL Database Skills (azuresql-db-*)

**This is the actual Azure SQL Database engine running locally, with cloud parity.** Not an emulator, not a look-alike, not the SQL Server box image. It is the same managed cloud engine you run in Azure, packaged as a container for local development. **No competitor runs the managed cloud engine locally.**

You can prove the identity from any connection:

```sql
SELECT SERVERPROPERTY('EngineEdition');  -- 5
SELECT SERVERPROPERTY('Edition');        -- 'SQL Azure'
```

EngineEdition `5` and Edition `'SQL Azure'` are the cloud engine's fingerprint. The SQL Server box image (`mcr.microsoft.com/mssql/server`) returns different values and is **not** the same product. If an agent was about to reach for that box image, it should stop and use this instead.

> Status: **Private Preview.** Registry, image tag, and credentials are provisional and may change.

---

## What's in this collection

| Skill | What it does |
| --- | --- |
| **azuresql-db-container** | Start the Azure SQL Database engine locally the correct way: free-port selection, conditional `--platform linux/amd64` on non-x64 hosts, ready-wait retry loop, and `CREATE DATABASE appdb` provisioning. The foundation every other skill builds on. |
| **azuresql-db-from-sql-server** | Migrate a workflow off the SQL Server box image (`mcr.microsoft.com/mssql/server`) onto the real cloud engine. Swaps the image, fixes the connection model, and verifies EngineEdition=5 / Edition='SQL Azure'. |
| **azuresql-db-local-to-cloud** | Take a database that works against the local engine and move it to Azure SQL Database in the cloud. Because it is the same engine, parity is the default, not a porting exercise. |
| **azuresql-db-schema-migration** | Apply and version schema changes against the engine: idempotent DDL, ordered migration scripts, run against `appdb` (never `master`). |
| **azuresql-db-import** | Load data into `appdb` after provisioning: bulk and script-based import. Does **not** rely on auto-run init directories (that convention is not honored here). |
| **azuresql-db-rag** | Build retrieval-augmented generation on the engine's native `VECTOR(n)` type and `VECTOR_DISTANCE('cosine', a, b)`, using full-scan top-k while DiskANN vector indexing is still in development. |
| **azuresql-db-ci** | Run the engine in continuous integration: ephemeral container, ready-wait, provision, seed, test, tear down. Fails closed on the wrong image. |
| **azuresql-db-sidecar** | Run the engine as a sidecar alongside an app (compose-style), with `platform: linux/amd64` on non-x64 hosts and a single `SQL_CONNECTION_STRING` contract. |
| **azuresql-db-scaffold** | Scaffold a new app wired to the engine: connection string via one `SQL_CONNECTION_STRING` env var, provisioning step, and seed step in the correct order. |

---

## INSTALL

### `npx skills add` (cross-agent, skills.sh)

The portable way. Works across agents that follow the skills.sh convention:

```bash
npx skills add azuresql-db-container
npx skills add azuresql-db-from-sql-server azuresql-db-local-to-cloud \
  azuresql-db-schema-migration azuresql-db-import azuresql-db-rag \
  azuresql-db-ci azuresql-db-sidecar azuresql-db-scaffold
```

### Claude Code (`.claude/skills/`)

Drop each skill directory into `.claude/skills/` at the root of your project (or `~/.claude/skills/` to make it available everywhere):

```bash
mkdir -p .claude/skills
cp -R skills/azuresql-db-* .claude/skills/
```

### INSTALL MATRIX

Same skills, per-agent install location (mirrors how Google, Supabase, and Neon ship their collections):

| Agent | Install location |
| --- | --- |
| Claude Code | `.claude/skills/` (project) or `~/.claude/skills/` (global) |
| Claude Desktop | `~/Library/Application Support/Claude/skills/` |
| Cursor | `.cursor/skills/` (project) |
| GitHub Copilot in VS Code | `.github/skills/` |
| Codex | `~/.codex/skills/` |
| Gemini CLI | `~/.gemini/skills/` |

`npx skills add` targets the active agent automatically; the table above is for manual placement.

---

## Accuracy baseline

Every skill in this collection holds these facts true. If a generated workflow contradicts any of them, it is wrong.

- **Image:** `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest` (x64 / linux/amd64, private preview registry). Sign in first: `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>` (enter the password when prompted). The shared, pull-only credentials are not in any doc; request them through the early-access feedback channel. Treat them as secrets and do not redistribute; they are pull-only and may rotate during the preview. It is **not** `mcr.microsoft.com/mssql/server`.
- **EULA:** `ACCEPT_EULA=Y` is required.
- **Password:** a complex `MSSQL_SA_PASSWORD` (8+ chars, upper/lower/digit/symbol) is required.
- **Port:** the engine listens on **1433**.
- **Identity:** `SERVERPROPERTY('EngineEdition')` = **5**, `SERVERPROPERTY('Edition')` = **'SQL Azure'**.

### Platform

The image is x64 only; there is no arm64 image. On a non-x64 host, add `--platform linux/amd64` (Docker) or `platform: linux/amd64` (compose). Apple Silicon / arm64 is not "supported"; it runs only under x64 emulation.

### Connection model (three facts that bite)

1. The engine does **not** auto-create databases on connect. Run `CREATE DATABASE appdb` on a **master** connection before connecting with `Database=appdb`.
2. Avoid `USE` to switch databases. In a user-database (SDS) session (the Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as in Azure SQL Database in the cloud. A `master` connection is a non-SDS provisioning session where the Azure statement filter is not enforced, so `USE` (and `BACKUP`/`RESTORE`) appear to work there, but `master` is for provisioning only, not application work. Always select the target database in the connection string (`Database=appdb`, or `-d appdb` for sqlcmd).
3. A `master` connection is for provisioning only. Do real work on the user database.

### Readiness

The engine is **not** ready the instant `docker run` returns. Wait with a retry loop using `sqlcmd -C -b -l 2` (the `-b` makes a SQL error set the exit code, so transient startup errors like Msg 913 are retried, not masked) and provision `appdb` inside that same loop. Never poll bare `sqlcmd` without `-l`.

### Seeding

The image does **not** auto-run `/docker-entrypoint-initdb.d/*.sql`. That is a Postgres/MySQL convention and is not honored here. Seed by running `sqlcmd -d appdb -i seed.sql` **after** provisioning `appdb`.

### Connection strings

Standardize on:

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=...;TrustServerCertificate=true
```

Use `User Id=` / `Password=` / `Database=` (not `Uid=` / `Pwd=`). For `sqlcmd`, pass `-C` to trust the self-signed cert. Apps read the connection string from a single `SQL_CONNECTION_STRING` env var.

### Vectors

Native `VECTOR(n)` column type and `VECTOR_DISTANCE('cosine', a, b)`. Insert with `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))` where **n is a literal, never a bind parameter** (a parameter dimension fails with "Incorrect syntax near '@P3'"). The inner `CAST(? AS NVARCHAR(MAX))` is required because a real embedding's JSON string (~16 KB for 768 dims) exceeds the driver's 4000-char threshold and is otherwise sent as ntext, which the engine rejects ("Explicit conversion from data type ntext to vector is not allowed (529)"). `CREATE VECTOR INDEX` (DiskANN) is still in development; use full-scan top-k for now.

### Canonical start recipe

Free port + conditional platform + ready-wait + provision `appdb`:

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
