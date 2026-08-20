---
title: "Agent skills"
description: "Install the Azure SQL Database container agent skills in Claude Code, Codex, Cursor, or VS Code with GitHub Copilot, and let your AI agent run, connect to, and build against the local engine."
---

## Table of Contents

- [Install](#install)
- [The skills](#the-skills)
- [Install by tool](#install-by-tool)
  - [Claude Code](#claude-code)
  - [Codex](#codex)
  - [Cursor](#cursor)
  - [VS Code with GitHub Copilot](#vs-code-with-github-copilot)
- [Confirm the skills loaded](#confirm-the-skills-loaded)
- [Report a problem with a skill](#report-a-problem-with-a-skill)
- [Related content](#related-content)

## Install

The Azure SQL Database container is the Azure SQL Database engine, running locally. The skills teach your AI coding agent to use it the right way: start the engine, connect, provision the database, apply migrations, import data, scaffold a new app, build local RAG, wire CI, and move the same code to Azure SQL Database in the cloud. They encode what a model does not otherwise know: the private preview registry, that the engine reports `EngineEdition` 5, that it does not auto-create databases, and that it is not the SQL Server image.

Install the whole collection with one command. It works in **Claude Code, Codex, Cursor, and VS Code with GitHub Copilot**:

```bash
npx skills add microsoft/azure-sql-database-container
```

Then ask your agent in plain English, for example:

> Add a local Azure SQL Database to this project, then scaffold the schema, migrations, and data-access layer for my stack.

For the native plugin install (Claude Code and Codex), a single skill, or per-tool detail, see [Install by tool](#install-by-tool) below.

## The skills

Seventeen skills ship in the collection. Each one stands alone and teaches your agent one job; the collection routes between them.

> **Layered knowledge.** Every skill carries its knowledge in three layers: the instructions in the skill, deeper `references/` (including curated, version-pinned config shapes), and an optional live layer via the public [Microsoft Learn MCP server](https://learn.microsoft.com/en-us/training/support/mcp) that fetches the *current* Microsoft docs and schemas on demand. The MCP is optional; the skills work without it. See [Using the Microsoft Learn MCP]({{ site.repo }}/tree/main/skills#using-the-microsoft-learn-mcp-optional) to enable it.

<div class="skill-cards">
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-container" rel="noopener">
    <span class="skill-tag">azuresql-db-container</span>
    <h4>Start the engine <span class="arrow">&rarr;</span></h4>
    <p>Free host port, <code>--platform linux/amd64</code> on non-x64 hosts, a ready-wait loop, and <code>CREATE DATABASE appdb</code> (the engine does not auto-create databases).</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-from-sql-server" rel="noopener">
    <span class="skill-tag">azuresql-db-from-sql-server</span>
    <h4>Convert from SQL Server <span class="arrow">&rarr;</span></h4>
    <p>Move a project off the <code>mcr.microsoft.com/mssql/server</code> SQL Server image to the real Azure SQL Database engine.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-local-to-cloud" rel="noopener">
    <span class="skill-tag">azuresql-db-local-to-cloud</span>
    <h4>Local to cloud <span class="arrow">&rarr;</span></h4>
    <p>Ship the same code to Azure SQL Database in the cloud; only the connection string changes.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-schema-migration" rel="noopener">
    <span class="skill-tag">azuresql-db-schema-migration</span>
    <h4>Schema migrations <span class="arrow">&rarr;</span></h4>
    <p>Apply EF Core, Prisma, Alembic, or SqlPackage migrations against the user database.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-import" rel="noopener">
    <span class="skill-tag">azuresql-db-import</span>
    <h4>Import a database <span class="arrow">&rarr;</span></h4>
    <p>Load an existing <code>.bacpac</code> / <code>.dacpac</code> into the container with SqlPackage.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-rag" rel="noopener">
    <span class="skill-tag">azuresql-db-rag</span>
    <h4>RAG and vector search <span class="arrow">&rarr;</span></h4>
    <p>Native <code>VECTOR</code> type and <code>VECTOR_DISTANCE</code>, with a local embedding model.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-ci" rel="noopener">
    <span class="skill-tag">azuresql-db-ci</span>
    <h4>CI <span class="arrow">&rarr;</span></h4>
    <p>Run the engine as a service in GitHub Actions, with the right readiness and provisioning.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-sidecar" rel="noopener">
    <span class="skill-tag">azuresql-db-sidecar</span>
    <h4>Sidecar <span class="arrow">&rarr;</span></h4>
    <p>Add it to a docker compose stack or Dev Container, wired by service name.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-scaffold" rel="noopener">
    <span class="skill-tag">azuresql-db-scaffold</span>
    <h4>Scaffold <span class="arrow">&rarr;</span></h4>
    <p>Bootstrap a new app with the container as the default local database.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-dab" rel="noopener">
    <span class="skill-tag">azuresql-db-dab</span>
    <h4>REST + GraphQL API <span class="arrow">&rarr;</span></h4>
    <p>Instant no-code REST and GraphQL over your tables with Data API Builder. Also serves DAB's built-in MCP endpoint.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-functions" rel="noopener">
    <span class="skill-tag">azuresql-db-functions</span>
    <h4>Serverless + event-driven <span class="arrow">&rarr;</span></h4>
    <p>Azure Functions over the engine: HTTP CRUD via SQL bindings, and the SQL trigger (Change Tracking) for reacting to row changes locally.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-seed" rel="noopener">
    <span class="skill-tag">azuresql-db-seed</span>
    <h4>Seed test data <span class="arrow">&rarr;</span></h4>
    <p>Populate the local dev database with realistic sample data across related tables, in foreign-key order.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-testing" rel="noopener">
    <span class="skill-tag">azuresql-db-testing</span>
    <h4>Integration testing <span class="arrow">&rarr;</span></h4>
    <p>Spin up the engine per test with Testcontainers (.NET, Node, Python, Java), then tear it down. Distinct from the CI skill.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-connections" rel="noopener">
    <span class="skill-tag">azuresql-db-connections</span>
    <h4>Reliable connections <span class="arrow">&rarr;</span></h4>
    <p>Connection pooling plus retry and transient-fault handling, so the same code survives Azure SQL in the cloud.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-auth" rel="noopener">
    <span class="skill-tag">azuresql-db-auth</span>
    <h4>Connect securely <span class="arrow">&rarr;</span></h4>
    <p>Least-privilege database user instead of <code>sa</code>, the right auth per environment (SQL locally, Microsoft Entra or managed identity in the cloud), and the secret kept out of source.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-faq" rel="noopener">
    <span class="skill-tag">azuresql-db-faq</span>
    <h4>Answer questions <span class="arrow">&rarr;</span></h4>
    <p>What the container can and can't do, and why it differs from the cloud: backups, <code>USE</code>, vector index, x64-only, tooling.</p>
  </a>
  <a class="skill-card" href="{{ site.repo }}/tree/main/skills/azuresql-db-feedback" rel="noopener">
    <span class="skill-tag">azuresql-db-feedback</span>
    <h4>Report a problem <span class="arrow">&rarr;</span></h4>
    <p>Your agent writes the bug report for you, from what it already knows, and hands you a prefilled issue to review. It never files anything without your say-so.</p>
  </a>
  {% assign one_skills = "azuresql-db-container|Start the engine,azuresql-db-from-sql-server|Convert from SQL Server,azuresql-db-local-to-cloud|Local to cloud,azuresql-db-schema-migration|Schema migrations,azuresql-db-import|Import a database,azuresql-db-rag|RAG and vector search,azuresql-db-ci|CI,azuresql-db-sidecar|Sidecar,azuresql-db-scaffold|Scaffold,azuresql-db-dab|REST + GraphQL API,azuresql-db-functions|Serverless + event-driven,azuresql-db-seed|Seed test data,azuresql-db-testing|Integration testing,azuresql-db-connections|Reliable connections,azuresql-db-auth|Connect securely,azuresql-db-faq|Answer questions,azuresql-db-feedback|Report a problem" | split: "," %}
</div>
<div class="skill-more">
  <button class="skill-more-btn skill-more-alt" type="button" data-open-modal="single-skill">Install a single skill</button>
</div>

<dialog class="modal" id="single-skill" aria-labelledby="single-skill-title">
  <div class="modal-head">
    <div>
      <h3 id="single-skill-title">Install a single skill</h3>
      <p>Each skill stands alone, so one is enough to be useful. You only lose the handoffs between them.</p>
    </div>
    <button class="modal-close" type="button" data-close-modal aria-label="Close">&times;</button>
  </div>
  <div class="modal-body">
    <table class="skill-install-table">
      {% for row in one_skills %}
        {% assign parts = row | split: "|" %}
        {% assign sname = parts[0] %}
        <tr>
          <td class="si-name"><code>{{ sname }}</code></td>
          <td class="si-what">{{ parts[1] }}</td>
          <td class="si-act">
            <button class="copy-btn copy-light" type="button" data-copy-text="npx skills add microsoft/azure-sql-database-container --skill {{ sname }}" aria-label="Copy the install command for {{ sname }}"><span class="copy-label">Copy</span></button>
          </td>
        </tr>
      {% endfor %}
    </table>
  </div>
</dialog>

## Install by tool

The `npx skills add` command above works everywhere. Claude Code and Codex additionally have a native plugin install, which lets the tool manage updates for you.

### Claude Code

Install as a native plugin. In Claude Code, run:

```text
/plugin marketplace add microsoft/azure-sql-database-container
/plugin install azure-sql-database-container@azure-sql-database-container
```

The first command registers this repository as a plugin marketplace; the second installs the `azure-sql-database-container` plugin, which contains all 17 skills. Run `/plugin` any time to manage it, and `/reload-plugins` to activate it in the current session. The portable `npx skills add microsoft/azure-sql-database-container` works too.

### Codex

Install as a native plugin:

```bash
codex plugin marketplace add microsoft/azure-sql-database-container
codex plugin add azure-sql-database-container@azure-sql-database-container
```

Or with the portable command: `npx skills add microsoft/azure-sql-database-container`.

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

## Report a problem with a skill

If a skill tells your agent the wrong thing, or no skill loads when one should, tell us: [aka.ms/sql-agent-skills-feedback](https://aka.ms/sql-agent-skills-feedback). Say which skill, which agent, and what you had to do instead. That is the feedback we are least able to get any other way. For problems with the container itself, [file a bug](https://aka.ms/azuresqldb-container-bug) instead.

## Related content

- [Getting started](getting-started.md)
- [Prerequisites](prerequisites.md)
- [Known limitations](known-limitations.md)
- [Browse the skills on GitHub](https://github.com/microsoft/azure-sql-database-container/tree/main/skills)
- [Report a bug](https://aka.ms/azuresqldb-container-bug)
- [Skill feedback](https://aka.ms/sql-agent-skills-feedback)
