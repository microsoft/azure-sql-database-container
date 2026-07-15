---
title: "Agent skills"
description: "Install the Azure SQL Developer agent skills in Claude Code, Codex, Cursor, or VS Code with GitHub Copilot, and let your AI agent run, connect to, and build against the local engine."
---

## Table of Contents

- [What the skills do](#what-the-skills-do)
- [Install by tool](#install-by-tool)
  - [Claude Code](#claude-code)
  - [Codex](#codex)
  - [Cursor](#cursor)
  - [VS Code with GitHub Copilot](#vs-code-with-github-copilot)
- [Confirm the skills loaded](#confirm-the-skills-loaded)
- [What each skill does](#what-each-skill-does)
- [Report a problem with a skill](#report-a-problem-with-a-skill)
- [Related content](#related-content)

## What the skills do

The skills teach your AI coding agent to use Azure SQL Developer, the Azure SQL Database engine running locally in a container, the right way: start the engine, connect, provision the database, apply migrations, import data, scaffold a new app, build local RAG, wire CI, run it as a sidecar, and move the same code to Azure SQL Database in the cloud. They encode the things a model does not otherwise know: the private preview registry, that the engine reports `EngineEdition` 5, that it does not auto-create databases, and that it is not the SQL Server image.

Eleven skills ship in the collection. Install them once, then ask your agent in plain English, for example:

> Add a local Azure SQL Database to this project, then scaffold the schema, migrations, and data-access layer for my stack.

The skills work in **Claude Code, Codex, Cursor, and VS Code with GitHub Copilot**. One folder format, all four tools.

## Install by tool

### Claude Code

Install as a native plugin so Claude Code manages updates for you. In Claude Code, run:

```text
/plugin marketplace add microsoft/azure-sql-database-container
/plugin install azure-sql-developer@azure-sql-developer
```

The first command registers this repository as a plugin marketplace; the second installs the `azure-sql-developer` plugin, which contains all 11 skills. Run `/plugin` any time to manage it, and `/reload-plugins` to activate it in the current session.

Prefer not to use the plugin system? The portable command works too:

```bash
npx skills add microsoft/azure-sql-database-container
```

### Codex

Install as a native plugin:

```bash
codex plugin marketplace add microsoft/azure-sql-database-container
codex plugin add azure-sql-developer@azure-sql-developer
```

Or with the portable command:

```bash
npx skills add microsoft/azure-sql-database-container
```

### Cursor

```bash
npx skills add microsoft/azure-sql-database-container
```

### VS Code with GitHub Copilot

`npx skills add` writes to a folder that Copilot reads automatically, so no extra step is needed:

```bash
npx skills add microsoft/azure-sql-database-container
```

Find the skills in Copilot Chat under **Configure Chat** (the gear icon) on the **Skills** tab, or by typing `/skills` in chat.

## Confirm the skills loaded

Your agent reads skills from its own folder. After installing, confirm they are there. For Claude Code:

```bash
ls .claude/skills/
```

You should see the `azuresql-db-*` directories. Other agents read from different folders (Codex from `.codex/skills/` or `.agents/skills/`, Cursor from `.cursor/skills/`, VS Code Copilot from `.github/skills/` or `~/.copilot/skills/`).

If the folder is empty while `.agents/skills/` has the skills in it, the `npx` installer did not target your agent, and it can report success when this happens. Re-run it naming your agent, for example `npx skills add microsoft/azure-sql-database-container -a claude-code`. This is a [known installer issue](https://github.com/vercel-labs/skills/issues/1355), not a problem with the skills. The plugin install paths above (Claude Code and Codex) are not affected.

## What each skill does

| Skill | What it does |
| --- | --- |
| **azuresql-db-container** | Start the engine locally the correct way, and provision the first database. The foundation the others build on. |
| **azuresql-db-from-sql-server** | Move a project off the SQL Server image onto the real Azure SQL Database engine. |
| **azuresql-db-local-to-cloud** | Take code that works locally and move it to Azure SQL Database in the cloud, changing only the connection string. |
| **azuresql-db-schema-migration** | Apply and version schema changes: EF Core, Prisma, Alembic, or SqlPackage, against the user database. |
| **azuresql-db-import** | Load an existing `.bacpac` or `.dacpac` into the container with SqlPackage. |
| **azuresql-db-rag** | Build local vector search and RAG on the native `VECTOR` type and `VECTOR_DISTANCE`. |
| **azuresql-db-ci** | Run the engine as a service in GitHub Actions or other CI, with the right readiness and provisioning. |
| **azuresql-db-sidecar** | Add the engine to a Docker Compose stack or Dev Container, wired by service name. |
| **azuresql-db-scaffold** | Scaffold a new app (.NET Aspire, FastAPI, Next.js, NestJS) wired to the engine as its dev database. |
| **azuresql-db-faq** | Answer what the container can and cannot do, and why it differs from the cloud. |
| **azuresql-db-feedback** | Report a bug or request a feature without leaving the agent; builds a prefilled GitHub issue for you to review. |

To install a single skill instead of the collection, see [Install just one](https://github.com/microsoft/azure-sql-database-container/tree/main/skills#install-just-one) in the skills README. Installing the whole collection is recommended, since the skills hand off to each other.

## Report a problem with a skill

If a skill tells your agent the wrong thing, or no skill loads when one should, tell us: [aka.ms/sql-agent-skills-feedback](https://aka.ms/sql-agent-skills-feedback). Say which skill, which agent, and what you had to do instead. That is the feedback we are least able to get any other way. For problems with the container itself, [file a bug](https://aka.ms/azuresql-developer-bug) instead.

## Related content

- [Getting started](getting-started.md)
- [Prerequisites](prerequisites.md)
- [Known limitations](known-limitations.md)
- [Browse the skills on GitHub](https://github.com/microsoft/azure-sql-database-container/tree/main/skills)
- [Report a bug](https://aka.ms/azuresql-developer-bug)
- [Skill feedback](https://aka.ms/sql-agent-skills-feedback)
