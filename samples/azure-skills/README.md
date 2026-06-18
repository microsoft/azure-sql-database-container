# Azure skills collection for local-to-cloud deployment

> **Version:** June 18, 2026
> **Status:** Private Preview

## What this is

A collection of AI agent skills that handle the local-to-cloud handoff: take an application that runs against the Azure SQL Database container locally and deploy it against Azure SQL Database in the cloud with no application code change.

These skills are loadable by Claude, Codex, GitHub Copilot, or any agent that supports the Claude Skill format. Each language sample in this repository (Node.js + Prisma, Python + SQLAlchemy, AI / RAG, .NET Aspire) calls into this skill collection for its cloud leg.

## What an agent does after loading the skill

1. Provisions an Azure SQL Database server and database with matching collation and tier.
2. Generates the cloud connection string.
3. Runs the application's existing migration tool (`prisma migrate deploy`, `alembic upgrade head`, `dotnet ef database update`, or equivalent) against the cloud database.
4. Deploys the application to the appropriate Azure compute target for the stack:
   - **Node.js / TypeScript** → Azure App Service (Linux) or Azure Container Apps
   - **Python (FastAPI)** → Azure Container Apps or Azure Functions
   - **.NET Aspire** → `azd up` using the Aspire deployment manifest
5. Verifies the application is healthy in the cloud.

## Skills in this collection

| Skill                                      | Purpose                                                |
| ------------------------------------------ | ------------------------------------------------------ |
| `provision-azure-sql-database/SKILL.md`    | Create and configure the target Azure SQL Database     |
| `deploy-nodejs-app/SKILL.md`               | Deploy a Node.js app to Azure App Service or Container Apps |
| `deploy-python-app/SKILL.md`               | Deploy a Python app to Container Apps or Functions     |
| `deploy-dotnet-aspire/SKILL.md`            | `azd up` for an Aspire AppHost                         |
| `swap-connection-string/SKILL.md`          | Replace the local container connection string with the cloud one |

## Why these are separate skills, not one

Each skill is single-purpose so an agent can compose them. A developer who already has an Azure SQL Database server provisioned does not need the provision skill; they only need swap-connection-string and the matching deploy skill for their stack.

## Status

This skill collection is currently a scaffold. The individual SKILL.md files land in a follow-up commit. See [HANDOFF.md](../../HANDOFF.md) for the build brief.
