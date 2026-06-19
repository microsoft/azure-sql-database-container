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

1. **Understand modern developer workflows.** How do you actually use a local database in a Next.js, NestJS, FastAPI, .NET Aspire, Hono, or AI / RAG project? What does your inner loop look like? Where does the container fit and where does it not?
2. **Validate the inner-loop-to-outer-loop story.** Is the container truly a drop-in for Azure SQL Database in the cloud? Same connection string, same drivers, same T-SQL, same migrations, same behavior at deployment time.
3. **Validate AI-native scenarios.** Does the container work for prototyping RAG and vector-search applications using vector data types, vector search, and embeddings? Does the cloud handoff hold?
4. **Validate AI coding agent scenarios.** Can you hand a project to Claude, Codex, or GitHub Copilot with the container as the local database and have the agent scaffold the schema, the migrations, and the data access layer?
5. **Identify gaps and pain points.** Where does the container surprise you compared to the cloud database? Where does it surprise you compared to other local databases you have used?
6. **Assess the experience for code-first developers.** For developers who do not write T-SQL day to day, is the container approachable through the same drivers and ORMs they already use?

## What we are asking from you

- **Try the samples in the [samples folder](https://github.com/microsoft/azure-sql-database-container/tree/main/samples/).** Each sample includes a local-to-cloud leg using the Azure skills collection. Run both legs end-to-end and tell us where the seams are.
- **Build something real, however small.** A demo, a learning project, a feature in an existing application. The closer to your actual workflow, the better the feedback.
- **File issues for everything that surprises you.** Performance, behavior, ergonomics, documentation. Even small surprises matter. Use [GitHub Issues](https://github.com/microsoft/azure-sql-database-container/issues) for bugs and feature requests; use [GitHub Discussions](https://github.com/microsoft/azure-sql-database-container/discussions) for questions and ideas.
- **Show up to office hours.** A weekly slot for live questions, demos, and feedback. See the welcome email for the calendar invite.
- **Respond to the profiling survey.** Sent one week after sign-up. Five minutes, multiple choice. Helps us segment the cohort and tailor the engagement.

## What you get from us

- **Direct engineering channel.** The triage rotation is a named engineer per week. Bugs are acknowledged within one business day; P0 issues get an acknowledgement plus a plan within two business days.
- **Working samples across stacks.** Node.js + Prisma, Python + SQLAlchemy, AI / RAG, .NET Aspire, CLI. Each sample is tested end to end and includes the local-to-cloud deployment leg.
- **Container-specialized agent skills.** Loadable by any AI agent (Claude, Codex, GitHub Copilot) so the agent understands prerequisites, parameters, connection, common errors, and the local-to-cloud handoff.
- **Private Teams channel for real-time conversation.** Customers are under NDA; the channel is private and access-controlled.
- **Weekly office hours.** Live questions, demos, and roadmap updates. Engineering attends.

## What this Private Preview is not

- **It is not a SQL Server replacement.** This is the Azure SQL Database engine. PaaS-only behavior applies. If your workload depends on SQL Server features not present in Azure SQL Database, the container will not help you.
- **It is not a production database.** The license is a Private Preview license, scoped to development, testing, CI, and demos. Read the license you accepted at sign-up.
- **It is not feature-complete.** See [Known limitations](known-limitations.md) for the current gap list. Some features are still in active development.
