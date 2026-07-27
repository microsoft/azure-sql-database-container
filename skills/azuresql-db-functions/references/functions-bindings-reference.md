# Azure SQL bindings reference

## Contents

- The three bindings
- Connection setting
- Input binding fields
- Output binding fields
- Trigger binding fields
- host.json trigger tuning

## The three bindings

| Binding | Direction | Use |
| --- | --- | --- |
| SQL input | in | Read rows (a query or a stored procedure) into the function |
| SQL output | out | Upsert one or more rows (via `MERGE`) |
| SQL trigger | (trigger) | Fire the function when rows change (Change Tracking) |

Install: `.NET` isolated → NuGet `Microsoft.Azure.Functions.Worker.Extensions.Sql`;
JS/TS/Python/PowerShell → the `host.json` extension bundle `[4.0.0, 5.0.0)`;
Java → the bundle plus Maven `azure-functions-java-library-sql`.

## Connection setting

Every binding names an app setting that holds the connection string. The docs'
convention is `SqlConnectionString` in `local.settings.json`. Reference it via:

- C# / Java attribute property: `ConnectionStringSetting = "SqlConnectionString"`
- `function.json` (JS/PowerShell/Python v1): `"connectionStringSetting": "SqlConnectionString"`
- Python v2 decorator: `connection_string_setting="SqlConnectionString"`

It is **not** the `Connection` property (that belongs to Storage/Event Hubs
bindings). Locally the value is the container connection string with
`TrustServerCertificate=true`.

## Input binding fields

| Field | Meaning |
| --- | --- |
| `CommandText` | The T-SQL query, table name, or stored procedure |
| `CommandType` | `Text` (query, default) or `StoredProcedure` |
| `Parameters` | Parameters passed to the command (e.g. from route/query) |
| `ConnectionStringSetting` | The app setting name (`SqlConnectionString`) |

Bind the input to a collection of your row type; the function receives the query
result.

## Output binding fields

| Field | Meaning |
| --- | --- |
| `CommandText` | The target table, e.g. `dbo.ToDo` |
| `ConnectionStringSetting` | The app setting name (`SqlConnectionString`) |

The output binding **upserts** with `MERGE`, so:

- the target table **must have a primary key** (one or more columns);
- the database **compatibility level must be 130+** (it uses `OPENJSON`);
- it needs `SELECT` (plus insert/update) on the table;
- `NTEXT` / `TEXT` / `IMAGE` target columns are unsupported.

Assign the rows to the output parameter; the binding writes them on return.

## Trigger binding fields

| Field | Meaning |
| --- | --- |
| `TableName` | The monitored table, e.g. `[dbo].[ToDo]` |
| `ConnectionStringSetting` | The app setting name (`SqlConnectionString`) |
| `LeasesTableName` | Optional; defaults to `Leases_{FunctionId}_{TableId}` in schema `az_func` |

The parameter type is a list of change objects, each exposing:

- `Item` - the changed row, typed to your model (matches the table schema);
- `Operation` - `Insert`, `Update`, or `Delete` (from `SqlChangeOperation`).

C# isolated attribute: `[SqlTrigger("[dbo].[ToDo]", "SqlConnectionString")]`
bound to `IReadOnlyList<SqlChange<T>>`. `function.json` equivalent: `"type":
"sqlTrigger"`, `"direction": "in"`, `"tableName"`, `"connectionStringSetting"`.

Requires Change Tracking on the database and table (see event-driven.md).

## host.json trigger tuning

Under `extensions.Sql`:

| Setting | Default | Meaning |
| --- | --- | --- |
| `MaxBatchSize` | 100 | Max changes delivered per invocation |
| `PollingIntervalMs` | 1000 | Delay between polls (ms) |
| `MaxChangesPerWorker` | 1000 | Pending-change ceiling per worker (scaling) |

```json
{
  "version": "2.0",
  "extensions": { "Sql": { "MaxBatchSize": 300, "PollingIntervalMs": 1000 } }
}
```

The same values can be set in `local.settings.json` as
`Sql_Trigger_MaxBatchSize`, `Sql_Trigger_PollingIntervalMs`,
`Sql_Trigger_MaxChangesPerWorker`.
