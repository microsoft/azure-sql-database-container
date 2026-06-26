# AI Prompt: Add a local Azure SQL Database to a Node.js project, ready for the cloud

**Role:** You are an expert software agent configuring the current Node.js project to develop against the Azure SQL Database container locally and deploy unchanged to Azure SQL Database in the Microsoft Azure cloud.

**Purpose:** Install the right driver, stand up the container, wire the connection string through an environment variable, and provide a complete, working script that runs a full CRUD lifecycle inside a transaction. The same code must run against Azure SQL Database in the cloud with no changes other than the connection string.

**Scope:**
- Assumes the user is in a Node.js project directory with Docker (or Podman) available.
- The Azure SQL Database container is the Azure SQL Database engine running locally. It is wire-compatible with Azure SQL Database in the cloud: same drivers, same T-SQL, same migrations.

Read and understand the entire instruction set before executing.

---

## Instructions

Identify the project's package manager (`npm`, `yarn`, `pnpm`, `bun`) and use it for all commands. Examples below use `npm`.

### 1. Start the Azure SQL Database container

Run the container locally on port 1433 with a strong SA password. Set `ACCEPT_EULA=Y`; this container requires it.

```bash
# The image is in a private preview registry; sign in with the credentials requested via the early-access feedback channel (pull-only; may be rotated during the preview) first
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io
# The image is x64-only; on a non-x64 host (Apple Silicon) this adds --platform linux/amd64 to run it under emulation.
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker run --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
    -p 1433:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

The registry path and image tag are provisional during Private Preview; use the exact values requested via the early-access feedback channel (pull-only; may be rotated during the preview) if different.

The engine is not ready the instant `docker run` returns. Wait for it to accept connections, then create the `appdb` database. Azure SQL Database does **not** create databases automatically on connect, so the application database must exist before the app connects:

```bash
# Create appdb, retrying until it succeeds. This both waits out engine startup and survives the
# brief window where the engine accepts connections but is still bringing databases online.
# -b makes sqlcmd return a non-zero exit code on a SQL error (otherwise the loop would not retry).
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
    -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do
  sleep 2
done
```

### 2. Install the driver and configure the project

```bash
npm install mssql dotenv
```

Ensure `package.json` has `"type": "module"`.

### 3. Create the `.env` file

Create `.env` at the project root if it does not exist. Use a single `SQL_CONNECTION_STRING` so the same code points at local or cloud by swapping only this value.

```dotenv
# Local: the Azure SQL Database container
SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true"

# Cloud (for later): Azure SQL Database. Only the server and auth change; the application does not.
# SQL_CONNECTION_STRING="Server=tcp:<your-server>.database.windows.net,1433;Database=appdb;Authentication=Active Directory Default;Encrypt=true"
```

Add `.env` to `.gitignore`. The `appdb` database was created in step 1; the app connects to it directly (the engine does not create databases on connect).

### 4. Create an example script with a CRUD transaction

Create or update the project's main file (for example `index.js`). If it already contains user code, comment it out with a note and append the new block below.

```javascript
import 'dotenv/config';
import sql from 'mssql';

const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);

async function main() {
  console.log('Connected to', (await pool.request().query('SELECT @@VERSION AS v')).recordset[0].v.split('\n')[0]);

  // Schema (T-SQL: IDENTITY instead of SERIAL)
  await pool.request().batch(`
    DROP TABLE IF EXISTS books;
    DROP TABLE IF EXISTS authors;
    CREATE TABLE authors (id INT IDENTITY(1,1) PRIMARY KEY, name NVARCHAR(200) NOT NULL);
    CREATE TABLE books   (id INT IDENTITY(1,1) PRIMARY KEY, title NVARCHAR(400) NOT NULL,
                          author_id INT NOT NULL REFERENCES authors(id) ON DELETE CASCADE);
  `);
  console.log('Schema created.');

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    // CREATE: insert an author, return the new id with OUTPUT (T-SQL equivalent of RETURNING)
    const authorRes = await new sql.Request(tx)
      .input('name', sql.NVarChar, 'George Orwell')
      .query('INSERT INTO authors (name) OUTPUT INSERTED.id VALUES (@name);');
    const authorId = authorRes.recordset[0].id;
    console.log('CREATE author id', authorId);

    await new sql.Request(tx)
      .input('title', sql.NVarChar, '1984')
      .input('aid', sql.Int, authorId)
      .query('INSERT INTO books (title, author_id) VALUES (@title, @aid);');

    // READ
    const read = await new sql.Request(tx)
      .input('aid', sql.Int, authorId)
      .query('SELECT b.title, a.name AS author FROM books b JOIN authors a ON a.id = b.author_id WHERE a.id = @aid;');
    console.log('READ', read.recordset[0]);

    // UPDATE
    await new sql.Request(tx)
      .input('aid', sql.Int, authorId)
      .query("UPDATE books SET title = 'Nineteen Eighty-Four' WHERE author_id = @aid;");

    // DELETE (cascades to books)
    await new sql.Request(tx).input('aid', sql.Int, authorId).query('DELETE FROM authors WHERE id = @aid;');

    await tx.commit();
    console.log('Transaction committed.');
  } catch (e) {
    await tx.rollback();
    console.error('Rolled back:', e.message);
    throw e;
  }
}

main().catch(console.error).finally(() => pool.close());
```

Run it:

```bash
node index.js
```

---

## Validation rules

- The connection string is read from `process.env.SQL_CONNECTION_STRING`; it is never hardcoded.
- All SQL uses parameterized inputs (`request.input(...)` + `@param`), never string concatenation.
- The business logic runs inside a `sql.Transaction` with explicit `commit` / `rollback`.
- T-SQL idioms are used (NVARCHAR, `IDENTITY`, `OUTPUT INSERTED`), not Postgres/MySQL syntax.
- The pool is closed at the end.

## Do not

- Do not hardcode credentials or print the connection string or password.
- Do not change the application code to deploy to the cloud. To go to Azure SQL Database, change only `SQL_CONNECTION_STRING` (server + auth). The drivers, T-SQL, and migrations stay the same.
