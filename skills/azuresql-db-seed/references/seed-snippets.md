# Seed snippets

Copy-pasteable recipes to fill **appdb** with realistic sample data. Every snippet assumes the
container is running (named `sqldb`) and **appdb is already provisioned on a master connection**:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

Image is `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest` (NOT the
`mcr.microsoft.com/mssql/server` SQL Server image). Apps and drivers read `SQL_CONNECTION_STRING`:

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true
```

Always insert parents before children (foreign-key order), never real PII or secrets, and use
parameters for programmatic inserts.

## Contents

- [T-SQL: multi-table seed in FK order](#t-sql-multi-table-seed-in-fk-order)
- [T-SQL: generate 1000 rows (set-based tally)](#t-sql-generate-1000-rows-set-based-tally)
- [Bulk load: BULK INSERT reads from Azure Blob Storage, not local files](#bulk-load-bulk-insert-reads-from-azure-blob-storage-not-local-files)
- [Bulk load: the bcp utility (local files, client-side)](#bulk-load-the-bcp-utility-local-files-client-side)
- [Node: @faker-js/faker + mssql driver](#node-faker-jsfaker--mssql-driver)
- [Python: Faker + pyodbc](#python-faker--pyodbc)

## T-SQL: multi-table seed in FK order

A parent (`dbo.author`) and a child (`dbo.book`) that references it. The seed inserts authors first,
then books that point at the author ids. It is idempotent (clear children then parents, then
re-insert) so re-running does not duplicate rows or leave orphans.

Save as `seed.sql`:

```sql
-- Schema (create once; safe to leave in the seed while iterating).
IF OBJECT_ID('dbo.author') IS NULL
CREATE TABLE dbo.author (
    author_id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(200) NOT NULL,
    country   NVARCHAR(100) NULL
);
IF OBJECT_ID('dbo.book') IS NULL
CREATE TABLE dbo.book (
    book_id   INT IDENTITY(1,1) PRIMARY KEY,
    author_id INT NOT NULL
        CONSTRAINT FK_book_author REFERENCES dbo.author(author_id),
    title     NVARCHAR(300) NOT NULL,
    published DATE NULL
);

-- Idempotent reset: children before parents (reverse FK order).
DELETE FROM dbo.book;
DELETE FROM dbo.author;

BEGIN TRANSACTION;

-- Parents first. Capture the generated ids with OUTPUT so children can reference them.
DECLARE @authors TABLE (author_id INT, full_name NVARCHAR(200));

INSERT INTO dbo.author (full_name, country)
OUTPUT inserted.author_id, inserted.full_name INTO @authors (author_id, full_name)
VALUES
    (N'Ada Sample',   N'UK'),
    (N'Grace Fixture', N'US'),
    (N'Alan Seed',    N'UK');

-- Children second, resolving the FK by looking up the parent we just inserted.
INSERT INTO dbo.book (author_id, title, published)
SELECT a.author_id, v.title, v.published
FROM (VALUES
    (N'Ada Sample',    N'Notes on Engines',      '2021-03-01'),
    (N'Ada Sample',    N'Second Edition',        '2023-09-15'),
    (N'Grace Fixture', N'Debugging by Daylight', '2020-01-20'),
    (N'Alan Seed',     N'Machines That Learn',   '2019-06-30')
) AS v(author_name, title, published)
JOIN @authors a ON a.full_name = v.author_name;

COMMIT TRANSACTION;

SELECT (SELECT COUNT(*) FROM dbo.author) AS authors,
       (SELECT COUNT(*) FROM dbo.book)   AS books;
```

Run it against appdb (note `-d appdb`, and `-i` to read the file piped in):

```bash
docker exec -i sqldb /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -d appdb -i /dev/stdin < seed.sql
```

If you would rather copy the file into the container first:

```bash
docker cp seed.sql sqldb:/tmp/seed.sql
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -d appdb -i /tmp/seed.sql
```

## T-SQL: generate 1000 rows (set-based tally)

For volume, fan out rows set-based instead of looping. A tally (numbers) table derived from
`sys.all_objects` gives you a sequence to join against. This inserts 1000 books spread across the
existing authors in one statement. Run it after the multi-table seed above so parents exist.

```sql
BEGIN TRANSACTION;

