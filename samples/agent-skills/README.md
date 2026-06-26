# Container-specialized agent skills

> **Status:** Private Preview

These skills teach an AI coding agent (Claude Code, GitHub Copilot, Codex, Cursor, and others) how to run and build against the Azure SQL Database container, so it can set everything up from a one-line prompt.

## Where the skills live

The canonical, installable skill collection is at [`skills/`](../../skills/) in the repository root. It contains the core container skill plus task skills (local-to-cloud, RAG, CI, offline, sidecar, scaffold). See the [skills README](../../skills/README.md) for the full list and install instructions.

```bash
npx skills add microsoft/azure-sql-database-container
```

## GitHub Copilot

For GitHub Copilot, drop [copilot-instructions/copilot-instructions.md](copilot-instructions/copilot-instructions.md) into your repository as `.github/copilot-instructions.md`. It mirrors the core skill. The repo root [`AGENTS.md`](../../AGENTS.md) is also read by the Copilot coding agent.

## Why this matters

The container is most useful when an AI agent treats it as a first-class local resource. The skill is the contract between the container and the agent. If the agent cannot answer something after loading the skill, please [file an issue](https://aka.ms/azuresqldb-container-bug) so we can extend it.
