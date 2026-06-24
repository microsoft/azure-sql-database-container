# The connection model: master vs. user databases

This container reproduces the Azure SQL Database connection model, which is different from a normal SQL Server instance. There are two kinds of session and they do not behave the same way.

## `master` connections: provisioning only

A connection to `master` is a non-SDS session. Use it only for server and provisioning operations, most importantly `CREATE DATABASE` and `DROP DATABASE`.

A `master` connection does **not** apply the full Azure SQL Database statement semantics, so it is not a faithful representation of an application connection. Do not develop or validate application behavior on a `master` connection.

```bash
# Provision: create the database from a master connection
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -C -Q "CREATE DATABASE appdb;"
```

## User-database connections: your real workload (SDS)

A connection made directly to a user database is an SDS session and faithfully enforces Azure SQL Database semantics. Do all application development and testing here.

As in real Azure SQL Database, **`USE <db>` cannot switch databases** (it returns `Msg 40508`). You therefore select the target database in the connection string and open a connection straight to it; you cannot hop from `master` into a user database with `USE`.

```bash
# Develop/test: connect directly to the database with -d (or Database=appdb in a connection string)
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -C -d appdb -Q "SELECT DB_NAME() AS CurrentDb;"
```

In application connection strings, always set the database explicitly: `Server=localhost,1433;Database=appdb;...` (ADO.NET `Initial Catalog=appdb`).

## Summary

Use `master` only to create or drop databases. After provisioning, connect to the user database directly for everything else. This matches how applications connect to Azure SQL Database in the cloud, so code written this way deploys unchanged.
