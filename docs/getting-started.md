---
title: "Getting started"
description: "Pull the image, start the container, and run your first query against the Azure SQL Database engine in under five minutes."
---

## Table of Contents

- [Before you start](#before-you-start)
- [Step 1: pull the image](#step-1-pull-the-image)
- [Step 2: start the container](#step-2-start-the-container)
- [Step 3: verify it is running](#step-3-verify-it-is-running)
- [Step 4: connect from sqlcmd](#step-4-connect-from-sqlcmd)
- [Step 5: connect from the VS Code MSSQL extension](#step-5-connect-from-the-vs-code-mssql-extension)
- [Step 6: run your first query](#step-6-run-your-first-query)
- [Step 7: stop and clean up](#step-7-stop-and-clean-up)
- [Next: pick a sample](#next-pick-a-sample)

## Before you start

Confirm you have:

- A supported container runtime installed and running (see [Prerequisites](prerequisites.md)).
- Port `1433` available on the host.
- A terminal or VS Code window open.

Estimated time to first query: under 5 minutes.

## Step 1: pull the image

```bash
docker pull mcr.microsoft.com/azure-sql-database/container:preview
```

The image tag and registry path are provisional during Private Preview. The exact path you use will be the one shared with you in the welcome email.

## Step 2: start the container

The fastest path is `docker compose`. Create a file named `docker-compose.yml`:

```yaml
services:
  sqldb:
    image: mcr.microsoft.com/azure-sql-database/container:preview
    container_name: sqldb
    ports:
      - "1433:1433"
    environment:
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
      ACCEPT_EULA: "Y"
    volumes:
      - sqldb-data:/var/opt/mssql

volumes:
  sqldb-data:
```

Then start it:

```bash
docker compose up -d
```

> **NOTE:** Replace `YourStrong!Passw0rd` with a password of your own. The container enforces the default SQL password complexity policy: at least 8 characters, with a mix of upper, lower, numeric, and non-alphanumeric characters.

## Step 3: verify it is running

```bash
docker ps --filter "name=sqldb"
```

You should see the `sqldb` container in `Up` status. If the container exited, check the logs:

```bash
docker logs sqldb
```

The most common startup failure is a password that does not meet the complexity policy. Pick a stronger password and recreate the container.

## Step 4: connect from sqlcmd

```bash
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -C
```

The `-C` flag trusts the server certificate. The container uses a self-signed certificate by default.

## Step 5: connect from the VS Code MSSQL extension

1. Open VS Code.
2. Open the **MSSQL** extension panel (database icon in the activity bar). Install the [MSSQL extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql) if you do not already have it.
3. Click **Add Connection**.
4. Fill the connection dialog:
   - **Server:** `localhost,1433`
   - **Authentication:** SQL Login
   - **User name:** `sa`
   - **Password:** the password you set in Step 2
   - **Database:** leave blank for the default
   - **Trust server certificate:** Yes
5. Click **Connect**. The connection appears in the **Connections** view.

## Step 6: run your first query

In sqlcmd:

```sql
SELECT
    SERVERPROPERTY('EngineEdition') AS EngineEdition,
    SERVERPROPERTY('ProductVersion') AS ProductVersion,
    @@VERSION AS FullVersion
GO
```

`EngineEdition = 5` confirms you are talking to the Azure SQL Database engine, the same engine that runs in the cloud.

In the VS Code MSSQL extension, open a new SQL file (`.sql`), select the connection in the toolbar, paste the same query, and run it.

## Step 7: stop and clean up

```bash
docker compose down
```

To remove the data volume as well:

```bash
docker compose down -v
```

## Next: pick a sample

Once you have a working connection, jump into a sample in the [samples folder](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/). Pick the one closest to your stack:

- [Node.js + Prisma](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/nodejs-prisma/) for JavaScript and TypeScript projects
- [Python + SQLAlchemy](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/python-sqlalchemy/) for Python projects
- [AI / RAG with vector search](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/ai-rag/) for AI applications using embeddings and vector search
- [.NET Aspire](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/dotnet-aspire/) for .NET projects
- [CLI quickstart](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/cli/) for a docker-compose-only path

Each sample includes a local-to-cloud leg that deploys the same application against Azure SQL Database in production using the [Azure skills collection](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/azure-skills/).
