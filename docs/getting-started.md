---
title: "Getting started"
description: "Get the Azure SQL Database container running and run your first query, either by asking an AI coding agent or by hand."
---

## Table of Contents

- [Before you start](#before-you-start)
- [Option A: let an AI coding agent do it](#option-a-let-an-ai-coding-agent-do-it)
- [Option B: set it up yourself](#option-b-set-it-up-yourself)
  - [Step 1: sign in and pull the image](#step-1-sign-in-and-pull-the-image)
  - [Step 2: start the container](#step-2-start-the-container)
  - [Step 3: verify it is running](#step-3-verify-it-is-running)
  - [Step 4: connect and query](#step-4-connect-and-query)
- [Next: build something](#next-build-something)

## Before you start

Confirm you have:

- A supported container engine installed and running (Docker, Podman, containerd, or Rancher Desktop). See [Prerequisites](prerequisites.md).
- Port `1433` available on the host.
- The registry username and password from your welcome email.

Everything below works the same on macOS, Linux, and Windows.

## Option A: let an AI coding agent do it

The fastest path is to let your AI coding agent set everything up. Install the container skill once. It works across Claude Code, GitHub Copilot, Codex, and Cursor.

```bash
npx skills add azure-sql-database-container
```

Then ask your agent in plain English, for example:

> Add a local Azure SQL Database to this project, then scaffold the schema, migrations, and data-access layer for my stack.

The skill teaches your agent the registry, image, ports, and connection string, so it can sign in, start the container, and wire your app to it. Browse the skill and more ready-made prompts in [agent skills](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/agent-skills).

## Option B: set it up yourself

Prefer to run the commands yourself? Pick your container engine and follow the steps. Everything works the same on macOS, Linux, and Windows.

<div class="pivot" role="tablist" aria-label="Container engine">
  <button class="pivot-btn" type="button" data-engine="docker" role="tab">Docker / Podman</button>
</div>

### Step 1: sign in and pull the image

The preview image is served from a private registry. Sign in with the username and password from your welcome email, then pull the image.

<div class="engine-block" data-engine="docker" markdown="1">

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>
docker pull sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

With Podman, replace `docker` with `podman`.

</div>

The registry path, image tag, and credentials are provisional during Private Preview. The exact values you use will be the ones shared with you in the welcome email.

### Step 2: start the container

<div class="engine-block" data-engine="docker" markdown="1">

Start it on port `1433` with one command:

```bash
# on a non-x64 host, add --platform linux/amd64
docker run --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
    -p 1433:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

Or use `docker compose`. Create a `docker-compose.yml`, then run `docker compose up -d`.

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
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

</div>

> **NOTE:** Replace `YourStrong!Passw0rd` with your own. The container enforces the default SQL password complexity policy: at least 8 characters, with a mix of upper, lower, numeric, and non-alphanumeric characters.

### Step 3: verify it is running

<div class="engine-block" data-engine="docker" markdown="1">

```bash
docker ps --filter "name=sqldb"
```

You should see the `sqldb` container in `Up` status. If it exited, check the logs with `docker logs sqldb`.

</div>

The most common startup failure is a password that does not meet the complexity policy; pick a stronger password and recreate the container.

### Step 4: connect and query

If you have [sqlcmd](https://learn.microsoft.com/sql/tools/sqlcmd/sqlcmd-utility) installed, connect and run your first query in one command (port `1433` is published in both engines). The `-C` flag trusts the container's self-signed certificate:

```bash
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -C \
    -Q "SELECT @@VERSION;"
```

You should see `Microsoft SQL Azure`, confirming you are on the Azure SQL Database engine.

**Other ways to query:**

- **Ask your AI agent, no T-SQL required.** With the [container skill](prerequisites.md#agent-skill) installed, ask your agent in plain English, for example: *"Connect to my local Azure SQL Database and show the version and edition."* It already knows the connection details and runs the query for you. This is the fastest path if you would rather not write SQL by hand.
- **No sqlcmd installed? Use the copy bundled in the container:**

  <div class="engine-block" data-engine="docker" markdown="1">

  ```bash
  docker exec sqldb /opt/mssql-tools18/bin/sqlcmd \
      -S localhost -U sa -P "YourStrong!Passw0rd" -C -Q "SELECT @@VERSION;"
  ```

  </div>

- **Use the VS Code MSSQL extension, with Copilot.** Install the [MSSQL extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql), click **Add Connection**, and connect with server `localhost,1433`, SQL Login, user `sa`, your password, and **Trust server certificate: Yes**. Open a `.sql` file to run queries, and use the extension's inline GitHub Copilot assistance to write SQL from natural language.
- **Install sqlcmd** from the [sqlcmd utility](https://learn.microsoft.com/sql/tools/sqlcmd/sqlcmd-utility) docs.

### Stop and clean up

<div class="engine-block" data-engine="docker" markdown="1">

```bash
docker rm -f sqldb
# or, if you used docker compose (add -v to also remove the data volume):
docker compose down
```

</div>

## Next: build something

Pick a job and let your AI coding agent build it against the container. Each links to a ready-made prompt you can copy.

- [Build locally, ship to Azure]({{ '/prompts/local-to-cloud.md' | relative_url }}): develop and test locally, then deploy the same code to Azure SQL Database with a connection-string change.
- [Prototype AI and RAG apps]({{ '/prompts/ai-rag.md' | relative_url }}): vector search and embeddings with a local model, then Azure OpenAI in the cloud.
- [Run integration tests in CI]({{ '/prompts/ci.md' | relative_url }}): the container as a service in GitHub Actions, with no Azure subscription.
- [Develop offline]({{ '/prompts/offline.md' | relative_url }}): demos, classes, and workshops with no internet.
- [Drop in as a sidecar]({{ '/prompts/sidecar.md' | relative_url }}): add it to a docker compose stack or Dev Container.
- [Scaffold new projects]({{ '/prompts/templates.md' | relative_url }}): start a new .NET Aspire, FastAPI, Next.js, or NestJS project.

Haven't installed the skill yet? See [Agent skill](prerequisites.md#agent-skill).
