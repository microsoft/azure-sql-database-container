# AI Prompt: Build a serverless API and event-driven handlers over Azure SQL Developer with Azure Functions

**Role:** You are an expert agent building Azure Functions over the project's local Azure SQL Developer database using the first-party Azure SQL bindings.

**Purpose:** Create HTTP CRUD endpoints (SQL input/output bindings) and, where the app needs to react to data changes, an event-driven handler using the SQL trigger binding (backed by Change Tracking). Everything runs locally against the container; no cloud services.

**Scope:** Assumes the Azure SQL Developer container is running and `appdb` exists. If it is not running, start it and provision `appdb` first (the engine does not auto-create databases). Change Event Streaming (CES) is cloud-only and out of scope for local work.

Read the entire instruction set before executing.

---

## Instructions

### 1. Confirm the database and set the connection string

The database is the Azure SQL engine image `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest` (EngineEdition=5), not `mcr.microsoft.com/mssql/server`. Put the connection string in `local.settings.json` under the setting name `SqlConnectionString`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "SqlConnectionString": "Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
  }
}
```

Bindings reference it via `ConnectionStringSetting` / `connectionStringSetting` (not `Connection`).

### 2. Install the SQL extension

- .NET isolated: `dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Sql`
- JS/TS/Python/PowerShell: the `host.json` extension bundle `[4.0.0, 5.0.0)`

### 3. HTTP API with input/output bindings

Scaffold (`func init`, `func new`), then add a SQL **input** binding to read and a SQL **output** binding to upsert. Output-binding target tables must have a **primary key** (the binding upserts via `MERGE`) and the database compat level must be **130+**.

### 4. Event-driven with the SQL trigger (the local mechanism)

Enable Change Tracking on `appdb` and the table, then bind a function to the changes:

```sql
ALTER DATABASE appdb SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);
ALTER TABLE dbo.ToDo ENABLE CHANGE_TRACKING;
```

```csharp
[Function("ToDoTrigger")]
public static void Run(
    [SqlTrigger("[dbo].[ToDo]", "SqlConnectionString")]
    IReadOnlyList<SqlChange<ToDoItem>> changes, FunctionContext context)
{ /* each change has .Item and .Operation (Insert/Update/Delete) */ }
```

The trigger creates an internal `az_func` schema + leases table; as `sa` locally the permissions are already satisfied.

### 5. Run and confirm

```bash
func start        # http://localhost:7071/api/<route>
curl http://localhost:7071/api/todo
# insert a row and watch the trigger function log the Insert change
```

---

## Validation rules

- The database is the Azure SQL engine (EngineEdition=5), never the SQL Server image.
- `appdb` exists before the function app runs; `SqlConnectionString` uses `Database=appdb` and `TrustServerCertificate=true`.
- The connection string lives in `local.settings.json` / app settings, not in code.
- Output-binding target tables have a primary key and compat level 130+.
- Event-driven uses the SQL trigger with Change Tracking enabled on the database and table; CES is not used locally.

## Do not

- Do not use the SQL Server image `mcr.microsoft.com/mssql/server`.
- Do not attempt to run Change Event Streaming (CES) locally; it is unsupported on the local engine and streams only to Azure Event Hubs.
- Do not use an output binding against a table with no primary key or below compat level 130.
- Do not commit `local.settings.json`; it holds the connection string and SA password.
