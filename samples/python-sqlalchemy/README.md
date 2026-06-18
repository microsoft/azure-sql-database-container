# Python + SQLAlchemy sample

> **Version:** June 18, 2026
> **Status:** Private Preview: scaffold (code in progress)
> **Priority:** 1 (AI persona)

## What this sample shows

A FastAPI application with SQLAlchemy as the ORM against the Azure SQL Database container as the local database. The same SQLAlchemy models, the same migrations, and the same FastAPI code deploy unchanged against Azure SQL Database in the cloud via the local-to-cloud leg.

## What you need

- The Azure SQL Database container running locally (see [Getting Started](../../docs/getting-started.md)).
- Python 3.11 or later.
- A driver: `mssql-python`, `pyodbc`, or `pymssql`. The sample defaults to `mssql-python` because it ships pure-Python wheels for macOS, Linux, and Windows.

## Two legs, one connection string shape

### Leg 1: local

```bash
# Container running on localhost:1433
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

### Leg 2: cloud (same code, different connection string)

```bash
# Provision target via the Azure skills collection, then:
cp .env.cloud.example .env
alembic upgrade head
uvicorn app.main:app
```

See [Azure skills collection](../azure-skills/) for the deployment flow.

## Status

This sample is currently a scaffold. The FastAPI app, the SQLAlchemy models, the Alembic migrations, and the deploy walkthrough land in a follow-up commit. See [HANDOFF.md](../../HANDOFF.md) for the build brief.
