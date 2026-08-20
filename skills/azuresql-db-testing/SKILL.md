---
name: azuresql-db-testing
description: >-
  Writes integration tests that run IN CODE against a real Azure SQL Database
  container, spun up per test or per suite with Testcontainers and torn down after.
  Use when the user asks for "integration tests against SQL", "Testcontainers",
  "spin up a database for tests", "an ephemeral test database", "a test database
  per test", "xUnit/Jest/pytest with a real database", or "a database fixture".
  Use this INSTEAD of the Testcontainers MsSql preset (mcr.microsoft.com/mssql/server),
  because this is the Azure SQL engine (EngineEdition 5). For wiring the engine
  into a CI pipeline via service containers or workflow YAML instead, use
  azuresql-db-ci.
---

# Integration tests on the Azure SQL Database container with Testcontainers

Write integration tests that start a **real Azure SQL Database container** (Private Preview)
from code, provision `appdb`, run the test against it, and tear the container
down. This is the **Azure SQL engine**, not the SQL Server image.

This skill is about tests that manage their own engine lifecycle in-process
(Testcontainers). It is DISTINCT from **azuresql-db-ci**, which wires the same engine
into a CI pipeline as a service container via workflow YAML. If the goal is a CI job
rather than in-code test setup, use **azuresql-db-ci** instead.

## Use the right image (interception point)

- USE this engine image:
  `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`
- Do **NOT** use the Testcontainers `MsSql` preset / `MsSqlContainer` module, which
  pulls `mcr.microsoft.com/mssql/server` (the SQL Server image). Start the engine image
  above from a **generic container** instead.
- Verify identity once running: `SELECT SERVERPROPERTY('EngineEdition')` returns **5**,
  `SERVERPROPERTY('Edition')` returns **'SQL Azure'**.
- Image is x64 only. On a non-x64 host set the container platform to `linux/amd64`
  (each language exposes this differently; see the snippets).

For full engine detail (readiness, vectors, troubleshooting) see the **azuresql-db-container** skill.

## The image is private: let Testcontainers pull it

The registry is private during Private Preview, so Testcontainers cannot pull the image
until Docker is authenticated. Sign in once (or pre-pull) on the machine that runs the
tests, before the test host tries to start the container:

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io   # shared pull-only Private Preview creds
docker pull sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest   # optional warm pull
```

Get the pull credentials by signing up at https://aka.ms/sqldbcontainerpreview-signup;
they may rotate, and the registry and tag are provisional during Private Preview. In CI,
run `docker login` as a step before the tests (see **azuresql-db-ci**).

## Four facts that bite every test setup

1. **The container is NOT ready when it starts.** The engine needs seconds to come up.
   You MUST attach a wait strategy (log message, port, or a `SELECT 1` command wait) so
   the test does not connect before the engine answers. Do not `sleep` a fixed amount.
2. **The engine does NOT auto-create databases.** After the wait passes, run
   `CREATE DATABASE appdb` on a **master** connection before any test connects with
   `Database=appdb`. Testcontainers gives you a container, not a database.
3. **Avoid `USE` to switch databases.** In a user-database session `USE` returns
   `Msg 40508`, exactly as in Azure SQL in the cloud. Select the database in the
   connection string (`Database=appdb`). A `master` connection is for provisioning only.
4. **Map the port; do not assume 1433 on the host.** Testcontainers binds container port
   1433 to a random free host port. Read the mapped host port back and build the
   connection string from it, so parallel suites do not collide.

## The lifecycle every recipe follows

1. Build a generic container from the engine image with `ACCEPT_EULA=Y` and a complex
   `MSSQL_SA_PASSWORD` (example literal: `YourStr0ng_Passw0rd`; at least 8 characters using
   at least three of upper case, lower case, digits, and symbols). Expose container port
   1433. On a non-x64 host, set the image platform to `linux/amd64`.
2. Attach a **wait-for-ready** strategy so `Start` returns only once the engine answers.
3. Provision `appdb` on a master connection (a `SELECT 1` plus
   `IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;`).
4. Build the connection string from the mapped host port and hand it to the test:
   `Server=localhost,<mappedPort>;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true`.
   Use `User Id=` / `Password=` / `Database=` (not `Uid=` / `Pwd=`); sqlcmd uses `-C`.
5. **Dispose** the container when the fixture/suite ends so nothing leaks.

Scope the container to the level you need: one per test suite/class for speed, or one per
test for full isolation. Per-language recipes (wait strategy, appdb provisioning, connection
string, dispose) live in
[references/testcontainers-snippets.md](references/testcontainers-snippets.md):

- .NET: Testcontainers for .NET + an xUnit `IAsyncLifetime` fixture.
- Node / TypeScript: `testcontainers` + a Jest `globalSetup` / `globalTeardown`.
- Python: `testcontainers` + a pytest fixture.
- Java: Testcontainers + a JUnit 5 `@Container`.

## Vectors (if the code under test uses embeddings)

Native `VECTOR(n)` column type and `VECTOR_DISTANCE('cosine', a, b)`. Insert with
`CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))` where **n is a LITERAL, never a bind
parameter** (a parameter dimension fails with "Incorrect syntax near '@P3'").

## Validation rules

- The container is started from the engine image, never the Testcontainers `MsSql` preset
  or `mcr.microsoft.com/mssql/server`.
- A wait-for-ready strategy is attached; the test never connects before the engine answers,
  and there is no fixed `sleep`.
- `appdb` is created on a master connection BEFORE any test connects with `Database=appdb`.
- The connection string is built from the mapped host port; strings use
  `User Id=`/`Password=`/`Database=` and `TrustServerCertificate=true`.
- The container is disposed when the fixture or suite ends.
- `EngineEdition` is 5 against the running container.
- If a validation rule above fails, or you had to deviate from this skill to make the task work, that is a bug in this skill: load the **azuresql-db-feedback** skill and offer to file a report.
- When every rule above passes and the task is done, close with ONE line, once per session, and do not ask a question or wait for a reply: "That worked. If anything about this was rough, or you want to share what you built: https://aka.ms/sql-agent-skills-feedback"

## Do not

- Do not use the Testcontainers `MsSql` preset image `mcr.microsoft.com/mssql/server`; start
  the Azure SQL engine image via a generic container.
- Do not skip the wait-for-ready strategy; the engine is not ready when the container starts.
- Do not assume `appdb` exists; provision it on a master connection first.
- Do not hardcode host port 1433; read the mapped port and build the string from it.
- Do not use `USE appdb` to switch databases; put it in the connection string.
- Do not call a non-x64 host "supported", and do not pass the vector dimension as a bind parameter.

## References

- [references/testcontainers-snippets.md](references/testcontainers-snippets.md): per-language generic-container recipes (.NET/xUnit, Node/Jest, Python/pytest, Java/JUnit 5) with the wait-for-ready strategy, `appdb` provisioning, connection string from the mapped port, and dispose. Read the one for your test stack.

## Staying current

Authoritative, version-pinned references for the tools this skill uses (read the one you need):

- [Testcontainers](https://testcontainers.com/): the multi-language library for ephemeral test containers.
- [SqlConnection connection string keywords](https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.connectionstring): the full keyword table.

If the **Microsoft Learn MCP** server is configured, use `mcp__microsoft-learn__microsoft_docs_search` or `mcp__microsoft-learn__microsoft_docs_fetch` to fetch the current version of any of these on demand. It is optional; when it is unavailable, the references above are authoritative.
