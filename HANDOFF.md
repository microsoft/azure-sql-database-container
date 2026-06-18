# HANDOFF for Claude Code

> **Audience:** Claude Code running in the cloned repository working tree.
> **Author:** prepared in Cowork by Carlos and Claude.
> **Date:** June 18, 2026

This file briefs you on what is done in this repository, what is left to do, and the rules you must follow while doing it. Read all of it before touching code.

## What is already done in this repository

- `README.md`: global TOC, persona block, local-to-cloud framing.
- `docs/`: six docs: what-is-the-container, goals-of-the-private-preview, prerequisites, getting-started, known-limitations, feedback-and-how-to-engage. Jekyll `_config.yml` and `index.md` for GitHub Pages.
- `.github/`: issue templates (bug_report.yml, feature_request.yml, config.yml routing to Discussions), Discussion templates (Q&A, Show & Tell, Ideas).
- `samples/agent-skills/`: full content. Claude Skill and Copilot custom instructions packaging the same container knowledge.
- `samples/azure-skills/`: README only. Scaffold for the local-to-cloud skill collection. The five SKILL.md files inside it are what you build.
- `samples/nodejs-prisma/`, `samples/python-sqlalchemy/`, `samples/ai-rag/`, `samples/dotnet-aspire/`, `samples/cli/`: README scaffolds only. The code is what you build.

## What you build

Five samples, in this priority order.

### Priority 1, in parallel:

1. **`samples/nodejs-prisma/`**: TypeScript Node.js application with Prisma ORM. Working `npm run dev` against the container locally. Local-to-cloud leg via Azure skills collection.
2. **`samples/python-sqlalchemy/`**: FastAPI + SQLAlchemy + Alembic. Default driver `mssql-python`. Local-to-cloud leg via Azure skills collection.
3. **`samples/ai-rag/`**: RAG application using vector data types, `VECTOR_DISTANCE`, and embeddings. Local embeddings via Ollama (`nomic-embed-text`). Cloud embeddings via Azure OpenAI. 20-50 document corpus.

### Priority 2:

4. **`samples/dotnet-aspire/`**: .NET 9 Aspire AppHost using `AddAzureSqlDatabase().RunAsContainer()`. EF Core migrations. `azd up` for the cloud leg.

### Priority 3:

5. **`samples/cli/`**: `docker-compose.yml`, wait-for-ready script, first-ten-queries sequence. No application code; the fastest evaluation path.

### Also build:

6. **`samples/azure-skills/`**: Five SKILL.md files under this folder, each single-purpose, as described in `samples/azure-skills/README.md`. Each language sample's cloud leg loads one or more of these skills.

## Specs and references you should read first

- `/Users/carlos/Azure SQL DB Container/docs/pm-docs/Azure SQL Database Container - Functional specification v2.2.2.docx`: the source of truth for engine surface, AI-native capabilities, and the seven user scenarios.
- `/Users/carlos/Azure SQL DB Container/specs/001-container-engine/`: Spec Kit spec for the container engine.
- `/Users/carlos/Azure SQL DB Container/specs/002-vscode-mssql-wizard/`: Spec Kit spec for the VS Code MSSQL wizard.
- `/Users/carlos/Azure SQL DB Container/specs/003-first-party-integrations/`: Spec Kit spec covering .NET Aspire and other first-party integrations.
- `/Users/carlos/Documents/Claude/Projects/Zero Dawn/sql-db-container/Private-Preview-Plan.docx`: the Private Preview plan, including the seven user scenarios in Section 6.

## Hard rules

These come from the project's CLAUDE.md and AGENTS.md. They are not optional.

1. **No em-dashes.** Anywhere. Not in code comments, not in docs, not in commit messages. Use colons, semicolons, commas, or periods.
2. **No internal Microsoft references in `docs/`.** No codenames, no internal hostnames, no person names. The samples folder follows the same rule unless the reference is a public product name.
3. **No AI co-author trailers in commits or PRs.** No "Co-authored-by: Claude" or similar.
4. **Do not push without review.** Carlos reviews every PR. Push to a feature branch, open a PR, and wait.

## Local to cloud is the differentiator

Every sample must include a working local-to-cloud leg. The handoff is the single most important property of this container. If you cannot make the cloud leg work for a sample, do not ship that sample with a half-broken cloud leg. Document the blocker and ship the local leg only, then file an issue.

The connection string is the only thing that changes between the two legs. The application code, the migration tool, and the schema are identical.

## Validation expectations

Before opening a PR for any sample:

- `npm run dev` (or equivalent for the stack) succeeds against a freshly started container.
- The migration runs both locally (against the container) and against a real Azure SQL Database (against the cloud leg).
- The sample's README is updated with concrete steps that match the code you shipped. Replace the "Status: scaffold" line with "Status: working."
- Run a grep for em-dashes (`grep -rnP '\x{2014}' .`) and a grep for any name in `docs/` and the sample (`grep -rn -E 'Travis|Andrew|Charles|Amit|Madhu|...' .`). Both should return empty in any file that ships.

## Validation framework

The Private Preview validation framework lives at:

- Live status: https://croblesm.github.io/sqldb-container-validation/
- Source: https://github.com/croblesm/sqldb-container-validation

Use it to confirm the four P0 known limitations are still active before referencing them in any new doc or sample workaround.

## PR strategy

- Open one PR per sample. Title format: `feat(samples/<name>): build <stack> sample with local and cloud legs`.
- Group the five Azure skills into a single PR (`feat(samples/azure-skills): build local-to-cloud skill collection`) because they share schema and reduce review thrash.
- Branch names follow `feat/sample-<name>` or `feat/azure-skills`.

## When you finish

Open a PR. Tag Carlos as reviewer. Do not merge.
