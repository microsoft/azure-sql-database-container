---
title: "What is Azure SQL Developer?"
description: "The Azure SQL Database engine, running locally for development and CI: the same engine, defaults, and T-SQL as the Microsoft Azure cloud, with AI-ready capabilities."
---

## Table of Contents

- [Overview](#overview)
- [What makes it different](#what-makes-it-different)
- [Engine surface](#engine-surface)
- [AI-native capabilities](#ai-native-capabilities)
- [How it fits a developer workflow](#how-it-fits-a-developer-workflow)
- [Container runtimes and platforms](#container-runtimes-and-platforms)
- [About this Private Preview](#about-this-private-preview)
- [Related content](#related-content)

## Overview

Azure SQL Developer is the Azure SQL Database engine, running locally in a container. It is for the developer who wants a local database that behaves like Azure SQL Database in the Microsoft Azure cloud, with no Azure subscription, no shared instance and no credit card required.

The container runs the same engine that powers Azure SQL Database in the cloud. That means the T-SQL dialect, the system views, the connection protocol, the driver behavior, and the AI-native capabilities are the same as in the cloud. The connection string changes; the application does not.

## What makes it different

The container is the **Azure SQL Database engine** itself, running locally. Three things follow from that:

1. **The same engine as the cloud.** The container runs the same engine, the same defaults, and the same T-SQL as Azure SQL Database. Features that are cloud-only in SQL Server (Always Encrypted with secure enclaves, ledger, some DMVs) work locally the same way they work in the cloud.
2. **No Azure subscription, no credit card required.** The container runs entirely on the developer machine or in CI. No service principal, no credit card, no shared instance. Free for local development and CI.
3. **Works with the drivers, ORMs, and editors you already use.** Everything that talks to Azure SQL Database talks to the container without changes: node-mssql, mssql-python, pyodbc, and mssql-jdbc; Prisma, SQLAlchemy, EF Core, Django, and TypeORM; sqlcmd, and VS Code with the MSSQL extension's GitHub Copilot integration. (Graphical tooling like the full MSSQL extension UI and SSMS is not yet 100% compatible; see [known limitations](known-limitations.md).)

## Engine surface

The container exposes the same engine surface as Azure SQL Database:

- T-SQL dialect aligned to the cloud engine, not to SQL Server behavior.
- `EngineEdition = 5` so application code that checks the edition behaves the same locally and in the cloud.
- System views and DMVs that are available in Azure SQL Database PaaS, including the ones that are not present in SQL Server.
- Wire protocol (TDS) compatible with every driver and ORM that connects to Azure SQL Database in the cloud.

## AI-native capabilities

The container supports the same AI-native capabilities as Azure SQL Database:

- **Native vector type.** Store embeddings in a native `vector` column, with the same type and storage as the cloud.
- **DiskANN vector indexes (in development).** `CREATE VECTOR INDEX` for approximate-nearest-neighbor search at scale is in active development; run full-scan `VECTOR_DISTANCE` queries today. See [Known limitations](known-limitations.md).
- **Vector search.** Run similarity search with `VECTOR_DISTANCE` (cosine, euclidean, and dot product).
- **In-database embeddings and models.** Generate embeddings with `AI_GENERATE_EMBEDDINGS` and bind an embedding endpoint with `CREATE EXTERNAL MODEL`. Use a local model (Ollama) while you build, then switch to Azure OpenAI in the cloud.
- **REST from T-SQL.** Call external services with `sp_invoke_external_rest_endpoint`.
- **Modern data and query features.** Native JSON type and functions, RegEx functions, temporal tables, ledger, Row-Level Security, and Dynamic Data Masking.

This means developers can prototype a RAG application, an agentic workflow, or a vector-search feature locally against the container, then ship the same code to Azure SQL Database in the Microsoft Azure cloud without rewriting the data layer.

## How it fits a developer workflow

The container supports seven user scenarios drawn from the functional specification:

1. **Inner-loop to outer-loop transition.** Build and test locally against the container; point the same connection string at Azure SQL Database in the cloud and ship. No code changes.
2. **Build AI-ready applications locally.** Prototype RAG or vector-search applications using vector data types, vector search, and embeddings. Use Ollama or Foundry Local for embeddings during development; switch to Azure OpenAI in production.
3. **Leverage AI coding agents.** Hand the project to an AI coding agent (Claude, Codex, GitHub Copilot) with Azure SQL Developer as the local database. Let the agent scaffold the schema, write the migrations, and write the data access layer.
4. **CI / CD integration tests.** Run end-to-end integration tests in GitHub Actions, Azure Pipelines, or any CI runner using the container as a service. No Azure subscription required, no rate limiting from a shared cloud database.
5. **Offline development for demos, classes, and labs.** Build and run a demo, teach a class, or run a workshop with no internet connectivity.
6. **Sidecar database in an application stack.** Use the container as a sidecar database in a `docker compose.yml` or a Dev Container. Wire-compatible with every driver and ORM the developer already uses.
7. **First-class option in cloud-native framework templates.** Select Azure SQL Database when scaffolding a new .NET Aspire, FastAPI, Next.js, NestJS, or Hono project, with Azure SQL Developer as the default local-development resource.

## Container runtimes and platforms

The container is OCI-compliant and runs on any modern container runtime.

| Runtime           | Status    |
| ----------------- | --------- |
| Docker            | Supported |
| Podman            | Supported |
| containerd        | Supported |
| Rancher Desktop   | Supported |

Host platforms. The image is x64 (`linux/amd64`); on a non-x64 host, add `--platform linux/amd64`.

| Host OS                        | Architecture | Status                                |
| ------------------------------ | ------------ | ------------------------------------- |
| macOS                          | x86_64       | Supported (native)                    |
| Linux                          | x86_64       | Supported (native)                    |
| Windows                        | x86_64       | Supported (WSL2)                      |

See [Prerequisites](prerequisites.md) for setup details and [Known limitations](known-limitations.md) for current gaps.

## About this Private Preview

This is the first time the container is in the hands of developers building real applications. Before opening it to a public audience, we want to validate that it meets the bar for the modern application developer: the inner loop is fast, the outer loop is the same engine, and the path from a local prototype to a production cloud database is real and not a slideware promise. Your feedback drives what graduates to Public Preview, and what gets cut.

### What we want to validate

1. **Developer workflows.** How the container fits into daily development across modern stacks, and where it does not.
2. **Local-to-cloud consistency.** Whether it is a true drop-in for Azure SQL Database: same connection string, drivers, T-SQL, migrations, and deployment behavior.
3. **AI-native development.** Whether vector and embedding scenarios work well for local RAG and transition cleanly to cloud.
4. **AI coding agent workflows.** Whether agents like Claude, Codex, and GitHub Copilot can reliably scaffold schema, migrations, and data access against the container.
5. **Gaps and friction.** Where behavior, performance, or ergonomics are surprising versus Azure SQL Database in the cloud or other local databases.
6. **Code-first usability.** Whether developers can be productive using familiar drivers and ORMs without deep T-SQL expertise.

### What we are asking from you

- **Try the ready-made prompts.** Point your AI agent at Azure SQL Developer with the [agent skill](https://github.com/microsoft/azure-sql-database-container/tree/main/skills) and a prompt from [docs/prompts](https://github.com/microsoft/azure-sql-database-container/tree/main/docs/prompts), and tell us where the seams are.
- **Build something real, however small.** A demo, a learning project, or a feature in an existing application. The closer to your actual workflow, the better the feedback.
- **File issues for everything that surprises you.** Performance, behavior, ergonomics, documentation. Use [GitHub Issues](https://github.com/microsoft/azure-sql-database-container/issues) for bugs and feature requests.
- **Show up to office hours.** A weekly slot for live questions, demos, and feedback. The calendar invite is shared via the early-access feedback channel.

### What you get from us

- **Direct engineering channel.** The triage rotation is a named engineer per week. Bugs are acknowledged within one business day; critical issues get an acknowledgement plus a plan within two business days.
- **Ready-made prompts and an agent skill.** Prompts for the common scenarios (local-to-cloud, AI / RAG, CI, offline, sidecar, scaffolding) plus a skill any AI agent can load so it understands the registry, image, connection, and the local-to-cloud handoff.
- **Private Teams channel for real-time conversation.** Customers are under NDA; the channel is private and access-controlled.
- **Weekly office hours.** Live questions, demos, and roadmap updates. Engineering attends.

### What this Private Preview is not

- **It is not a SQL Server replacement.** This is the Azure SQL Database engine. PaaS-only behavior applies. If your workload depends on SQL Server features not present in Azure SQL Database, the container will not help you.
- **It is not a production database.** The container is for your local inner loop; for production, deploy the same code to Azure SQL Database in the Microsoft Azure cloud. The license is a Private Preview license, scoped to development, testing, CI, and demos. Read the license you accepted when you [signed up](https://aka.ms/sqldbcontainerpreview-signup).
- **It is not feature-complete.** See [Known limitations](known-limitations.md) for the current gap list. Some features are still in active development.

## Related content

- [Prerequisites](prerequisites.md)
- [Get started](getting-started.md)
- [Known limitations](known-limitations.md)
- [Feedback and how to engage](feedback-and-how-to-engage.md)
- [Report a bug](feedback.html#bug)
- [Request a feature](feedback.html#feature)
