# Retry and pooling snippets

Copy-pasteable connection pooling and transient-only retry wired to Azure SQL Developer. Every
snippet assumes the container is running and **appdb is already provisioned on a master
connection** (see the start recipe in SKILL.md). Apps read `SQL_CONNECTION_STRING`. Image is
`sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest` (NOT the
`mcr.microsoft.com/mssql/server` SQL Server image). The local container rarely drops, so test
these against the behavior you will see in the cloud: they are what keeps the same code alive
when Azure SQL Database throttles or fails over.

## Contents

- [Provision appdb first](#provision-appdb-first)
- [.NET (Microsoft.Data.SqlClient + EF Core)](#net-microsoftdatasqlclient--ef-core)
- [Node (mssql / tedious)](#node-mssql--tedious)
- [Python (pyodbc + tenacity)](#python-pyodbc--tenacity)

## Provision appdb first

The engine does not auto-create databases. Create appdb on a master connection before any
snippet below connects with `Database=appdb`:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

## .NET (Microsoft.Data.SqlClient + EF Core)

### Pooling and retry via connection-string keywords

Pooling is on by default. Bound the pool and warm a few connections; the `ConnectRetry*`
keywords let the driver transparently reopen an idle connection that was dropped.

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true;Pooling=true;Max Pool Size=100;Min Pool Size=2;ConnectRetryCount=3;ConnectRetryInterval=10
```

- `Pooling=true` keeps one pool per distinct connection string.
- `Max Pool Size=100` (the default) bounds concurrency; raise or lower to match real load, never
  leave it effectively unbounded.
- `Min Pool Size=2` keeps a couple of connections warm.
- `ConnectRetryCount` / `ConnectRetryInterval` (seconds) reopen a broken idle connection. These
  cover connection reopen only, not command-level transient faults; use EF Core below for those.

Read the single env var and register the context:

```csharp
var conn = Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING")
           ?? throw new InvalidOperationException("SQL_CONNECTION_STRING not set");
```

### EF Core: EnableRetryOnFailure (the SqlServer execution strategy)

This is the recommended retry for .NET. It retries only the known Azure SQL transient error
numbers, with exponential backoff, and it makes retries safe when work runs through its
execution strategy.

```csharp
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(conn, sql =>
        sql.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null)));   // null = the built-in transient list
```

Non-idempotent writes: wrap the whole unit of work so the strategy can re-run it as a unit
(user-initiated transactions must be executed through the strategy):

```csharp
var strategy = db.Database.CreateExecutionStrategy();
await strategy.ExecuteAsync(async () =>
{
    await using var tx = await db.Database.BeginTransactionAsync();
    db.Widgets.Add(new Widget { Name = name });   // parameterized by EF
    await db.SaveChangesAsync();
    await tx.CommitAsync();
});
```

Do not add a second hand-rolled retry loop around EF Core calls; you would retry the retries.

## Node (mssql / tedious)

Install: `npm install mssql`. Configure a bounded pool once and reuse it for the whole process.

```js
import sql from "mssql";

// Parse the single SQL_CONNECTION_STRING (ADO.NET style) into an mssql config, then set pool bounds.
// e.g. Server=localhost,1433;Database=appdb;User Id=sa;Password=...;Encrypt=true;TrustServerCertificate=true
const kv = Object.fromEntries(
  (process.env.SQL_CONNECTION_STRING || "").split(";").filter(Boolean).map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i).trim().toLowerCase(), p.slice(i + 1).trim()];
  })
);
const [server, port] = (kv["server"] || "localhost,1433").split(",");
const config = {
  server,
  port: Number(port) || 1433,
  database: kv["database"],
  user: kv["user id"] || kv["uid"],
  password: kv["password"] || kv["pwd"],
  options: {
    encrypt: (kv["encrypt"] ?? "true").toLowerCase() !== "false",
    trustServerCertificate: (kv["trustservercertificate"] ?? "false").toLowerCase() === "true",
  },
  pool: { max: 10, min: 2, idleTimeoutMillis: 30000 }, // bounded pool, warm minimum
};

