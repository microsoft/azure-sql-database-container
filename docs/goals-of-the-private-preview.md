---
title: "Goals of the Private Preview"
description: "What this Private Preview sets out to learn and validate, and what we are asking participants to help us prove."
---

## Table of Contents

- [Why we are running this Private Preview](#why-we-are-running-this-private-preview)
- [What we want to validate](#what-we-want-to-validate)
- [What we are asking from you](#what-we-are-asking-from-you)
- [What you get from us](#what-you-get-from-us)
- [What this Private Preview is not](#what-this-private-preview-is-not)

## Why we are running this Private Preview

The Azure SQL Database container is a new local-development surface for the Azure SQL Database engine. Before opening it to a public audience, we want to validate that it meets the bar for the modern application developer building data-driven and AI-driven applications: the inner loop is fast, the outer loop is the same engine, and the path from a local prototype to a production cloud database is real and not a slideware promise.

This Private Preview is the first time the container is in the hands of real developers building real applications. Your feedback drives what graduates to Public Preview, and what gets cut.

## What we want to validate

1. **Real developer workflows.** How the container fits into daily development across modern stacks, and where it does not
2. **Local-to-cloud consistency.** Whether it is a true drop-in for Azure SQL Database: same connection string, drivers, T-SQL, migrations, and deployment behavior.
3. **AI-native development.** Whether vector and embedding scenarios work well for local RAG and transition cleanly to cloud.
4. **AI coding agent workflows.** Whether agents like Claude, Codex, and GitHub Copilot can reliably scaffold schema, migrations, and data access against the container
5. **Gaps and friction.** Where behavior, performance, or ergonomics are surprising versus Azure SQL Database in cloud or other local databases.
6. **Code-first usability.** Whether developers can be productive using familiar drivers and ORMs without deep T-SQL expertise.

## What we are asking from you

- **Try the samples in the [samples folder](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/).** Each sample includes a local-to-cloud leg using the Azure skills collection. Run both legs end-to-end and tell us where the seams are.
- **Build something real, however small.** A demo, a learning project, a feature in an existing application. The closer to your actual workflow, the better the feedback.
- **File issues for everything that surprises you.** Performance, behavior, ergonomics, documentation. Use [GitHub Issues](https://github.com/microsoft/azure-sql-database-container/issues) for bugs and feature requests;
- **Show up to office hours.** A weekly slot for live questions, demos, and feedback. See the welcome email for the calendar invite.


## What you get from us

- **Direct engineering channel.** The triage rotation is a named engineer per week. Bugs are acknowledged within one business day; critical issues get an acknowledgement plus a plan within two business days.
- **Working samples across stacks.** Node.js + Prisma, Python + SQLAlchemy, AI / RAG, .NET Aspire, CLI. Each sample is tested end to end and includes the local-to-cloud deployment leg.
- **Container-specialized agent skills.** Loadable by any AI agent (Claude, Codex, GitHub Copilot) so the agent understands prerequisites, parameters, connection, common errors, and the local-to-cloud handoff.
- **Private Teams channel for real-time conversation.** Customers are under NDA; the channel is private and access-controlled.
- **Weekly office hours.** Live questions, demos, and roadmap updates. Engineering attends.

## What this Private Preview is not

- **It is not a SQL Server replacement.** This is the Azure SQL Database engine. PaaS-only behavior applies. If your workload depends on SQL Server features not present in Azure SQL Database, the container will not help you.
- **It is not a production database.** The license is a Private Preview license, scoped to development, testing, CI, and demos. Read the license you accepted at sign-up.
- **It is not feature-complete.** See [Known limitations](known-limitations.md) for the current gap list. Some features are still in active development.
