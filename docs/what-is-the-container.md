---
title: "What is the Azure SQL Database container?"
description: "The Azure SQL Database engine, running locally for development and CI: the same engine, defaults, and T-SQL as the Microsoft Azure cloud, with AI-ready capabilities."
---

## Table of Contents

- [Overview](#overview)
- [What makes it different](#what-makes-it-different)
- [Engine surface](#engine-surface)
- [AI-native capabilities](#ai-native-capabilities)
- [How it fits a developer workflow](#how-it-fits-a-developer-workflow)
- [Container runtimes and platforms](#container-runtimes-and-platforms)

## Overview

The Azure SQL Database container is the Azure SQL Database engine, running locally. It is for the developer who wants a local database that behaves like Azure SQL Database in the Microsoft Azure cloud, with no Azure subscription and no shared instance.

The container runs the same engine that powers Azure SQL Database in the cloud. That means the T-SQL dialect, the system views, the connection protocol, the driver behavior, and the AI-native capabilities are the same as in the cloud. The connection string changes; the application does not.

## What makes it different

The container is the **Azure SQL Database engine** itself, running locally. Three things follow from that:

1. **The same engine as the cloud.** The container runs the same engine, the same defaults, and the same T-SQL as Azure SQL Database. Features that are cloud-only in the box SQL Server product (Always Encrypted with secure enclaves, ledger, some DMVs) work locally the same way they work in the cloud.
2. **No Azure subscription required.** The container runs entirely on the developer machine or in CI. No service principal, no credit card, no shared instance. Free for local development and CI.
3. **Works with the drivers, ORMs, and editors you already use.** Everything that talks to Azure SQL Database talks to the container without changes: node-mssql, mssql-python, pyodbc, and mssql-jdbc; Prisma, SQLAlchemy, EF Core, Django, and TypeORM; sqlcmd, the MSSQL extension for VS Code, and SSMS.

## Engine surface

The container exposes the same engine surface as Azure SQL Database:

- T-SQL dialect aligned to the cloud engine, not to SQL Server box product behavior.
- `EngineEdition = 5` so application code that checks the edition behaves the same locally and in the cloud.
- System views and DMVs that are available in Azure SQL Database PaaS, including the ones that are not present in SQL Server.
- Wire protocol (TDS) compatible with every driver and ORM that connects to Azure SQL Database in the cloud.

## AI-native capabilities

The container supports the same AI-native capabilities as Azure SQL Database:

- **Native vector type.** Store embeddings in a native `vector` column, with the same type and storage as the cloud.
- **DiskANN vector indexes.** Build approximate-nearest-neighbor indexes with `CREATE VECTOR INDEX` for fast similarity search at scale.
- **Vector search.** Run similarity search with `VECTOR_DISTANCE` (cosine, euclidean, and dot product).
- **In-database embeddings and models.** Generate embeddings with `AI_GENERATE_EMBEDDINGS` and bind an embedding endpoint with `CREATE EXTERNAL MODEL`. Use a local model (Ollama) while you build, then switch to Azure OpenAI in the cloud.
- **REST from T-SQL.** Call external services with `sp_invoke_external_rest_endpoint`.
- **Modern data and query features.** Native JSON type and functions, RegEx functions, temporal tables, ledger, Row-Level Security, and Dynamic Data Masking.

This means developers can prototype a RAG application, an agentic workflow, or a vector-search feature locally against the container, then ship the same code to Azure SQL Database in the Microsoft Azure cloud without rewriting the data layer.

## How it fits a developer workflow

The container supports seven user scenarios drawn from the functional specification:

1. **Inner-loop to outer-loop transition.** Build and test locally against the container; point the same connection string at Azure SQL Database in the cloud and ship. No code changes.
2. **Build AI-ready applications locally.** Prototype RAG or vector-search applications using vector data types, vector search, and embeddings. Use Ollama or Foundry Local for embeddings during development; switch to Azure OpenAI in production.
3. **Leverage AI coding agents.** Hand the project to an AI coding agent (Claude, Codex, GitHub Copilot) with the container as the local database. Let the agent scaffold the schema, write the migrations, and write the data access layer.
4. **CI / CD integration tests.** Run end-to-end integration tests in GitHub Actions, Azure Pipelines, or any CI runner using the container as a service. No Azure subscription required, no rate limiting from a shared cloud database.
5. **Offline development for demos, classes, and labs.** Build and run a demo, teach a class, or run a workshop with no internet connectivity.
6. **Sidecar database in an application stack.** Use the container as a sidecar database in a `docker compose.yml` or a Dev Container. Wire-compatible with every driver and ORM the developer already uses.
7. **First-class option in cloud-native framework templates.** Select Azure SQL Database when scaffolding a new .NET Aspire, FastAPI, Next.js, NestJS, or Hono project, with the container as the default local-development resource.

## Container runtimes and platforms

The container is OCI-compliant and runs on any modern container runtime.

| Runtime           | Status    |
| ----------------- | --------- |
| Docker            | Supported |
| Podman            | Supported |
| containerd        | Supported |
| Rancher Desktop   | Supported |
| Apple Container   | Supported |

Host platforms:

| Host OS                        | Architecture | Status                              |
| ------------------------------ | ------------ | ----------------------------------- |
| macOS                          | arm64        | Supported (see Known limitations)   |
| macOS                          | x86_64       | Supported                           |
| Linux                          | x86_64       | Supported                           |
| Linux                          | arm64        | Supported (see Known limitations)   |
| Windows                        | x86_64       | Supported (Docker Desktop, WSL2)    |
| Windows                        | arm64        | Supported (Docker Desktop, WSL2)    |

See [Prerequisites](prerequisites.md) for setup details and [Known limitations](known-limitations.md) for current gaps.