// One shared pool per process. Do NOT call new sql.ConnectionPool() per request.
const poolPromise = new sql.ConnectionPool(config).connect();
```

Transient-only retry wrapper (exponential backoff, bounded attempts). Retry only on the known
transient error numbers and connection socket errors; let everything else throw immediately.

```js
const TRANSIENT = new Set([40501, 40613, 49918, 49919, 49920, 4060, 10928, 10929, 40197, 233]);
const isTransient = (e) =>
  TRANSIENT.has(e?.number) || ["ETIMEOUT", "ECONNRESET", "ECONNCLOSED"].includes(e?.code);

async function withRetry(fn, { attempts = 5, baseMs = 200 } = {}) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!isTransient(e) || i >= attempts) throw e; // non-transient: fail fast
      const delay = baseMs * 2 ** (i - 1) + Math.floor(Math.random() * 100); // backoff + jitter
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// Parameterized read through the shared pool.
async function getWidget(name) {
  const pool = await poolPromise;
  return withRetry(() =>
    pool.request().input("name", sql.NVarChar, name)
        .query("SELECT id, name FROM dbo.widgets WHERE name = @name")
  );
}
```

For non-idempotent writes, give the row a client-generated key and use `MERGE` (or check
existence) so a retried `INSERT` cannot double-apply.

## Python (pyodbc + tenacity)

Install: `pip install pyodbc tenacity`. pyodbc has no built-in pool; reuse a single long-lived
connection (or a module-level connection per worker) instead of opening one per query.

```python
import os
import pyodbc
from tenacity import retry, stop_after_attempt, wait_exponential_jitter, retry_if_exception

# The canonical SQL_CONNECTION_STRING uses ADO.NET keywords (User Id=/Password=/TrustServerCertificate=true);
# ODBC needs Uid=/Pwd=/TrustServerCertificate=yes, so translate before connecting. Reuse ONE connection.
raw = os.environ["SQL_CONNECTION_STRING"]  # Server=localhost,1433;Database=appdb;User Id=sa;Password=...;TrustServerCertificate=true
p = dict(kv.split("=", 1) for kv in raw.split(";") if "=" in kv)
odbc = (
    "Driver={ODBC Driver 18 for SQL Server};"
    f"Server={p['Server']};Database={p['Database']};"
    f"Uid={p['User Id']};Pwd={p['Password']};"
    "Encrypt=yes;TrustServerCertificate=yes"
)
_conn = pyodbc.connect(odbc, autocommit=False)

# Azure SQL transient error numbers; retry only these (and connection-dropped states).
TRANSIENT = {"40501", "40613", "49918", "49919", "49920", "4060", "10928", "10929", "40197", "233"}

def _is_transient(exc: BaseException) -> bool:
    if not isinstance(exc, pyodbc.Error):
        return False
    msg = str(exc)
    # SQLSTATE 08xxx = connection exceptions; also match the numeric codes above.
    return "08S01" in msg or "08001" in msg or any(n in msg for n in TRANSIENT)

@retry(
    retry=retry_if_exception(_is_transient),      # non-transient errors are NOT retried
    stop=stop_after_attempt(5),                    # bounded attempts
    wait=wait_exponential_jitter(initial=0.2, max=10),  # exponential backoff + jitter
    reraise=True,
)
def get_widget(name: str):
    with _conn.cursor() as cur:
        # Parameterized; never format the value into the SQL text.
        cur.execute("SELECT id, name FROM dbo.widgets WHERE name = ?", name)
        return cur.fetchall()
```

For non-idempotent writes, wrap the unit of work in one transaction and commit once, so a
retried call re-runs the whole unit rather than double-applying a partial `INSERT`; or give the
row a client-generated key and `MERGE` on it.
