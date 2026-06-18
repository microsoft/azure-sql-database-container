# Container-specialized agent skills (tool-agnostic)

> **Version:** June 18, 2026
> **Status:** Private Preview

## What this is

A pair of skill packages that teach an AI agent how to work with the Azure SQL Database container. They are container-specialized: prerequisites, parameters, start and stop, connection, common errors, and the local-to-cloud handoff. They are tool-agnostic by design: the same underlying knowledge is shipped in two formats so any modern AI agent can load it.

The two formats:

- [claude-skill/SKILL.md](claude-skill/SKILL.md): a Claude Skill loadable by Claude (and by Codex if you point it at the file).
- [copilot-instructions/copilot-instructions.md](copilot-instructions/copilot-instructions.md): a GitHub Copilot custom instructions file that drops into `.github/copilot-instructions.md` of any repository.

Both formats wrap the same content. Pick the one that matches your agent. If you use multiple agents, install both.

## What an agent does after loading the skill

- Provisions and starts the container with a one-line command, using the right runtime for the host.
- Connects from `sqlcmd`, the MSSQL extension for VS Code, or any driver.
- Recognizes the four P0 known limitations and applies the correct workaround.
- Hands off to the [Azure skills collection](../azure-skills/) for local-to-cloud deployment without changing the application code.
- Answers "what is the engine edition?" and "is this SQL Server or Azure SQL Database?" correctly.

## Why this matters

The container is most useful when an AI coding agent treats it as a first-class local resource. The skill is the contract between the container and the agent.

If you find a question the agent cannot answer after loading the skill, please [file an issue](../../../issues/new?template=bug_report.yml) so we can extend the skill.
