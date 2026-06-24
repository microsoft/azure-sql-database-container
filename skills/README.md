# Azure SQL Database container agent skills

A collection of agent skills that teach an AI coding agent (Claude Code, GitHub Copilot, Codex, Cursor, and others) how to run and build against the Azure SQL Database container. Each skill is a folder with a `SKILL.md` (YAML frontmatter plus instructions); the core skill uses `references/` for on-demand detail.

## Skills

| Skill | What it does |
| --- | --- |
| [`azure-sql-database-container`](azure-sql-database-container/SKILL.md) | Core / entry point: sign in, pull, run on any engine and architecture, environment variables, connect and verify, troubleshoot. Hands off to the task skills below. |
| [`azure-sql-local-to-cloud`](azure-sql-local-to-cloud/SKILL.md) | Develop and test locally, then deploy to Azure SQL Database unchanged. |
| [`azure-sql-rag`](azure-sql-rag/SKILL.md) | Vector search and RAG with the native `VECTOR` type and `VECTOR_DISTANCE`. |
| [`azure-sql-ci`](azure-sql-ci/SKILL.md) | Run integration tests against the container as a CI service. |
| [`azure-sql-offline`](azure-sql-offline/SKILL.md) | Fully offline development and demos with seeded data. |
| [`azure-sql-sidecar`](azure-sql-sidecar/SKILL.md) | Add the container as a sidecar to an existing compose / Dev Container stack. |
| [`azure-sql-scaffold`](azure-sql-scaffold/SKILL.md) | Scaffold a new project (.NET Aspire, FastAPI, Next.js, NestJS) on the container. |

## Install

**With the skills CLI (cross-agent):**

```bash
npx skills add microsoft/azure-sql-database-container
```

This installs the skills into the agents it detects (for example `.claude/skills/`). The short name `azure-sql-database-container` works once the collection is published to the skills.sh registry; until then use the repository path above.

**Manually (Claude Code):** copy a skill folder into `.claude/skills/` in your project or home directory, for example:

```bash
mkdir -p .claude/skills
cp -R azure-sql-database-container .claude/skills/
```

**GitHub Copilot:** drop [`../samples/agent-skills/copilot-instructions/copilot-instructions.md`](../samples/agent-skills/copilot-instructions/copilot-instructions.md) into your repo as `.github/copilot-instructions.md`. The repo root [`AGENTS.md`](../AGENTS.md) is also picked up by the Copilot coding agent.

## Accuracy baseline

All skills use the preview registry `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest`, require `ACCEPT_EULA=Y` and a complex `MSSQL_SA_PASSWORD`, connect on port `1433`, and verify the engine with `SERVERPROPERTY('EngineEdition') = 5`. Registry, tag, and credentials are provisional during Private Preview and arrive in the welcome email.
