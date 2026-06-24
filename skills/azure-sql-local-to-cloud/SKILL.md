---
name: azure-sql-local-to-cloud
description: Use this skill when the user wants to build and test an application against the local Azure SQL Database container and deploy it to Azure SQL Database in the cloud without changing code. Triggers include "develop locally then deploy to Azure", "make my app work both local and in the cloud", "lift and shift to Azure SQL Database", "wire my connection string for local and cloud", or "ship the same code to Azure". Start from the azure-sql-database-container skill to get the container running first.
---

# Local to cloud, unchanged

**Goal:** the same application code runs against the local container and against Azure SQL Database in the Microsoft Azure cloud. Only the connection string changes (server + auth), never the drivers, T-SQL, or migrations.

Prerequisite: the container is running. If not, use the `azure-sql-database-container` skill (sign in, run with `ACCEPT_EULA=Y` and `MSSQL_SA_PASSWORD`, port 1433).

## 1. Install the driver and read the connection string from the environment

Use the project's package manager. Example for Node.js:

```bash
npm install mssql dotenv
```

Read a single `SQL_CONNECTION_STRING` so the same code points at local or cloud by swapping only that value. Add `.env` to `.gitignore`.

```dotenv
# Local: the Azure SQL Database container
SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true"

# Cloud (later): only the server and auth change.
# SQL_CONNECTION_STRING="Server=tcp:<your-server>.database.windows.net,1433;Database=appdb;Authentication=Active Directory Default;Encrypt=true"
```

Provision the database from a `master` connection once (`CREATE DATABASE appdb;`), then connect with `Database=appdb` for all real work (see the connection-model reference in the core skill).

## 2. Example: a CRUD transaction (Node.js, mssql)

```javascript
import 'dotenv/config';
import sql from 'mssql';

const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);

async function main() {
  await pool.request().batch(`
    DROP TABLE IF EXISTS books;
    DROP TABLE IF EXISTS authors;
    CREATE TABLE authors (id INT IDENTITY(1,1) PRIMARY KEY, name NVARCHAR(200) NOT NULL);
    CREATE TABLE books   (id INT IDENTITY(1,1) PRIMARY KEY, title NVARCHAR(400) NOT NULL,
                          author_id INT NOT NULL REFERENCES authors(id) ON DELETE CASCADE);
  `);

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const a = await new sql.Request(tx)
      .input('name', sql.NVarChar, 'George Orwell')
      .query('INSERT INTO authors (name) OUTPUT INSERTED.id VALUES (@name);');
    const authorId = a.recordset[0].id;
    await new sql.Request(tx)
      .input('title', sql.NVarChar, '1984').input('aid', sql.Int, authorId)
      .query('INSERT INTO books (title, author_id) VALUES (@title, @aid);');
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

main().catch(console.error).finally(() => pool.close());
```

Use T-SQL idioms: `NVARCHAR`, `IDENTITY`, `OUTPUT INSERTED` (not Postgres/MySQL syntax). Always parameterize (`request.input(...)` + `@param`).

## 3. Deploy to Azure SQL Database

1. Provision an Azure SQL Database server and database in the Microsoft Azure cloud.
2. Change only `SQL_CONNECTION_STRING` (server + auth). Do not change application code.
3. Run the same migration against the cloud database (`prisma migrate deploy`, `alembic upgrade head`, `dotnet ef database update`, or your equivalent).
4. Deploy the app to Azure App Service, Azure Container Apps, or Azure Functions.

## Do not

- Do not change application code to deploy to the cloud. If you must, that is a bug worth filing.
- Do not hardcode or print the connection string or password.
