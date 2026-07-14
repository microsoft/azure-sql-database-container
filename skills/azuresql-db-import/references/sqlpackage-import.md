# SqlPackage import reference

Depth for importing a `.bacpac` / `.dacpac` into the local Azure SQL Database
container. The SKILL.md body has the happy path; this covers install, flags, a
fallback, and troubleshooting.

## Contents

- [Install SqlPackage](#install-sqlpackage)
- [Action cheat sheet](#action-cheat-sheet)
- [Full import command and useful flags](#full-import-command-and-useful-flags)
- [Container-based fallback (no local SqlPackage)](#container-based-fallback-no-local-sqlpackage)
- [Common errors and fixes](#common-errors-and-fixes)
- [PaaS restriction details](#paas-restriction-details)

## Install SqlPackage

SqlPackage is a cross-platform dotnet tool.

```bash
dotnet tool install -g microsoft.sqlpackage
```

Confirm it is on PATH:

```bash
SqlPackage /version
```

If `SqlPackage` is not found after install, add the dotnet tools directory to
PATH (`$HOME/.dotnet/tools` on macOS/Linux).

## Action cheat sheet

| You have | Goal | Action |
|----------|------|--------|
| `.bacpac` | schema + data into the container | `/Action:Import` |
| `.dacpac` | schema only into the container | `/Action:Publish` |
| live source DB | produce a `.bacpac` to import later | `/Action:Export` |
| live source DB | produce a `.dacpac` (schema) | `/Action:Extract` |

This skill is about getting data INTO the container, so you will mostly use
`Import` (bacpac) and `Publish` (dacpac).

## Full import command and useful flags

Always provision `appdb` on a master connection first (see SKILL.md Step 0), then:

```bash
SqlPackage /Action:Import \
  /SourceFile:"./mydatabase.bacpac" \
  /TargetConnectionString:"Server=localhost,$HOST_PORT;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true" \
  /p:CommandTimeout=0
```

Useful flags:

- `/p:CommandTimeout=0`: no per-statement timeout (large data loads).
- `/p:DisableIndexesForDataPhase=true`: faster bulk load on big tables.
- `/d:true`: verbose diagnostics if an import fails and you need detail.
- For Publish (dacpac): `/p:BlockOnPossibleDataLoss=false` only if you accept
  data loss on an existing populated target.

Connection string rules (canonical): use `Server=localhost,$HOST_PORT`,
`User Id=`, `Password=`, `Database=appdb`, `TrustServerCertificate=true`. Do NOT
use `Uid=`/`Pwd=`. Never target `Database=master` for the import.

## Container-based fallback (no local SqlPackage)

If you cannot install SqlPackage on the host, copy the file into the container
and run sqlcmd-based validation there, or run SqlPackage from a dotnet SDK
container on the same Docker network. The simplest supported path is to install
SqlPackage on the host; the container image does not ship SqlPackage.

To make a local file reachable, mount it when starting the container (add to the
`docker run` line):

```bash
  -v "$PWD/mydatabase.bacpac:/import/mydatabase.bacpac:ro"
```

Then run SqlPackage from a machine that has it, targeting `localhost,$HOST_PORT`.

## Common errors and fixes

- **"Could not connect" / login timeout**: the engine was not ready, or the wrong
  port. Re-run the readiness retry loop; confirm `localhost,$HOST_PORT`.
- **Target database does not exist**: provision it on master first
  (`IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;`). Import does not create it.
- **Msg 40508 (`USE` statement not supported)**: a script tried `USE <db>`.
  Avoid `USE` to switch databases. In a user-database (SDS) session (the
  Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as
  in Azure SQL Database in the cloud. A `master` connection is a non-SDS
  provisioning session where the Azure statement filter is not enforced, so `USE` appears to work there, but `master` is for provisioning
  only, not application work. Always select the target database in the connection
  string (`Database=appdb`, or `-d appdb` for sqlcmd).
- **"Element ... is not supported in Microsoft Azure SQL Database v12"**: the
  source uses a SQL Server feature Azure SQL DB (Engine Edition 5) does not
  support. Remove or refactor that object, or extract a filtered dacpac.
- **Blocking on possible data loss (Publish)**: expected on a populated target;
  use a fresh empty `appdb` or accept the override flag deliberately.

## PaaS restriction details

Because this is the Azure SQL Database engine (`EngineEdition = 5`,
`Edition = 'SQL Azure'`), SQL Server-only features will not import:

- Cross-database three-part-name references and most cross-DB queries.
- `USE <db>`: avoid `USE` to switch databases. In a user-database (SDS) session
  (the Azure-faithful context where you develop), `USE` returns `Msg 40508`,
  exactly as in Azure SQL Database in the cloud. A `master` connection is a
  non-SDS provisioning session where the Azure statement filter is not enforced, so
  `USE` appears to work there, but `master` is for
  provisioning only, not application work. Always select the target database in the
  connection string (`Database=appdb`, or `-d appdb` for sqlcmd).
- Server-scoped objects: SQL Agent jobs, server logins, linked servers,
  filestream, some CLR, explicit filegroup/physical-file placement.
- Unsupported collations or compatibility-level features from the source.

After import, validate: `SERVERPROPERTY('EngineEdition')` must be `5`, then
compare table counts and key row counts against the source. This is the Private
Preview supported import path; treat the SqlPackage log as the source of truth
for what was skipped.

See the **azuresql-db-container** skill for the full connection model, readiness
details, and the start recipe.
