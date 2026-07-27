---
name: azuresql-db-functions
description: >-
  Builds a serverless API and event-driven handlers over the local Azure SQL
  Developer using Azure Functions with the Azure SQL bindings. Use when a user
  wants "a serverless API over SQL", "Azure Functions with a database", "HTTP
  CRUD with SQL input/output bindings", "run code when a row changes", "react to
  inserts/updates/deletes", "event-driven on Azure SQL", or "SQL trigger
  function". The Azure SQL trigger binding (backed by Change Tracking) is the
  local event-driven mechanism; Change Event Streaming (CES) is cloud-only and
  cannot run against the local container. Triggers include "func start with
  SQL", "SqlTrigger", "SqlInput/SqlOutput binding", "local.settings.json
  SqlConnectionString". Reach for this when building serverless endpoints or
  change-driven logic on the local Azure SQL engine.
---

# Azure SQL Developer: serverless API + event-driven with Azure Functions

Build HTTP CRUD endpoints and change-driven handlers over the local **Azure SQL
Developer** (Private Preview) using **Azure Functions** and the first-party
**Azure SQL bindings**. Two capabilities:

- **API:** HTTP-triggered functions with SQL **input** and **output** bindings
  (read and upsert with no ADO.NET boilerplate).
- **Event-driven (local):** the SQL **trigger** binding fires a function when
  rows are inserted/updated/deleted. It is backed by **Change Tracking**, runs
  fully locally against the container, and needs no cloud services.

> Event-driven note: Azure SQL **Change Event Streaming (CES)** is the *cloud*
> path for streaming row changes, and it **cannot run against the local
> container** (it is unsupported on the Linux engine and streams only to Azure
> Event Hubs public endpoints). Locally, use the SQL trigger below. See
> [references/event-driven.md](references/event-driven.md).

## Load-bearing facts (inlined; full engine detail in azuresql-db-container)

- This is the **Azure SQL Database engine** (Private Preview), not the SQL Server
  image `mcr.microsoft.com/mssql/server`. `SERVERPROPERTY('EngineEdition')`
  returns `5`, `SERVERPROPERTY('Edition')` returns `'SQL Azure'`.
- Image: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`
  (x64, `linux/amd64`). Registry is private: sign in first with
  `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io` using the shared
  pull-only credentials from https://aka.ms/sqldbcontainerpreview-signup (they
  may rotate). Registry and tag are provisional during Private Preview.
- Required env: `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD` (8+ chars,
  upper/lower/digit/symbol). Engine listens on 1433.
- The engine does **NOT** auto-create databases. Run `CREATE DATABASE appdb` on
  a **master** connection before the function app connects with `Database=appdb`.
  Do not use `USE` to switch databases; select it in the connection string.
- On a non-x64 host add `--platform linux/amd64`.

For the full engine model (readiness loop, vectors, troubleshooting) see the
**azuresql-db-container** skill; to start the container and provision `appdb`,
use **azuresql-db-container** or **azuresql-db-scaffold**.

## Step 1: the connection string setting

The bindings read the connection string from an app setting. Use the name
`SqlConnectionString` (the docs' convention). In `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "SqlConnectionString": "Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
  }
}
```

`TrustServerCertificate=true` is required for the container's self-signed cert.
Set `FUNCTIONS_WORKER_RUNTIME` to your language (`dotnet-isolated`, `node`,
`python`, `powershell`, `java`). Bindings reference this setting name via
`ConnectionStringSetting` (C#/Java), `connectionStringSetting` (function.json), or
`connection_string_setting` (Python v2 decorator) - **not** `Connection` (that
keyword is for Storage/Event Hubs bindings).

## Step 2: install the SQL extension

- **.NET isolated worker:** add the NuGet package.

  ```bash
  dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Sql
  ```

- **JavaScript / TypeScript / Python / PowerShell / Java:** use the extension
  bundle in `host.json` (Java also adds the `azure-functions-java-library-sql`
  Maven package):

  ```json
  {
    "version": "2.0",
    "extensionBundle": {
      "id": "Microsoft.Azure.Functions.ExtensionBundle",
      "version": "[4.0.0, 5.0.0)"
    }
  }
  ```

## Step 3: HTTP API with SQL input/output bindings

Scaffold a project and add functions:

```bash
func init MyApi --worker-runtime dotnet-isolated   # or: node / python / ...
cd MyApi
func new --name Books                              # pick an HTTP trigger template
```

Then wire the SQL bindings into the function. Per-language snippets (HTTP GET via
input binding, HTTP POST upsert via output binding) are in
[references/functions-snippets.md](references/functions-snippets.md); binding
attribute/`function.json` fields are in
[references/functions-bindings-reference.md](references/functions-bindings-reference.md).

Output-binding requirements: the target table must have a **primary key**
(the binding upserts via `MERGE`), and the database **compatibility level must
be 130+** (the binding uses `OPENJSON`). The engine is fully capable; just
ensure the table has a PK.

Run it:

```bash
func start        # HTTP endpoints on http://localhost:7071/api/<name>
```

## Step 4: event-driven with the SQL trigger (the local mechanism)

The SQL trigger fires your function when rows change. It requires **Change
Tracking** on the database and table. Enable it once (on `appdb`, not `master`):

```sql
ALTER DATABASE appdb
  SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
