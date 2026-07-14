# Azure SQL Developer - Agent skills

These skills teach an AI coding agent to use **Azure SQL Developer** the right way. Azure SQL Developer is the Azure SQL Database engine, running locally in a container. It is for the developer who wants a local database that behaves like Azure SQL Database in the Microsoft Azure cloud, with no Azure subscription, no shared instance, and no credit card required. The container runs the same engine that powers Azure SQL Database in the cloud: the T-SQL dialect, the system views, the connection protocol, the driver behavior, and the AI-native capabilities are the same as in the cloud. The connection string changes; the application does not.

You can prove the identity from any connection:

```sql
SELECT SERVERPROPERTY('EngineEdition');  -- 5
SELECT SERVERPROPERTY('Edition');        -- 'SQL Azure'
```

EngineEdition `5` and Edition `'SQL Azure'` are the cloud engine's fingerprint. The SQL Server image (`mcr.microsoft.com/mssql/server`) returns different values and is **not** the same product. If an agent was about to reach for that SQL Server image, it should stop and use this instead.

> Status: **Private Preview.** Registry, image tag, and credentials are provisional and may change.

---

## What's in this collection

| Skill | What it does |
| --- | --- |
| **azuresql-db-container** | Start the Azure SQL Database engine locally the correct way: free-port selection, conditional `--platform linux/amd64` on non-x64 hosts, ready-wait retry loop, and `CREATE DATABASE appdb` provisioning. The foundation every other skill builds on. |
| **azuresql-db-from-sql-server** | Migrate a workflow off the SQL Server image (`mcr.microsoft.com/mssql/server`) onto the real cloud engine. Swaps the image, fixes the connection model, and verifies EngineEdition=5 / Edition='SQL Azure'. |
| **azuresql-db-local-to-cloud** | Take a database that works against the local engine and move it to Azure SQL Database in the cloud. Because it is the same engine, parity is the default, not a porting exercise. |
| **azuresql-db-schema-migration** | Apply and version schema changes against the engine: idempotent DDL, ordered migration scripts, run against `appdb` (never `master`). |
| **azuresql-db-import** | Load data into `appdb` after provisioning: bulk and script-based import. Does **not** rely on auto-run init directories (that convention is not honored here). |
| **azuresql-db-rag** | Build retrieval-augmented generation on the engine's native `VECTOR(n)` type and `VECTOR_DISTANCE('cosine', a, b)`, using full-scan top-k while DiskANN vector indexing is still in development. |
| **azuresql-db-ci** | Run the engine in continuous integration: ephemeral container, ready-wait, provision, seed, test, tear down. Fails closed on the wrong image. |
| **azuresql-db-sidecar** | Run the engine as a sidecar alongside an app (compose-style), with `platform: linux/amd64` on non-x64 hosts and a single `SQL_CONNECTION_STRING` contract. |
| **azuresql-db-scaffold** | Scaffold a new app wired to the engine: connection string via one `SQL_CONNECTION_STRING` env var, provisioning step, and seed step in the correct order. |
| **azuresql-db-faq** | Answer questions about what the container can and cannot do, and why it differs from the cloud (backups, `USE`, vector index, GUI tooling, registry). Sorts each into engine vs. managed-service vs. SQL Server, and links the live Known limitations. |
| **azuresql-db-feedback** | Report a bug or request a feature without leaving the agent. Builds a complete, prefilled GitHub issue from context the agent already has (image tag, host OS, runtime, the failing command, the error), redacts secrets, and hands it to you to review and submit. It never submits anything without your explicit confirmation. |

---

## INSTALL

### `npx skills add` (cross-agent, skills.sh)

The portable way. Works across agents that follow the skills.sh convention. The source is the **repository**, not a skill name:

```bash
npx skills add microsoft/azure-sql-database-container
```

Add `--all` to take every skill without prompting, or `-s` to pick a subset:

```bash
npx skills add microsoft/azure-sql-database-container -s azuresql-db-container,azuresql-db-rag
```

> **On Windows, add `--copy`.** By default the installer writes the skills to `.agents/skills/` and *symlinks* them into your agent's directory. Creating a symlink on Windows requires Developer Mode or an elevated shell, and when it fails the installer can still report success, leaving you with skills your agent never loads. `--copy` writes real directories instead and sidesteps the problem:
>
> ```bash
> npx skills add microsoft/azure-sql-database-container --copy
> ```
>
> This is safe on every platform, so use it if you are unsure.

**Then verify the skills actually loaded.** This is the step worth not skipping:

```bash
ls .claude/skills/          # Claude Code; see the matrix below for other agents
```

You should see the ten `azuresql-db-*` directories. If the directory is missing or empty while `.agents/skills/` is populated, the symlink step failed: re-run with `--copy`, or copy them across by hand:

```bash
mkdir -p .claude/skills && cp -R .agents/skills/azuresql-db-* .claude/skills/
```

### Manual install

Equally supported, and immune to the above. Drop each skill directory into your agent's skills folder (see the matrix), for example for Claude Code at the root of your project, or `~/.claude/skills/` to make it available everywhere:

```bash
mkdir -p .claude/skills
cp -R skills/azuresql-db-* .claude/skills/
```

### INSTALL MATRIX

Same skills, per-agent install location (mirrors how Google, Supabase, and Neon ship their collections):

| Agent | Install location |
| --- | --- |
| Claude Code | `.claude/skills/` (project) or `~/.claude/skills/` (global) |
| GitHub Copilot (VS Code + CLI) | `.github/skills/` (the VS Code extension and the Copilot CLI both read it) |
| Codex | `~/.codex/skills/` |
| Cursor | `.cursor/skills/` (project) |

