# Azure Functions + Azure SQL snippets

## Contents

- Project setup
- local.settings.json
- C# isolated: HTTP GET (input) and POST upsert (output)
- C# isolated: SQL trigger
- JavaScript: input / output / trigger
- Python v2: input / output / trigger
- Run and verify locally

## Project setup

```bash
func init MyApi --worker-runtime dotnet-isolated   # or node / python / powershell
cd MyApi

# .NET isolated: add the SQL bindings package
dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Sql
# JS/TS/Python/PowerShell: ensure host.json has the extension bundle [4.0.0, 5.0.0)

func new --name Books        # choose an HTTP trigger template, then add bindings below
```

## local.settings.json

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

## C# isolated: HTTP GET (input) and POST upsert (output)

```csharp
public class ToDoItem
{
    public Guid Id { get; set; }
    public string title { get; set; }
    public bool? completed { get; set; }
}

// GET /api/todo  -> reads rows via the SQL input binding
[Function("GetToDo")]
public static IEnumerable<ToDoItem> Get(
    [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "todo")] HttpRequestData req,
    [SqlInput("SELECT * FROM dbo.ToDo", "SqlConnectionString")] IEnumerable<ToDoItem> items)
    => items;

// POST /api/todo  -> upserts via the SQL output binding (table needs a PK)
[Function("PostToDo")]
[SqlOutput("dbo.ToDo", "SqlConnectionString")]
public static async Task<ToDoItem> Post(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "todo")] HttpRequestData req)
    => await req.ReadFromJsonAsync<ToDoItem>();
```

## C# isolated: SQL trigger

```csharp
[Function("ToDoTrigger")]
public static void Run(
    [SqlTrigger("[dbo].[ToDo]", "SqlConnectionString")]
    IReadOnlyList<SqlChange<ToDoItem>> changes,
    FunctionContext context)
{
    var log = context.GetLogger("ToDoTrigger");
    foreach (var change in changes)
        log.LogInformation($"{change.Operation}: {change.Item.Id} {change.Item.title}");
}
```

## JavaScript: input / output / trigger

`function.json` for the trigger:

```json
{
  "bindings": [
    { "name": "todoChanges", "type": "sqlTrigger", "direction": "in",
      "tableName": "dbo.ToDo", "connectionStringSetting": "SqlConnectionString" }
  ]
}
```

`index.js`:

```javascript
module.exports = async function (context, todoChanges) {
  context.log(`SQL Changes: ${JSON.stringify(todoChanges)}`);
};
```

Input/output bindings use `"type": "sql"` (direction `in`) and `"type": "sql"`
(direction `out`) with `commandText` / target table and the same
`connectionStringSetting`.

## Python v2: input / output / trigger

```python
import azure.functions as func
app = func.FunctionApp()

@app.function_name(name="ToDoTrigger")
@app.sql_trigger(arg_name="todo",
                 table_name="ToDo",
                 connection_string_setting="SqlConnectionString")
def todo_trigger(todo: str) -> None:
    import json, logging
    logging.info("SQL Changes: %s", json.loads(todo))
```

## Run and verify locally

```bash
# 1. Container running + appdb + dbo.ToDo table with a PRIMARY KEY on Id.
# 2. For the trigger, enable Change Tracking (see event-driven.md).
func start           # http://localhost:7071/api/<route>

# API check
curl http://localhost:7071/api/todo
curl -X POST http://localhost:7071/api/todo \
  -H 'Content-Type: application/json' \
  -d '{"Id":"11111111-1111-1111-1111-111111111111","title":"buy milk","completed":false}'

# Trigger check: insert a row, watch func output log the Insert change
docker exec -i sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa \
  -P YourStr0ng_Passw0rd -C -b -d appdb -Q \
  "INSERT INTO dbo.ToDo(Id,title,completed) VALUES (NEWID(),N'via trigger',0);"
```
