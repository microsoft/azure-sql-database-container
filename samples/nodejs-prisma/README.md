# Node.js + Prisma sample

> **Version:** June 18, 2026
> **Status:** Private Preview: scaffold (code in progress)
> **Priority:** 1 (JavaScript / TypeScript first)

## What this sample shows

A TypeScript Node.js application that uses Prisma as the ORM against the Azure SQL Database container as the local database. The same Prisma schema and application code deploy unchanged against Azure SQL Database in the cloud via the local-to-cloud leg.

## What you need

- The Azure SQL Database container running locally (see [Getting Started](../../docs/getting-started.md)).
- Node.js 20 or later.
- npm 10 or later.

## Two legs, one connection string shape

### Leg 1: local

```bash
# Container running on localhost:1433
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

### Leg 2: cloud (same code, different connection string)

```bash
# Provision target via the Azure skills collection, then:
cp .env.cloud.example .env
npx prisma migrate deploy
npm run start
```

The migration that ran against the container runs identically against Azure SQL Database in the cloud. No code change.

See [Azure skills collection](../azure-skills/) for the deployment flow.

## Status

This sample is currently a scaffold. The code, the Prisma schema, the migrations, and the deploy walkthrough land in a follow-up commit. See [HANDOFF.md](../../HANDOFF.md) for the build brief.
