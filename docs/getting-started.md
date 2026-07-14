---
title: "Getting started"
description: "Go from pulling the Azure SQL Developer image to your first query in under a minute, either with your AI agent or by hand. No sqlcmd install required."
---

## Table of Contents

- [Before you start](#before-you-start)
- [Step 0: sign up for the Private Preview](#step-0-sign-up-for-the-private-preview)
- [Fastest: let your AI agent set it up](#fastest-let-your-ai-agent-set-it-up)
- [Manual: run it yourself](#manual-run-it-yourself)
  - [Step 1: sign in and pull the image](#step-1-sign-in-and-pull-the-image)
  - [Step 2: start the container](#step-2-start-the-container)
  - [Step 3: connect and run your first query](#step-3-connect-and-run-your-first-query)
- [Troubleshooting](#troubleshooting)
  - [Skills did not load](#skills-did-not-load)
- [Next: build something](#next-build-something)
- [Related content](#related-content)

## Before you start

Confirm you have:

- A supported container engine installed and running (Docker, Podman, containerd, or Rancher Desktop). See [Prerequisites](prerequisites.md).
- Port `1433` available on the host.
- The registry username and password, provided when you sign up at [aka.ms/sqldbcontainerpreview-signup](https://aka.ms/sqldbcontainerpreview-signup) (pull-only; may be rotated during the preview).

You do **not** need sqlcmd or any database tool installed: the container brings its own. Everything below works the same on macOS, Linux, and Windows.

## Step 0: sign up for the Private Preview

The image is in a private registry, so **[sign up for the Private Preview](https://aka.ms/sqldbcontainerpreview-signup)** first. Signing up is the only way to get the registry username and password (pull-only; may rotate) that you need to pull the image.

> **The container is for development.** It is your local inner loop (development, testing, CI, and demos). For production, deploy the same code to Azure SQL Database in the Microsoft Azure cloud (the outer loop); you do not run this container in Azure. See the [local-to-cloud skill](https://github.com/microsoft/azure-sql-database-container/tree/main/skills/azuresql-db-local-to-cloud).

From here you have two ways to reach your first query. Both end in the same place, a running container you can connect to, so pick one.

## Fastest: let your AI agent set it up

Your agent does the whole setup for you: it pulls the image, starts the container, provisions the database, and runs your first query. You install the skills once, then ask in plain English.

```bash
npx skills add microsoft/azure-sql-database-container
```

That installs the whole collection, which is what we recommend: the skills route to each other, so the one that starts the container hands off to the one that runs your migrations. To take just one, [pick it from the table](https://github.com/microsoft/azure-sql-database-container/tree/main/skills#install-just-one).

Confirm they loaded with `ls .claude/skills/`. If it is empty, see [skills did not load](#skills-did-not-load).

The skills work across Claude Code, GitHub Copilot (VS Code and CLI), Codex, and Cursor. Then ask your agent in plain English. Copy this and paste it into your agent:

```text
Add a local Azure SQL Database to this project, then scaffold the schema, migrations, and data-access layer for my stack.
```

**Why use the skills?** They already know the private preview registry, the x64 image, the connection model (the engine does not auto-create databases, so they provision a database first, named `appdb` in these examples or whatever name you choose), the readiness wait, and the local-to-cloud story. So your agent stands up a real Azure SQL Database the right way the first time, instead of reaching for the SQL Server image (`mcr.microsoft.com/mssql/server`) or inventing behavior the engine does not have. Browse the [skills on GitHub](https://github.com/microsoft/azure-sql-database-container/tree/main/skills).

## Manual: run it yourself

Prefer to run it yourself? Three commands take you from pull to query, with Docker or Podman.

### Step 1: sign in and pull the image

The preview image is served from a private registry. Sign in first. This prompts for your password, so run it on its own:

```bash
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>
```

> **Note:** the registry username and password are **provided when you sign up for the Private Preview** at [aka.ms/sqldbcontainerpreview-signup](https://aka.ms/sqldbcontainerpreview-signup). They are shared and pull-only, must be treated as secrets, and may be rotated during the preview.

Once you are signed in, pull the image:

```bash
docker pull sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
```

With Podman, replace `docker` with `podman`. The registry path, image tag, and credentials are provisional during Private Preview.

### Step 2: start the container

Start it on port `1433` with one command:

```bash
docker run --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
    -p 1433:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
```

On a non-x64 host, copy this version instead. It adds `--platform linux/amd64` so the x64 image runs under emulation:

```bash
docker run --platform linux/amd64 --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
    -p 1433:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
```

Confirm it is up with `docker ps --filter "name=sqldb"`; you should see `sqldb` in `Up` status. If it exited, run `docker logs sqldb`. The most common cause is a password that does not meet the complexity policy.

> **NOTE:** Replace `YourStr0ng_Passw0rd` with your own. The container enforces the default SQL password complexity policy: at least 8 characters, with a mix of upper, lower, numeric, and non-alphanumeric characters.

Prefer `docker compose`? Create a `docker-compose.yml`, then run `docker compose up -d`. On a non-x64 host, add `platform: linux/amd64` under the `sqldb` service.

```yaml
services:
  sqldb:
    image: sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
    container_name: sqldb
    ports:
      - "1433:1433"
    environment:
      MSSQL_SA_PASSWORD: "YourStr0ng_Passw0rd"
      ACCEPT_EULA: "Y"
    volumes:
      - sqldb-data:/var/opt/mssql

volumes:
  sqldb-data:
```

### Step 3: connect and run your first query

You do not need to install anything: the container bundles sqlcmd, so this works for everyone. The `-C` flag trusts the container's self-signed certificate:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -Q "SELECT @@VERSION;"
```

You should see `Microsoft SQL Azure`, confirming you are on the Azure SQL Database engine.

**Other ways to query:**

- **Already have [sqlcmd](https://learn.microsoft.com/sql/tools/sqlcmd/sqlcmd-utility) on the host?** Connect directly: `sqlcmd -S localhost,1433 -U sa -P "YourStr0ng_Passw0rd" -C -Q "SELECT @@VERSION;"`.
- **Ask your AI agent, no T-SQL required.** With the [container skill](prerequisites.md#agent-skill) installed, ask in plain English, for example: *"Connect to my local Azure SQL Database and show the version and edition."* It already knows the connection details and runs the query for you.
- **Use the VS Code MSSQL extension with GitHub Copilot.** Its [GitHub Copilot integration](https://aka.ms/vscode-mssql-copilot-docs) works against the container today, for example writing SQL from natural language or opening the schema designer. Connect with server `localhost,1433`, SQL Login, user `sa`, your password, and **Trust server certificate: Yes**. The extension's graphical UI is not yet fully compatible with the container, so some UI features may error; see [known limitations](known-limitations.md).

### Stop and clean up

```bash
docker rm -f sqldb
# or, if you used docker compose (add -v to also remove the data volume):
docker compose down
```

## Troubleshooting

### Skills did not load

Your agent reads skills from its own folder, and `npx skills add` writes them to `.agents/skills/` first and then links them across. If that second step does not happen, you are left with skills your agent never sees, and **the installer can still report success**.

Check the folder your agent actually reads (`.claude/skills/` for Claude Code; the others are in the [install matrix](https://github.com/microsoft/azure-sql-database-container/tree/main/skills#install-matrix)):

```bash
ls .claude/skills/
```

If it is empty or missing while `.agents/skills/` has the skills in it, name your agent explicitly and run it again:

```bash
npx skills add microsoft/azure-sql-database-container -a claude-code
```

Still nothing? Copy them across yourself, which always works:

```bash
mkdir -p .claude/skills && cp -R .agents/skills/azuresql-db-* .claude/skills/
```

This is a known issue in the installer ([vercel-labs/skills#1355](https://github.com/vercel-labs/skills/issues/1355)), not a problem with the skills. If you hit it, [tell us](https://aka.ms/sql-agent-skills-feedback): we want to know which agent and which install method.

## Next: build something

Pick a job and let your AI coding agent build it against Azure SQL Developer. Each links to a ready-made prompt you can copy.

- [Build locally, ship to Azure]({{ '/prompts/local-to-cloud.md' | relative_url }}): develop and test locally, then deploy the same code to Azure SQL Database with a connection-string change.
- [Prototype AI and RAG apps]({{ '/prompts/ai-rag.md' | relative_url }}): vector search and embeddings with a local model, then Azure OpenAI in the cloud.
- [Run integration tests in CI]({{ '/prompts/ci.md' | relative_url }}): the container as a service in GitHub Actions, with no Azure subscription.
- [Develop offline]({{ '/prompts/offline.md' | relative_url }}): demos, classes, and workshops with no internet.
- [Drop in as a sidecar]({{ '/prompts/sidecar.md' | relative_url }}): add it to a docker compose stack or Dev Container.
- [Scaffold new projects]({{ '/prompts/templates.md' | relative_url }}): start a new .NET Aspire, FastAPI, Next.js, or NestJS project.

Haven't installed the skill yet? See [Agent skill](prerequisites.md#agent-skill).

## Related content

- [What is Azure SQL Developer](what-is-the-container.md)
- [Prerequisites](prerequisites.md)
- [Known limitations](known-limitations.md)
- [Feedback and how to engage](feedback-and-how-to-engage.md)
- [Report a bug](https://aka.ms/azuresql-developer-bug)
- [Request a feature](https://aka.ms/azuresql-developer-feature-request)
