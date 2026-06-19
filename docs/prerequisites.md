---
title: "Prerequisites"
description: "Supported host platforms, container runtimes, system resources, and tooling for running the Azure SQL Database container."
---

## Table of Contents

- [Supported host platforms](#supported-host-platforms)
- [Supported container runtimes](#supported-container-runtimes)
- [Apple Silicon (arm64) notes](#apple-silicon-arm64-notes)
- [System resources](#system-resources)
- [Network and connectivity](#network-and-connectivity)
- [Tooling](#tooling)
- [Azure account (optional, for local-to-cloud)](#azure-account-optional-for-local-to-cloud)

## Supported host platforms

| Host OS                        | Architecture | Status                                |
| ------------------------------ | ------------ | ------------------------------------- |
| macOS 14 or later              | arm64        | Supported (see Apple Silicon notes)   |
| macOS 14 or later              | x86_64       | Supported                             |
| Linux (Ubuntu, Debian, Fedora) | x86_64       | Supported                             |
| Linux (Ubuntu, Debian, Fedora) | arm64        | Supported                             |
| Windows 11                     | x86_64       | Supported (Docker Desktop or WSL2)    |
| Windows 11                     | arm64        | Supported (Docker Desktop or WSL2)    |

## Supported container runtimes

The container is OCI-compliant and runs on any modern runtime. Tested runtimes:

- **Docker Desktop** 4.30 or later
- **Podman** 5.0 or later
- **Rancher Desktop** 1.13 or later
- **containerd** (via `nerdctl` or Kubernetes)
- **Apple Container** (macOS)

Pick the runtime that already works on your machine. The container image and the connection behavior are the same across runtimes.

## Apple Silicon (arm64) notes

The container runs natively on Apple Silicon. If you encounter a regression specific to the arm64 image, the workaround is to start the container under Rosetta translation:

```bash
docker run --platform linux/amd64 ...
```

Track the arm64 layer status in [Known limitations](known-limitations.md).

## System resources

Minimum allocation for the container runtime:

- **CPU:** 2 cores
- **Memory:** 4 GB available to the runtime VM
- **Disk:** 10 GB free for the image and a small database; more for larger datasets

If your Docker Desktop or Rancher Desktop VM is set lower than this, the container may fail to start or may run with reduced performance.

## Network and connectivity

- **Initial pull:** You need an internet connection the first time you pull the image. After the pull, the container runs fully offline.
- **TDS port:** The container exposes port `1433` by default. Make sure it is not already in use, or remap it in your `docker compose.yml` or run command.
- **No outbound calls.** The container does not call home. It does not require internet connectivity at runtime.

## Tooling

Recommended developer tooling for working with the container:

- **VS Code** with the [MSSQL extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql) for query authoring, schema browsing, and inline AI assistance.
- **sqlcmd** (the modern Go-based `sqlcmd`) or **mssql-cli** for terminal access.
- **A driver or ORM for your stack.** Any driver that talks to Azure SQL Database works with the container without changes: `mssql` (Node.js), `mssql-python`, `pyodbc`, EF Core, Prisma, SQLAlchemy, JDBC.

## Azure account (optional, for local-to-cloud)

The container itself does not require an Azure subscription. The local-to-cloud leg in each sample (deploying the same application against Azure SQL Database in production) does require an Azure subscription with permission to create:

- An Azure SQL Database server and database
- A target compute resource for the application: Azure App Service, Azure Container Apps, or Azure Functions, depending on the stack

See the [Azure skills collection](../samples/azure-skills/) for the deploy flow. If you do not have an Azure subscription, you can still run every local sample and exercise the full inner loop.