;WITH n AS (
    -- ROW_NUMBER over a system view yields a gap-free 1..N sequence with no loop.
    SELECT TOP (1000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS rn
    FROM sys.all_objects a CROSS JOIN sys.all_objects b
)
INSERT INTO dbo.book (author_id, title, published)
SELECT
    -- Round-robin the rows across whatever authors exist.
    (SELECT MIN(author_id) FROM dbo.author)
        + (n.rn % (SELECT COUNT(*) FROM dbo.author)),
    CONCAT(N'Generated Title #', n.rn),
    DATEADD(DAY, -(n.rn % 3650), CAST(SYSUTCDATETIME() AS DATE))
FROM n;

COMMIT TRANSACTION;

SELECT COUNT(*) AS total_books FROM dbo.book;
```

The `CROSS JOIN` of a system view against itself guarantees far more than 1000 candidate rows;
`TOP (1000)` trims to the count you want. Change `1000` to scale.

## Bulk load: BULK INSERT reads from Azure Blob Storage, not local files

`BULK INSERT` and `OPENROWSET(BULK ...)` do **not** read a local path on the container: pointing
them at a file inside the container fails with **`Msg 12713` "OPENROWSET is not allowed to read
local files."** This is Azure SQL Database parity: the engine reads bulk data only from **Azure
Blob Storage**. There is no local-file `BULK INSERT` here.

From Blob Storage it works exactly as in the cloud: create a `DATABASE SCOPED CREDENTIAL` (a SAS
token) and an `EXTERNAL DATA SOURCE`, then reference it with `DATA_SOURCE`:

```sql
CREATE DATABASE SCOPED CREDENTIAL BlobCred
  WITH IDENTITY = 'SHARED ACCESS SIGNATURE', SECRET = 'sv=...';   -- SAS token, no leading '?'
CREATE EXTERNAL DATA SOURCE SeedBlob
  WITH (TYPE = BLOB_STORAGE, LOCATION = 'https://<account>.blob.core.windows.net/seed', CREDENTIAL = BlobCred);

-- Stage first (no identity column), then INSERT ... SELECT so author_id auto-generates.
DROP TABLE IF EXISTS dbo.author_stage;
CREATE TABLE dbo.author_stage (full_name NVARCHAR(200), country NVARCHAR(100));
BULK INSERT dbo.author_stage FROM 'authors.csv'
  WITH (DATA_SOURCE = 'SeedBlob', FORMAT = 'CSV', FIRSTROW = 2, FIELDTERMINATOR = ',', ROWTERMINATOR = '0x0a', TABLOCK);
INSERT INTO dbo.author (full_name, country) SELECT full_name, country FROM dbo.author_stage;
DROP TABLE dbo.author_stage;
```

Always stage when the target has an identity/computed column or the CSV column order differs, then
`INSERT ... SELECT` into the real tables in FK order.

To load a **local** CSV into the container, use `bcp` (below) or the driver seeders further down:
they stream rows over the connection instead of asking the engine to read a server-side file.

## Bulk load: the bcp utility (local files, client-side)

`bcp` streams a data file into a table over the connection (it does not hit the server-side
local-file restriction above), so it is the tool for loading a **local** CSV. It ships in the
tools image, so run it via `docker exec`. Copy the file in first, and stage into a table whose
columns match the CSV so the `IDENTITY` column is not in the mapping:

```bash
docker cp authors.csv sqldb:/tmp/authors.csv

# Create a staging table that matches the CSV (no identity column).
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -d appdb \
  -Q "DROP TABLE IF EXISTS dbo.author_stage; CREATE TABLE dbo.author_stage (full_name NVARCHAR(200), country NVARCHAR(100));"

# -c character mode, -t field terminator, -F 2 first data row (skip header), -d appdb target db,
# -u trusts the container's self-signed cert (bcp uses ODBC Driver 18, which validates certs by default).
docker exec sqldb /opt/mssql-tools18/bin/bcp dbo.author_stage in /tmp/authors.csv \
  -S localhost -U sa -P "YourStr0ng_Passw0rd" -d appdb -u \
  -c -t ',' -F 2 -b 10000

# Move staged rows into the real table so author_id auto-generates.
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -d appdb \
  -Q "INSERT INTO dbo.author (full_name, country) SELECT full_name, country FROM dbo.author_stage; DROP TABLE dbo.author_stage;"
```

`-b 10000` commits in batches of 10000 rows so a very large load does not build one giant
transaction. Load parent files before child files. `bcp` must trust the self-signed cert (`-u`);
if it still cannot connect on the preview image, fall back to the driver seeders below, which use
the same connection any app does.

## Node: @faker-js/faker + mssql driver

Generate believable rows in JS and insert them **parameterized** with the `mssql` driver. Parents
first, then children referencing the ids returned from the parent insert.

```bash
npm install mssql @faker-js/faker
```

`seed.mjs`:

```js
import sql from "mssql";
import { faker } from "@faker-js/faker";

// Parse from the single canonical env var, or set the fields directly.
const pool = await sql.connect({
  server: "localhost",
  port: 1433,
  user: "sa",
  password: process.env.MSSQL_SA_PASSWORD ?? "YourStr0ng_Passw0rd",
  database: "appdb",                       // selected here, never via USE
  options: { trustServerCertificate: true, encrypt: true },
});

// Parents first: insert each author and capture the generated id.
const authorIds = [];
for (let i = 0; i < 20; i++) {
  const r = await pool.request()
    .input("full_name", sql.NVarChar(200), faker.person.fullName())
    .input("country", sql.NVarChar(100), faker.location.country())
    .query("INSERT INTO dbo.author (full_name, country) OUTPUT inserted.author_id VALUES (@full_name, @country)");
  authorIds.push(r.recordset[0].author_id);
}

// Children second: reference an existing author id. Every value is bound, never concatenated.
for (let i = 0; i < 200; i++) {
  const authorId = faker.helpers.arrayElement(authorIds);
  await pool.request()
    .input("author_id", sql.Int, authorId)
    .input("title", sql.NVarChar(300), faker.lorem.words({ min: 2, max: 5 }))
    .input("published", sql.Date, faker.date.past({ years: 10 }))
    .query("INSERT INTO dbo.book (author_id, title, published) VALUES (@author_id, @title, @published)");
}

console.log(`seeded ${authorIds.length} authors and 200 books`);
await pool.close();
```

```bash
node seed.mjs
```

## Python: Faker + pyodbc

Same idea with `pyodbc` and ODBC Driver 18. Use `?` placeholders (never f-strings) and
`fast_executemany` for the child batch.

```bash
pip install pyodbc faker
```

`seed.py`:

```python
import os
import pyodbc
from faker import Faker

fake = Faker()

conn = pyodbc.connect(
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=localhost,1433;"
    "Database=appdb;"                       # selected here, never via USE
    "Uid=sa;"
    f"Pwd={os.environ.get('MSSQL_SA_PASSWORD', 'YourStr0ng_Passw0rd')};"
    "TrustServerCertificate=yes;"
)
cur = conn.cursor()

# Parents first: insert authors and collect the generated ids.
author_ids = []
for _ in range(20):
    cur.execute(
        "INSERT INTO dbo.author (full_name, country) OUTPUT inserted.author_id VALUES (?, ?)",
        fake.name(), fake.country(),
    )
    author_ids.append(cur.fetchone()[0])

# Children second: reference an existing author id. Parameterized batch insert.
books = [
    (fake.random_element(author_ids), fake.sentence(nb_words=4), fake.date_between("-10y", "today"))
    for _ in range(200)
]
cur.fast_executemany = True
cur.executemany(
    "INSERT INTO dbo.book (author_id, title, published) VALUES (?, ?, ?)",
    books,
)

conn.commit()
print(f"seeded {len(author_ids)} authors and {len(books)} books")
conn.close()
```

```bash
python seed.py
```

Note: pyodbc's ODBC connection string uses `Uid=` / `Pwd=` (the ODBC keyword form). Application
connection strings for .NET-style drivers use `User Id=` / `Password=`; both describe the same login.
