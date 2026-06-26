# Connection model: master vs user database

The single most common source of failures. Read this before connecting an app.

## Three facts

1. **The engine does NOT auto-create databases on connect.** Connecting with
   `Database=appdb` when `appdb` does not exist fails. You must create it first
   on a `master` connection.
2. **Select the database in the connection string, not with `USE`.** Avoid
   `USE` to switch databases. In a user-database (SDS) session (the
   Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly
   as in Azure SQL Database in the cloud. A `master` connection is a non-SDS
   provisioning session where the Azure statement filter is not enforced, so
   `USE` appears to work there, but `master` is for
   provisioning only, not application work. Always select the target database in
   the connection string (`Database=appdb`, or `-d appdb` for sqlcmd).
3. **A `master` connection is for provisioning only.** `master` is a non-SDS
   session: the Azure SQL statement filter (`USE`, `SHUTDOWN`, `RECONFIGURE`) is
   not enforced there, so `USE` works. (`BACKUP`/`RESTORE` are a separate case:
   they are not supported in any session and return `Msg 40510`, matching the
   cloud, so do not rely on them on `master` either.) Never develop or validate
   against `master`; use it only to `CREATE`/`DROP DATABASE`, then connect
   directly to the user database (SDS), which enforces Azure SQL Database semantics.

## Provision-then-connect workflow

### Step 1: connect to master and create the database

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

When no `-d` is given, sqlcmd connects to `master`. This is provisioning, so
that is correct here.

### Step 2: connect to the user database for real work

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -d appdb -Q "SELECT DB_NAME() AS CurrentDatabase;"
```

`-d appdb` selects the database at connect time. `DB_NAME()` returns `appdb`.

### Step 3: apps connect with Database=appdb

Apps must include `Database=appdb` in the connection string. They should never
issue `USE`. See `connect-and-query.md` for the full connection string.

## Why to avoid USE

Avoid `USE` to switch databases. In a user-database (SDS) session (the
Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as
in Azure SQL Database in the cloud. A `master` connection is a non-SDS
provisioning session where the Azure statement filter is not enforced, so `USE` appears to work there, but `master` is for provisioning
only, not application work. Always select the target database in the connection
string (`Database=appdb`, or `-d appdb` for sqlcmd). The fix is always to set the
target database in the connection (string or `-d`), not in a statement.

## Seeding pattern (never USE)

The image does not auto-run `/docker-entrypoint-initdb.d/*.sql`. Seed explicitly
after provisioning, and target the database with `-d appdb`, not `USE`:

```bash
# 1. provision appdb on master (see Step 1)
# 2. seed it by selecting appdb in the connection
docker exec -i sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b \
  -d appdb -i /path/in/container/seed.sql
```

Write `seed.sql` as plain DDL/DML with NO `USE appdb;` line at the top. The
database is already selected by `-d appdb`.

## Validation rules

- Before any app connects, confirm `SELECT DB_ID('appdb')` is non-null on
  `master`.
- A correct user-database session returns `appdb` from `SELECT DB_NAME()`.
- A seed script contains no `USE` statement.

## Do not

- Do not assume a database appears just because you put it in the connection
  string.
- Do not use `USE appdb;` anywhere; a user-database (SDS) session rejects it
  with `Msg 40508`, exactly as in Azure SQL Database in the cloud. It only
  appears to work on a `master` (non-SDS) connection, where the Azure statement
  filter is not enforced.
- Do not run application workloads on the `master` connection.
- Do not rely on an init/seed directory.
