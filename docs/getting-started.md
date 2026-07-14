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
  - [Let your AI agent diagnose it](#let-your-ai-agent-diagnose-it)
  - [Start here: check your container runtime](#start-here-check-your-container-runtime)
  - [The container exits immediately](#the-container-exits-immediately)
  - [Platform and port problems](#no-matching-manifest-or-exec-format-error)
  - [Connection and database problems](#connection-fails-right-after-the-container-starts)
  - [Skills did not load](#skills-did-not-load)
  - [Still stuck?](#still-stuck)
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

The commands below use `docker`. If you run Podman, containerd, or Rancher Desktop, substitute your own CLI (`podman`, `nerdctl`): the behavior is the same on every runtime.

### Let your AI agent diagnose it

Fastest path if you are stuck. Copy this and paste it into your agent (Claude Code, GitHub Copilot, Codex, or Cursor). It knows your machine and your runtime, and it can read the logs itself:

```text
My local Azure SQL Database container is not working. Diagnose it. Check my container runtime is installed, running, and set to Linux containers; check it has enough memory (the engine needs at least 2 GB); check port 1433 is free; check the image is running under linux/amd64 on this host; then read the container logs and tell me the actual cause and the fix.
```

With the [agent skills](#fastest-let-your-ai-agent-set-it-up) installed it already knows the image, the connection model, and the known failure modes, so it will usually name the cause on the first try. If it cannot fix it, it will offer to file a report for you.

Prefer to work through it yourself? Start below.

### Start here: check your container runtime

Most first-run failures are not the database, they are the runtime. Nothing checks these for you, so check all four:

1. **A container runtime is installed and up to date.** Any modern OCI runtime works: Docker 24+, Podman 5.0+, Rancher Desktop 1.13+, or containerd. Install and setup docs: [Docker](https://docs.docker.com/desktop/), [Podman](https://podman.io/docs/installation), [Rancher Desktop](https://docs.rancherdesktop.io/getting-started/installation/), [containerd](https://github.com/containerd/nerdctl).
2. **It is actually running.** `docker info` (or `podman info`) must return without an error. A fresh install does not always start the engine for you.
3. **It is set to run Linux containers.** This is a Linux container. On **Windows**, a runtime set to Windows containers cannot run it: switch it to Linux containers ([Docker](https://docs.docker.com/desktop/setup/install/windows-install/#switch-between-windows-and-linux-containers), [Rancher Desktop](https://docs.rancherdesktop.io/getting-started/installation/)). This is the most common Windows failure.
4. **It has enough memory.** The engine needs **at least 2 GB** to start, and will use most of what it is given. Allocate **4 GB and 2 CPUs** to the runtime (in Docker Desktop and Rancher Desktop this is under Settings, Resources; Podman machines are sized with `podman machine set --memory`). Too little memory shows up as a container that starts and then dies with no obvious error, which is the hardest failure to diagnose.

```bash
docker info    # or: podman info. If this fails, nothing below will work.
```

If any of these is wrong, fix it with your runtime's own documentation above; those problems are not specific to this container. Full requirements are on the [Prerequisites](prerequisites.md) page.

### The container will not start, or starts but will not accept connections

**Read the logs first.** They name the cause in almost every case, and the container status alone will mislead you:

```bash
docker logs sqldb
```

Two different symptoms, and it matters which one you have:

**The container exits.** Check for a missing `ACCEPT_EULA=Y`. The container refuses to start without it.

**The container says `Up`, but every connection fails** with a login timeout or "server is not found". The container is running; the database engine inside it is not. The usual causes:

- **The SA password does not meet the policy.** This is the most common cause, and it is the one that fools people, because the container stays `Up` while the engine refuses to start. `MSSQL_SA_PASSWORD` needs 8+ characters with at least three of: upper case, lower case, digits, symbols. The log says so; the container status does not.
- **Not enough memory.** The engine needs at least 2 GB. See the runtime check above.

Either way: fix the cause, remove the container (`docker rm -f sqldb`), and run it again. Changing the environment variable on a container that already exists does nothing; you have to recreate it.

### "no matching manifest" or "exec format error"

The image is **x64 only** (`linux/amd64`). On Apple Silicon or any other non-x64 host, add `--platform linux/amd64` to run it under emulation:

```bash
docker run --platform linux/amd64 --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
    -p 1433:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
```

### Port 1433 is already in use

Something else is bound to the port, often an existing SQL Server. Map a different host port and connect to that one instead:

```bash
docker run --name sqldb -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
    -p 1434:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
```

Then connect to `localhost,1434`.

### Connection fails right after the container starts

The engine is not ready the instant `docker run` returns; it takes a few seconds to recover its databases. Retry the connection rather than treating the first failure as fatal. If you script it, use `sqlcmd -C -b -l 2` in a retry loop so transient startup errors are retried instead of masked.

### "Cannot open database" or the database does not exist

The engine **does not auto-create databases**, exactly like Azure SQL Database in the cloud. Create yours on a `master` connection before connecting to it:

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
    -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

### `USE appdb` fails with Msg 40508

Expected, and it matches the cloud. Select the database in the connection string (`Database=appdb`, or `-d appdb` for sqlcmd) instead of switching with `USE`. See [Known limitations](known-limitations.md).

### It is not the Azure SQL engine

If `SELECT SERVERPROPERTY('EngineEdition')` does not return `5` and `Edition` is not `SQL Azure`, you are running the SQL Server image (`mcr.microsoft.com/mssql/server`) rather than this one. They are different products. Recreate the container with the image from [Step 1](#step-1-sign-in-and-pull-the-image).

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

This is a known issue in the installer ([vercel-labs/skills#1355](https://github.com/vercel-labs/skills/issues/1355)), not a problem with the skills.

### Still stuck?

1. **Is it a known gap?** Check [Known limitations](known-limitations.md) first. The behavior may be documented rather than broken.
2. **Is it your runtime, not the container?** If the container never starts, if `docker info` fails, or if the runtime cannot pull any image at all, it is a runtime problem and their documentation will fix it faster than we can: [Docker](https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/), [Podman](https://podman.io/docs), [Rancher Desktop](https://docs.rancherdesktop.io/getting-started/installation/).
3. **Still nothing? Tell us.** We would rather hear about it than have you work around it in silence.

- **Something wrong with the container:** [report a bug](https://aka.ms/azuresql-developer-bug). Include the image tag, your host OS, your container runtime and version, and the container logs.
- **Something wrong with an agent skill** (it told your agent the wrong thing, or no skill loaded): [report it here](https://aka.ms/sql-agent-skills-feedback). Tell us which skill, which agent, and what you had to do instead.

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