`npx skills add` targets the active agent automatically; the table above is for manual placement, and for knowing where to look when you verify.

---

## Authoring standard

These skills follow the published Agent Skills guidance rather than a house style invented here. If you are adding a skill or editing one, read these first:

- **[Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)** (Anthropic): the primary reference. Descriptions, progressive disclosure, degrees of freedom, feedback loops, and the anti-patterns.
- **[Agent Skills open standard](https://agentskills.io/home)** ([spec on GitHub](https://github.com/agentskills/agentskills)): the vendor-neutral format these skills conform to, so they load in Claude Code, GitHub Copilot, Codex, and Cursor without change.
- **[Evaluating skills](https://developers.openai.com/blog/eval-skills)** (OpenAI): the approach behind how this collection is tested, in particular testing whether a skill *triggers* on a realistic user request, and using negative controls to catch a skill that fires when it should not.

Conventions this collection holds itself to:

| Convention | Why |
| --- | --- |
| Frontmatter is `name` and `description`, nothing else | Anything else is agent-specific and breaks portability |
| Descriptions are third person, and name concrete trigger phrases | The description is a trigger signal for the model, not documentation for a human. Inconsistent voice degrades skill selection |
| `SKILL.md` bodies stay under 500 lines | Detail belongs in `references/`, which is read only when needed |
| Reference files are linked as real relative markdown links, one level deep from `SKILL.md` | Agents follow links; they do not reliably follow prose mentions or bare filenames |
| A skill never references a path outside its own folder | Skills install independently. A path into a sibling skill's folder resolves to nothing |
| Reference files over 100 lines start with a `## Contents` list | An agent that previews a long file with a partial read still sees the full scope |
| Every skill stands alone, even where that means repeating a canonical fact | A user may install one skill, not the collection. Duplication is deliberate; drift is guarded by an automated check that the shared facts agree across all skills |
| Each skill ends by pointing at `azuresql-db-feedback` if its own instructions failed | A skill that quietly gets worked around is a bug we would otherwise never hear about |

---

## Accuracy baseline

Every skill in this collection holds these facts true. If a generated workflow contradicts any of them, it is wrong.

- **Image:** `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest` (x64 / linux/amd64, private preview registry). Sign in first: `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io -u <username>` (enter the password when prompted). It is **not** `mcr.microsoft.com/mssql/server`.

  > **Note:** the registry username and password are **provided when you sign up for the Private Preview** at https://aka.ms/sqldbcontainerpreview-signup. They are shared and pull-only, must be treated as secrets (do not redistribute), and may be rotated during the preview.
- **EULA:** `ACCEPT_EULA=Y` is required.
- **Password:** a complex `MSSQL_SA_PASSWORD` (8+ chars, upper/lower/digit/symbol) is required.
- **Port:** the engine listens on **1433**.
- **Identity:** `SERVERPROPERTY('EngineEdition')` = **5**, `SERVERPROPERTY('Edition')` = **'SQL Azure'**.

### Platform

The image is x64 only. On a non-x64 host, add `--platform linux/amd64` (Docker) or `platform: linux/amd64` (compose) to run it under x64 emulation.

### Connection model (three facts that bite)

1. The engine does **not** auto-create databases on connect. Run `CREATE DATABASE appdb` on a **master** connection before connecting with `Database=appdb`. `appdb` is just the example name used throughout these skills; the name is yours to choose, so substitute your project's database name in a real project.
2. Avoid `USE` to switch databases. In a user-database (SDS) session (the Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as in Azure SQL Database in the cloud. A `master` connection is a non-SDS provisioning session where the Azure statement filter is not enforced, so `USE` appears to work there, but `master` is for provisioning only, not application work. Always select the target database in the connection string (`Database=appdb`, or `-d appdb` for sqlcmd).
3. A `master` connection is for provisioning only. Do real work on the user database.

### Readiness

The engine is **not** ready the instant `docker run` returns. Wait with a retry loop using `sqlcmd -C -b -l 2` (the `-b` makes a SQL error set the exit code, so transient startup errors like Msg 913 are retried, not masked) and provision `appdb` inside that same loop. Never poll bare `sqlcmd` without `-l`.

### Seeding

The image does **not** auto-run `/docker-entrypoint-initdb.d/*.sql`. That is a Postgres/MySQL convention and is not honored here. Seed by running `sqlcmd -d appdb -i seed.sql` **after** provisioning `appdb`.

### Connection strings

Standardize on:

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=...;TrustServerCertificate=true
```

Use `User Id=` / `Password=` / `Database=` (not `Uid=` / `Pwd=`). For `sqlcmd`, pass `-C` to trust the self-signed cert. Apps read the connection string from a single `SQL_CONNECTION_STRING` env var.

### Vectors

Native `VECTOR(n)` column type and `VECTOR_DISTANCE('cosine', a, b)`. Insert with `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))` where **n is a literal, never a bind parameter** (a parameter dimension fails with "Incorrect syntax near '@P3'"). The inner `CAST(? AS NVARCHAR(MAX))` is required because a real embedding's JSON string (~16 KB for 768 dims) exceeds the driver's 4000-char threshold and is otherwise sent as ntext, which the engine rejects ("Explicit conversion from data type ntext to vector is not allowed (529)"). `CREATE VECTOR INDEX` (DiskANN) is still in development; use full-scan top-k for now.

### Canonical start recipe

Free port + conditional platform + ready-wait + provision `appdb`:

```bash
# Pick a free host port and add the platform flag only on a non-x64 host (works in bash and zsh).
HOST_PORT=1433; while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do HOST_PORT=$((HOST_PORT+1)); done
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "$HOST_PORT:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do sleep 2; done
echo "ready on localhost,$HOST_PORT"
```
