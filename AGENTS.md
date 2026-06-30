# AGENTS.md

Guidance for AI coding agents working **in this repository** (the Azure SQL Database container Private Preview). If you instead want your own agent to run and build against the container in your project, install the skill: `npx skills add microsoft/azure-sql-database-container`. This file is about contributing to the repo, not about using the container.

## What this project is

The Azure SQL Database container is the Azure SQL Database engine, running locally for development and CI. It is wire-compatible with Azure SQL Database in the Microsoft Azure cloud: same drivers, same T-SQL, same migrations, so deploying to the cloud is a connection-string change, not a code change. This repository ships the documentation site, the installable agent skills, and the copy-and-run build prompts; the engine image itself lives in a private preview registry.

## Repository layout

- `skills/`: the installable agent skill collection (`npx skills add microsoft/azure-sql-database-container`). This is the single source of truth for how an agent runs and builds against the container. Do not duplicate that how-to elsewhere; link to it.
- `docs/`: the GitHub Pages site (`what-is-the-container`, `prerequisites`, `getting-started`, `known-limitations`, `goals-of-the-private-preview`, `feedback-and-how-to-engage`), plus `docs/prompts/` (the build prompts) and `docs/llms.txt`.
- `README.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, and `.github/` (issue and discussion templates).

## Facts to keep consistent across docs and skills

These drift easily; keep them aligned everywhere when you edit:

- **x64 only.** The image is x64 (`linux/amd64`). Do not present a non-x64 host as a supported platform, and do not use runtime brand names (Apple Container, Rosetta, Docker Desktop). The only platform note is: "on a non-x64 host, add `--platform linux/amd64`."
- **The engine does not auto-create databases.** Provision `appdb` on a `master` connection before connecting to it. In a user-database (SDS) session USE returns Msg 40508 (Azure-faithful); a master connection is a non-SDS provisioning session where USE is not blocked. Select the database in the connection string and develop in the user database.
- **Registry / image:** `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`. Registry, tag, and credentials are provisional during Private Preview.
- **Do not advertise things that do not exist** (no empty sample folders, no unbuilt skill collections).
- **Feedback links:** bug reports go to `https://aka.ms/azuresqldb-container-bug`, feature requests to `https://aka.ms/azuresqldb-container-feature-request`.

## Conventions for changes in this repository

- Do not use em-dashes in documentation or skills. Use colons, semicolons, commas, or periods.
- Do not push to `main` or merge pull requests without maintainer review. Open a pull request from a feature branch.
