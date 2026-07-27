# Event-driven on Azure SQL: the SQL trigger locally, CES in the cloud

## Contents

- The local mechanism: SQL trigger + Change Tracking
- Enabling Change Tracking
- How the trigger behaves (polling, coalescing, order)
- Internal state (`az_func` schema, leases)
- Least-privilege permission grants
- Why Change Event Streaming (CES) is cloud-only
- Choosing a path

## The local mechanism: SQL trigger + Change Tracking

For local, first-party, zero-cloud event-driven work, use the **Azure Functions
SQL trigger**. It is backed by SQL **Change Tracking**: the trigger polls the
change-tracking system tables and invokes your function with the rows that
changed. It connects with the same `SqlConnectionString` and runs entirely
against the local container.

## Enabling Change Tracking

Two statements, on `appdb` (never `master`) and the monitored table:

```sql
ALTER DATABASE appdb
  SET CHANGE_TRACKING = ON (CHANGE_RETENTION = 2 DAYS, AUTO_CLEANUP = ON);

ALTER TABLE dbo.ToDo ENABLE CHANGE_TRACKING;
```

`CHANGE_RETENTION` bounds how far back changes are kept: if the function is
stopped longer than the retention window, older changes are lost. `AUTO_CLEANUP`
removes change history past retention.

## How the trigger behaves (polling, coalescing, order)

- **Polling, not push.** A loop gets up to `MaxBatchSize` changes (default 100),
  invokes the function, waits `PollingIntervalMs` (default 1000 ms), repeats.
- **Coalesced.** Between polls, multiple changes to the *same row* collapse to a
  single entry showing the difference from the last processed state - you see
  the latest state, not every intermediate one.
- **Order.** Oldest changes first, following `CHANGETABLE` order.
- **No old-vs-new values.** You get the current row (`Item`) and the
  `Operation` (Insert/Update/Delete), keyed by primary key - Change Tracking
  records *that* a row changed, not the before image. (For full before/after
  column values you would need CDC + Debezium; see "Choosing a path".)
- **Requires a primary key** on the monitored table.

## Internal state (`az_func` schema, leases)

Each trigger has a change-tracking table and a **leases** table in an internal
`az_func` schema, named `Leases_{FunctionId}_{TableId}`. The trigger creates
them if they don't exist and the principal has permission. The leases table adds
bookkeeping columns (`_az_func_ChangeVersion`, `_az_func_AttemptCount`,
`_az_func_LeaseExpirationTime`) that make delivery resilient across restarts.

## Least-privilege permission grants

Connecting as `sa` locally satisfies all of this automatically. When you move to
a least-privilege principal (or to the cloud), the trigger needs more than
`db_datareader`/`db_datawriter`:

```sql
GRANT CREATE TABLE TO [<principal>];
GRANT CREATE SCHEMA TO [<principal>];

GRANT SELECT ON [dbo].[ToDo] TO [<principal>];
GRANT VIEW CHANGE TRACKING ON [dbo].[ToDo] TO [<principal>];

CREATE SCHEMA az_func;
GO
GRANT ALTER ON SCHEMA::az_func TO [<principal>];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::az_func TO [<principal>];
```

## Why Change Event Streaming (CES) is cloud-only

CES is the native Azure SQL feature that streams row-change events to a
destination. It is the right choice **in the cloud**, but it **cannot run
against the local container**, for two independent reasons:

1. **Engine/OS:** CES is unsupported on the Linux SQL engine, and every local
   Azure SQL container runs the Linux engine - so the container has CES disabled.
2. **Destination:** CES streams **only to Azure Event Hubs public endpoints**
   (AMQP or the Event Hubs Kafka facade). It rejects private/service endpoints
   and generic Kafka, and cannot authenticate to a local Event Hubs emulator.

So there is no way to make CES work purely locally. Treat CES as a **production
integration** you enable when the app runs against Azure SQL Database / Managed
Instance with a real Event Hubs namespace, and **stub it locally with the SQL
trigger**. If you want the consumer to look the same in both places, shape the
trigger's output like CES's CloudEvents payload.

## Choosing a path

- **Local "react to row changes" (default):** SQL trigger (this skill). First
  party, local, no cloud.
- **Production streaming to Event Hubs (AMQP or its Kafka-facade consumers):**
  CES, once deployed to Azure SQL DB/MI. Cloud only.
- **Full before/after change capture locally (audit/replication fidelity):** CDC
  + the Debezium SQL Server connector into a local Kafka - heavier, but gives
  before/after images the trigger does not. Out of scope for this skill.
