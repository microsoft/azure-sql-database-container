# CLI quickstart

> **Version:** June 18, 2026
> **Status:** Private Preview: scaffold (code in progress)

## What this sample shows

The lowest-friction path: a `docker-compose.yml`, a setup script, and a sequence of commands that gets you from "container not pulled" to "first query running" in under 60 seconds. No framework, no ORM, just the container and a CLI.

This sample is the right starting point if you want to evaluate the container before bringing in any application code.

## What you need

- A supported container runtime (see [Prerequisites](../../docs/prerequisites.md)).
- `sqlcmd` or `mssql-cli` on your PATH.

## Quickstart

```bash
# 1. Start the container
docker compose up -d

# 2. Wait for it to be ready (about 10 seconds)
./scripts/wait-for-sqldb.sh

# 3. Run the first query
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -C \
    -Q "SELECT SERVERPROPERTY('EngineEdition'), @@VERSION"
```

## Status

This sample is currently a scaffold. The `docker-compose.yml`, the wait-for-ready script, a small seed schema, and a sequence of "first ten queries" land in a follow-up commit. See [HANDOFF.md](../../HANDOFF.md) for the build brief.
