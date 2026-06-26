# Migration tools: per-tool detail

Full per-tool wiring for applying schema migrations to the local Azure SQL
Database container. Every section assumes `appdb` was already provisioned on a
**master** connection (see SKILL.md, "Start the container and provision appdb").
The engine does not auto-create databases, so the database must exist and be
selected in the connection string. Avoid `USE` to switch databases. In a
user-database (SDS) session (the Azure-faithful context where you develop), `USE`
returns `Msg 40508`, exactly as in Azure SQL Database in the cloud. A `master`
connection is a non-SDS provisioning session where the Azure statement filter is not
enforced, so `USE` appears to work there, but `master` is
for provisioning only, not application work. Always select the target database in
the connection string (`Database=appdb`, or `-d appdb` for sqlcmd).

## Table of contents

- [Shared connection facts](#shared-connection-facts)
- [EF Core (.NET)](#ef-core-net)
- [Prisma (Node)](#prisma-node)
- [Alembic (Python)](#alembic-python)
- [SqlPackage / DACPAC](#sqlpackage--dacpac)
- [Common failures](#common-failures)

## Shared connection facts

- Engine identity: `EngineEdition` 5, `Edition` 'SQL Azure'. Not the box image.
- Image: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest`
  (x64 / linux/amd64 only; on a non-x64 host add `--platform linux/amd64`).
- Canonical ADO.NET / sqlcmd connection string:
  `Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true`
- One env var holds it: `SQL_CONNECTION_STRING`. Apps and most tools read it.
- Use `User Id=`/`Password=`/`Database=`, not `Uid=`/`Pwd=`.
- If you started on a non-default host port, replace `localhost,1433` with `localhost,<HOST_PORT>`.

## EF Core (.NET)

Point EF Core at `appdb` and apply migrations:

```bash
export SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"
dotnet ef database update
```

Read the connection string in `Program.cs`:

```csharp
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING")));
```

Design-time factory (so `dotnet ef` works without booting the app):

```csharp
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING");
        var opts = new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(cs).Options;
        return new AppDbContext(opts);
    }
}
```

Notes:
- `appdb` must already exist on master. `context.Database.Migrate()` and
  `EnsureCreated()` only create the database if the `sa` account can create it;
  provisioning on master first is the reliable, cloud-identical path.
- For CI, build a self-contained bundle and run it against `appdb`:
  ```bash
  dotnet ef migrations bundle -o ./efbundle
  ./efbundle --connection "$SQL_CONNECTION_STRING"
  ```
- Generate an idempotent script to review before applying:
  `dotnet ef migrations script -i -o migrate.sql`, then apply with
  `sqlcmd -C -b -d appdb -i migrate.sql`.

## Prisma (Node)

Prisma uses a URL-form connection string, not the ADO.NET form. Install Prisma
(pinned to 6), then put the `sqlserver://` URL in `DATABASE_URL`:

```bash
npm install -D prisma@6
npm install @prisma/client@6
export DATABASE_URL="sqlserver://localhost:1433;database=appdb;user=sa;password=YourStr0ng_Passw0rd;trustServerCertificate=true"
```

Pinned to Prisma 6; Prisma 7 moved the datasource `url` into a prisma.config.ts and
requires a driver adapter (@prisma/adapter-mssql). The in-schema
`url = env("DATABASE_URL")` below is valid on Prisma 6.

`schema.prisma`:

```prisma
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
```

Apply migrations:

```bash
npx prisma migrate deploy            # apply committed migrations (CI / prod-like)
npx prisma migrate dev --name init   # author + apply a new migration (local dev)
```

Use `migrate deploy` for non-interactive environments; `migrate dev` is for local
authoring and may prompt or reset. Both require `appdb` to already exist; Prisma's
shadow-database step also needs an account that can create databases, which `sa`
has here.

Prisma 7 note: the SQL Server connector moves to the driver adapter
`@prisma/adapter-mssql`. Install it and wire the client:

```bash
npm install @prisma/adapter-mssql
```

```js
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaMssql({
  server: "localhost",
  port: 1433,
  database: "appdb",
  user: "sa",
  password: process.env.MSSQL_SA_PASSWORD,
  options: { trustServerCertificate: true },
});
const prisma = new PrismaClient({ adapter });
```

The `DATABASE_URL` above still drives the `prisma migrate` CLI; the adapter is for
the runtime client.

## Alembic (Python)

Alembic uses a SQLAlchemy URL. With pyodbc and ODBC Driver 18:

```bash
export SQL_CONNECTION_STRING="mssql+pyodbc://sa:YourStr0ng_Passw0rd@localhost,1433/appdb?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
alembic upgrade head
```

In `alembic/env.py`, read the env var instead of hardcoding:

```python
import os
config.set_main_option("sqlalchemy.url", os.environ["SQL_CONNECTION_STRING"])
```

Notes:
- `TrustServerCertificate=yes` is required for the local self-signed cert with
  Driver 18 (it defaults to encrypt + verify).
- `appdb` must exist on master first; Alembic connects straight to `appdb` and
  will not create it.
- `alembic downgrade -1` and `alembic upgrade <rev>` work the same against `appdb`.

## SqlPackage / DACPAC

Publish a DACPAC to `appdb`:

```bash
sqlpackage /Action:Publish /SourceFile:./app.dacpac \
  /TargetServerName:"localhost,1433" /TargetDatabaseName:appdb \
  /TargetUser:sa /TargetPassword:"YourStr0ng_Passw0rd" \
  /TargetTrustServerCertificate:true
```

Notes:
- `/TargetTrustServerCertificate:true` is needed for the self-signed cert.
- Publishing into an existing `appdb` is the cloud-identical path; let the
  master provisioning step create the database, then publish schema into it.
- Extract the current schema for diffing:
  ```bash
  sqlpackage /Action:Extract /SourceServerName:"localhost,1433" \
    /SourceDatabaseName:appdb /SourceUser:sa /SourcePassword:"YourStr0ng_Passw0rd" \
    /SourceTrustServerCertificate:true /TargetFile:./app.dacpac
  ```

## Common failures

- "Cannot open database 'appdb' requested by the login": `appdb` was not
  provisioned. Run the master provisioning step first.
- `Msg 40508` (USE statement not supported): something issued `USE appdb` in a
  user-database (SDS) session, which returns this exactly as in Azure SQL Database in
  the cloud. `USE` appears to work only on a `master` non-SDS provisioning session
  where the Azure statement filter is not enforced; select the database in the
  connection string instead so code behaves identically in the cloud.
- `Msg 913` / connection refused right after `docker run`: the engine was not
  ready. Run the ready-wait loop with `-b -l` before migrating.
- "Incorrect syntax near '@P3'" on a vector insert: the `VECTOR(n)` dimension was
  passed as a bind parameter. Make `n` a literal in `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))`.
- Login/cert errors with ODBC Driver 18 or sqlcmd: add `TrustServerCertificate`
  (`=yes` for ODBC URLs, `=true` for ADO.NET, `-C` for sqlcmd).
- Tool points at `mcr.microsoft.com/mssql/server`: wrong image. Use
  `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest`.
