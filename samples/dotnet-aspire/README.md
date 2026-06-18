# .NET Aspire sample

> **Version:** June 18, 2026
> **Status:** Private Preview: scaffold (code in progress)
> **Priority:** 2 (.NET required)

## What this sample shows

A .NET Aspire AppHost that uses the Azure SQL Database container as the local resource via `AddAzureSqlDatabase().RunAsContainer()`. The same AppHost and the same application code deploy unchanged against Azure SQL Database in the cloud via the local-to-cloud leg.

This sample is the path Aspire team has asked for: the container becomes the default behavior when an Aspire project depends on Azure SQL Database.

## What you need

- The Azure SQL Database container image available locally (Aspire will start it for you).
- .NET 9 SDK or later.
- .NET Aspire workload installed: `dotnet workload install aspire`.

## Two legs, same AppHost

### Leg 1: local

```bash
cd src/AppHost
dotnet run
```

Aspire starts the container as a resource, runs the EF Core migrations, and starts the web project against it.

### Leg 2: cloud

```bash
# Provision Azure SQL Database via the Azure skills collection, then:
azd up
```

The Aspire deployment manifest publishes the same resources against Azure SQL Database in the cloud. No code change.

See [Azure skills collection](../azure-skills/) for the deployment flow.

## Status

This sample is currently a scaffold. The AppHost, the web project, the EF Core models, the migrations, and the deploy walkthrough land in a follow-up commit. See [HANDOFF.md](../../HANDOFF.md) for the build brief.
