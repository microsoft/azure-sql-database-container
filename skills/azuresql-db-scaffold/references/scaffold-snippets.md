# Scaffold snippets

Per-stack skeletons wired to the Azure SQL Database container. Every snippet assumes the
container is running and **appdb is already provisioned on a master connection** (see the
canonical start recipe in SKILL.md). Apps read `SQL_CONNECTION_STRING`; ORMs that need a URL
also read `DATABASE_URL`. Image is
`sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest` (NOT the
`mcr.microsoft.com/mssql/server` box image). On a non-x64 host add `platform: linux/amd64`.

## Contents

- [Shared: compose service](#shared-compose-service)
- [.NET Aspire (EF Core)](#net-aspire-ef-core)
- [FastAPI (SQLAlchemy / pyodbc)](#fastapi-sqlalchemy--pyodbc)
- [Next.js (Prisma)](#nextjs-prisma)
- [NestJS (Prisma or TypeORM)](#nestjs-prisma-or-typeorm)

## Shared: compose service

`compose.yaml`. The provisioner sidecar creates appdb so the app never hits a missing database.

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
    # On a non-x64 host, uncomment:
    # platform: linux/amd64
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
    ports:
      - "1433:1433"
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$$MSSQL_SA_PASSWORD\" -C -b -l 2 -Q \"SELECT 1\""]
      interval: 5s
      timeout: 5s
      retries: 30
  provision:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
    # platform: linux/amd64
    depends_on:
      sqldb:
        condition: service_healthy
    entrypoint: ["/bin/bash", "-c"]
    command: >
      "/opt/mssql-tools18/bin/sqlcmd -S sqldb -U sa -P 'YourStrong!Passw0rd' -C -b
       -Q \"IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;\""
```

Connection string the app consumes (host side, port 1433):

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true
```

## .NET Aspire (EF Core)

`.env` / user-secrets:

```
SQL_CONNECTION_STRING=Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true
```

Provision appdb (once, on master) before the first migration:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

`Program.cs` reads the single env var:

```csharp
var conn = Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING")
           ?? throw new InvalidOperationException("SQL_CONNECTION_STRING not set");
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(conn));
```

First migration (EF Core targets appdb via the connection string, never `USE`):

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

Typed, parameterized data access (EF parameterizes by default):

```csharp
var widgets = await db.Widgets
    .Where(w => w.Name == name)   // name is parameterized, never concatenated
    .ToListAsync();
```

For the migration workflow in depth, see the **azuresql-db-schema-migration** skill.

## FastAPI (SQLAlchemy / pyodbc)

`.env`:

```
SQL_CONNECTION_STRING=Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true
```

Provision appdb on master before the app connects:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

`db.py`: build a SQLAlchemy URL from the canonical string via pyodbc.

```python
import os, urllib.parse
from sqlalchemy import create_engine, text

raw = os.environ["SQL_CONNECTION_STRING"]
# Hand the ODBC string straight to the driver; SQLAlchemy passes it through.
url = "mssql+pyodbc:///?odbc_connect=" + urllib.parse.quote_plus(
    raw + ";Driver={ODBC Driver 18 for SQL Server}"
)
engine = create_engine(url, pool_pre_ping=True)

def get_widget(name: str):
    with engine.connect() as cx:
        # Parameterized; never f-string the value into SQL.
        return cx.execute(
            text("SELECT id, name FROM dbo.widgets WHERE name = :name"),
            {"name": name},
        ).all()
```

First migration with Alembic (it connects to appdb from the same URL):

```bash
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

Vector insert (dimension is a LITERAL in the SQL text, value is bound):

```python
cx.execute(
    text("INSERT INTO dbo.docs (embedding) VALUES (CAST(CAST(:v AS NVARCHAR(MAX)) AS VECTOR(1536)))"),
    {"v": "[0.1, 0.2, 0.3]"},   # 1536 is literal; do NOT bind it as a parameter
)
```

## Next.js (Prisma)

Prisma needs a `sqlserver://` URL. Provide both env vars; keep them describing the same instance.

`.env`:

```
SQL_CONNECTION_STRING=Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true
DATABASE_URL=sqlserver://localhost:1433;database=appdb;user=sa;password=YourStrong!Passw0rd;trustServerCertificate=true;encrypt=true
```

Install Prisma (pinned to v6):

```bash
npm install -D prisma@6
npm install @prisma/client@6
```

Pinned to Prisma 6; Prisma 7 moved the datasource `url` into a prisma.config.ts and requires a
driver adapter (@prisma/adapter-mssql).

`prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
```

Provision appdb on master, THEN run the first migration (Prisma will not create the database):

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
npx prisma migrate dev --name init
```

Typed, parameterized data access (Prisma Client parameterizes all inputs):

```ts
const widgets = await prisma.widget.findMany({ where: { name } });
```

## NestJS (Prisma or TypeORM)

`.env` (same two vars as Next.js):

```
SQL_CONNECTION_STRING=Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true
DATABASE_URL=sqlserver://localhost:1433;database=appdb;user=sa;password=YourStrong!Passw0rd;trustServerCertificate=true;encrypt=true
```

Provision appdb on master before bootstrapping:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

Prisma path: same pinned install (`npm install prisma@6 @prisma/client@6`), `schema.prisma`, and
`npx prisma migrate dev --name init` as Next.js above.

TypeORM path: parse the canonical string into `DataSourceOptions`.

```ts
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "mssql",
  host: "localhost",
  port: 1433,
  username: "sa",
  password: process.env.MSSQL_SA_PASSWORD ?? "YourStrong!Passw0rd",
  database: "appdb",                 // selected here, never via USE
  options: { trustServerCertificate: true },
  entities: [/* ... */],
  migrations: [/* ... */],
});
```

First migration:

```bash
npm run typeorm migration:generate -- -n Init
npm run typeorm migration:run
```

Typed, parameterized data access (TypeORM binds parameters):

```ts
const widgets = await repo
  .createQueryBuilder("w")
  .where("w.name = :name", { name })   // bound, never string-concatenated
  .getMany();
```

For the full migration workflow across stacks, see the **azuresql-db-schema-migration** skill.
