---
title: "Prerequisites"
description: "Supported host platforms, container runtimes, system resources, and tooling for running the Azure SQL Database container."
---

## Table of Contents

- [Supported host platforms](#supported-host-platforms)
- [Supported container runtimes](#supported-container-runtimes)
- [System resources](#system-resources)
- [Network and connectivity](#network-and-connectivity)
- [Agent skill](#agent-skill)
- [Tooling](#tooling)
- [Azure account (optional, for local-to-cloud)](#azure-account-optional-for-local-to-cloud)

## Supported host platforms

The image is x64 (`linux/amd64`); on a non-x64 host, add `--platform linux/amd64`.

| Host OS                        | Architecture | Status                                       |
| ------------------------------ | ------------ | -------------------------------------------- |
| macOS 14 or later              | x86_64       | Supported (native)                           |
| Linux (Ubuntu, Debian, Fedora) | x86_64       | Supported (native)                           |
| Windows 11                     | x86_64       | Supported (WSL2)                             |

## Supported container runtimes

The container is OCI-compliant and runs on any modern runtime. Tested runtimes:

- **Docker** 24 or later
- **Podman** 5.0 or later
- **Rancher Desktop** 1.13 or later
- **containerd** (via `nerdctl` or Kubernetes)

Pick the runtime that already works on your machine. The container image and the connection behavior are the same across runtimes.

## System resources

Minimum allocation for the container runtime:

- **CPU:** 2 cores
- **Memory:** 4 GB available to the runtime VM
- **Disk:** 10 GB free for the image and a small database; more for larger datasets

If your container runtime's VM is set lower than this, the container may fail to start or may run with reduced performance.

## Network and connectivity

- **Initial pull:** You need an internet connection the first time you pull the image. After the pull, the container runs fully offline.
- **TDS port:** The container exposes port `1433` by default. Make sure it is not already in use, or remap it in your `docker compose.yml` or run command.
- **No outbound calls.** The container does not call home. It does not require internet connectivity at runtime.

## Agent skill

If you are driving the container with an AI coding agent (Claude Code, Codex, GitHub Copilot, or Cursor) or from the CLI, install the container skill first. For that workflow it is a hard requirement, more important than any individual tool below: the skill teaches your agent the registry sign-in, image name, ports, connection string, and the local-to-cloud handoff, so a single plain-English prompt is enough.

```bash
npx skills add microsoft/azure-sql-database-container
```

It works across Claude Code, GitHub Copilot, Codex, and Cursor. Browse the skill and ready-made prompts in [agent skills](https://github.com/microsoft/azure-sql-database-container/tree/main/skills). Without it, the agent will not know how to sign in to the registry, which image to run, or how to connect.

## Tooling

Recommended developer tooling for working with the container:

- **sqlcmd** (the modern Go-based `sqlcmd`) or **mssql-cli** for terminal access. The container also bundles `sqlcmd`, so you can query it with `docker exec` and no host install.
- **A driver or ORM for your stack.** Any driver that talks to Azure SQL Database works with the container without changes: `mssql` (Node.js), `mssql-python`, `pyodbc`, EF Core, Prisma, SQLAlchemy, JDBC.

## Azure account (optional, for local-to-cloud)

The container itself does not require an Azure subscription. The local-to-cloud leg (deploying the same application against Azure SQL Database in production) does require an Azure subscription with permission to create:

- An Azure SQL Database server and database
- A target compute resource for the application: Azure App Service, Azure Container Apps, or Azure Functions, depending on the stack

See the [local-to-cloud skill](https://github.com/microsoft/azure-sql-database-container/tree/main/skills/azuresql-db-local-to-cloud) for the deploy flow. If you do not have an Azure subscription, you can still do all local development and exercise the full inner loop.