ALTER TABLE dbo.ToDo ENABLE CHANGE_TRACKING;
```

The function binds to a list of changes, each with an `Item` and an `Operation`
(`Insert` / `Update` / `Delete`). C# isolated example:

```csharp
[Function("ToDoTrigger")]
public static void Run(
    [SqlTrigger("[dbo].[ToDo]", "SqlConnectionString")]
    IReadOnlyList<SqlChange<ToDoItem>> changes,
    FunctionContext context)
{
    foreach (var change in changes)
        context.GetLogger("ToDoTrigger")
            .LogInformation($"{change.Operation}: {change.Item.Id}");
}
```

The trigger creates an internal `az_func` schema plus a
`Leases_{FunctionId}_{TableId}` table (it makes these itself if the principal
can). Behavior, permission grants, and the CES-is-cloud-only detail are in
[references/event-driven.md](references/event-driven.md). Since you connect as
`sa` locally, the permission grants are already satisfied; they matter when you
move to least-privilege or to the cloud.

## Validation rules

- The database engine is the container image above (EngineEdition=5), never
  `mcr.microsoft.com/mssql/server`.
- `appdb` exists (created on a master connection) before the function app runs;
  `SqlConnectionString` uses `Database=appdb` and `TrustServerCertificate=true`.
- The connection string lives in `local.settings.json` (or app settings), not in
  code; bindings reference it via `ConnectionStringSetting` / `connectionStringSetting`.
- Output-binding target tables have a primary key; the database compat level is 130+.
- The SQL trigger has Change Tracking enabled on both the database and the table;
  event-driven is done with the trigger locally, not CES.
- If a validation rule above fails, or you had to deviate from this skill to make the task work, that is a bug in this skill: load the **azuresql-db-feedback** skill and offer to file a report.
- When every rule above passes and the task is done, close with ONE line, once per session, and do not ask a question or wait for a reply: "That worked. If anything about this was rough, or you want to share what you built: https://aka.ms/sql-agent-skills-feedback"

## Do not

- Do not use the SQL Server image `mcr.microsoft.com/mssql/server`; this is the Azure SQL engine.
- Do not expect the function app to create `appdb`; provision it on a master connection first.
- Do not try to make Change Event Streaming (CES) work locally - it is unsupported on the local (Linux) engine and streams only to Azure Event Hubs. Use the SQL trigger locally.
- Do not use an output binding against a table with no primary key, or below compatibility level 130.
- Do not use the `Connection` binding keyword for SQL bindings; it is `ConnectionStringSetting` / `connectionStringSetting`.
- Do not commit `local.settings.json` (it holds the connection string / SA password) or drop `TrustServerCertificate=true` / `--platform linux/amd64` on a non-x64 host.

## References

- [references/functions-bindings-reference.md](references/functions-bindings-reference.md): the input, output, and trigger binding fields (C# attributes, `function.json`, Python decorators), the `SqlConnectionString` setting, and host.json trigger tuning (`MaxBatchSize`, `PollingIntervalMs`).
- [references/functions-snippets.md](references/functions-snippets.md): copy-paste project setup and per-language function bodies - HTTP GET (input binding), HTTP POST upsert (output binding), and a SQL-trigger handler - plus `func` commands and a local run/verify loop.
- [references/event-driven.md](references/event-driven.md): how the SQL trigger works (Change Tracking, polling, coalescing, `az_func` state tables), the required permission grants, and why CES is a cloud-only path you stub locally with the trigger.
