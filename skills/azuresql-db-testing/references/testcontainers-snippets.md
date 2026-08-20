# Testcontainers snippets

Per-language recipes that start a **real Azure SQL Database container** via the generic
Testcontainers API, wait until it answers, provision `appdb`, hand the connection string to the
test, and dispose after. Image is
`sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest` (NOT the Testcontainers
`MsSql` preset / `mcr.microsoft.com/mssql/server` SQL Server image). Every recipe assumes
Docker is already authenticated to the private registry (`docker login ...`); see SKILL.md.
On a non-x64 host, set the image platform to `linux/amd64` where noted.

The engine is **not ready when the container starts**, and it does **not auto-create
databases**: each recipe attaches a wait strategy and then runs
`IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;` on a master connection. The host port is
random; each recipe reads the mapped port and builds
`Server=localhost,<mappedPort>;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true`.

## Contents

- [.NET: Testcontainers for .NET + xUnit IAsyncLifetime](#net-testcontainers-for-net--xunit-iasynclifetime)
- [Node / TypeScript: testcontainers + Jest globalSetup/teardown](#node--typescript-testcontainers--jest-globalsetupteardown)
- [Python: testcontainers + pytest fixture](#python-testcontainers--pytest-fixture)
- [Java: Testcontainers + JUnit 5 @Container](#java-testcontainers--junit-5-container)

## .NET: Testcontainers for .NET + xUnit IAsyncLifetime

Packages: `Testcontainers`, `Microsoft.Data.SqlClient`, `xunit`. The fixture builds a
generic container (NOT `MsSqlBuilder`), waits until `SELECT 1` succeeds, then provisions
`appdb`. Reused across a test class via `IClassFixture`.

```csharp
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using Microsoft.Data.SqlClient;
using Xunit;

public sealed class AzureSqlFixture : IAsyncLifetime
{
    private const string Sa = "YourStr0ng_Passw0rd";
    private IContainer _container = null!;
    public string ConnectionString { get; private set; } = "";

    public async Task InitializeAsync()
    {
        var builder = new ContainerBuilder()
            .WithImage("sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest")
            .WithEnvironment("ACCEPT_EULA", "Y")
            .WithEnvironment("MSSQL_SA_PASSWORD", Sa)
            .WithPortBinding(1433, assignRandomHostPort: true)
            // Wait until the engine actually answers, not just until the container starts.
            .WithWaitStrategy(Wait.ForUnixContainer().UntilCommandIsCompleted(
                "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa",
                "-P", Sa, "-C", "-b", "-l", "2", "-Q", "SELECT 1"));

        // On a non-x64 host, pin the platform:
        // builder = builder.WithCreateParameterModifier(p => p.Platform = "linux/amd64");

        _container = builder.Build();
        await _container.StartAsync();

        var host = _container.Hostname;
        var port = _container.GetMappedPublicPort(1433);

        // Provision appdb on a master connection (the engine does not auto-create it).
        var master = $"Server={host},{port};Database=master;User Id=sa;Password={Sa};TrustServerCertificate=true";
        await using (var cx = new SqlConnection(master))
        {
            await cx.OpenAsync();
            await using var cmd = cx.CreateCommand();
            cmd.CommandText = "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;";
            await cmd.ExecuteNonQueryAsync();
        }

        ConnectionString =
            $"Server={host},{port};Database=appdb;User Id=sa;Password={Sa};TrustServerCertificate=true";
    }

    public async Task DisposeAsync() => await _container.DisposeAsync();
}

public class WidgetTests : IClassFixture<AzureSqlFixture>
{
    private readonly AzureSqlFixture _fx;
    public WidgetTests(AzureSqlFixture fx) => _fx = fx;

    [Fact]
    public async Task Engine_is_azure_sql()
    {
        await using var cx = new SqlConnection(_fx.ConnectionString);
        await cx.OpenAsync();
        await using var cmd = cx.CreateCommand();
        cmd.CommandText = "SELECT CAST(SERVERPROPERTY('EngineEdition') AS int)";
        Assert.Equal(5, (int)(await cmd.ExecuteScalarAsync())!);
    }
}
```

## Node / TypeScript: testcontainers + Jest globalSetup/teardown

Packages: `testcontainers`, `mssql`, plus `jest` and `ts-node`. One container for the whole
Jest run: `globalSetup` starts it and stashes the container + connection string on
`globalThis`; `globalTeardown` stops it. Use `GenericContainer`, not `MSSQLServerContainer`.

`jest.config.js`:

```js
module.exports = {
  globalSetup: "<rootDir>/test/global-setup.ts",
  globalTeardown: "<rootDir>/test/global-teardown.ts",
  testEnvironment: "node",
};
```

`test/global-setup.ts`:

```ts
import { GenericContainer, Wait } from "testcontainers";
import sql from "mssql";

const SA = "YourStr0ng_Passw0rd";
const IMAGE = "sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest";

export default async function globalSetup() {
  const container = await new GenericContainer(IMAGE)
    .withEnvironment({ ACCEPT_EULA: "Y", MSSQL_SA_PASSWORD: SA })
    .withExposedPorts(1433)
    // Wait until the engine answers SELECT 1, not just until the container starts.
    .withWaitStrategy(
      Wait.forSuccessfulCommand(
        `/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '${SA}' -C -b -l 2 -Q 'SELECT 1'`,
      ),
    )
    // On a non-x64 host, pin the platform: .withPlatform("linux/amd64")
    .withStartupTimeout(120_000)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(1433);

  // Provision appdb on a master connection (the engine does not auto-create it).
  const master = await sql.connect({
    server: host,
    port,
    user: "sa",
    password: SA,
    database: "master",
    options: { trustServerCertificate: true },
  });
  await master.request().query("IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;");
  await master.close();

  (globalThis as any).__SQLDB__ = container;
  process.env.SQL_CONNECTION_STRING =
    `Server=${host},${port};Database=appdb;User Id=sa;Password=${SA};TrustServerCertificate=true`;
}
```

`test/global-teardown.ts`:

```ts
export default async function globalTeardown() {
  const container = (globalThis as any).__SQLDB__;
  if (container) await container.stop();
}
```

A test reads the mapped connection from the env var set above:

```ts
import sql from "mssql";

test("engine is azure sql", async () => {
  const host = process.env.SQL_CONNECTION_STRING!.match(/Server=([^,]+),(\d+)/)!;
  const pool = await sql.connect({
    server: host[1],
    port: Number(host[2]),
    user: "sa",
    password: "YourStr0ng_Passw0rd",
    database: "appdb",                 // selected here, never via USE
    options: { trustServerCertificate: true },
  });
  const r = await pool.request().query("SELECT SERVERPROPERTY('EngineEdition') AS ed");
  expect(r.recordset[0].ed).toBe(5);
  await pool.close();
});
```

## Python: testcontainers + pytest fixture

Packages: `testcontainers`, `pyodbc` (with ODBC Driver 18), `pytest`. Use the generic
`DockerContainer`, not `testcontainers.mssql`. A session-scoped fixture starts the container,
waits until `SELECT 1` works, provisions `appdb`, yields the connection string, and disposes.

```python
import time
import pyodbc
import pytest
from testcontainers.core.container import DockerContainer

SA = "YourStr0ng_Passw0rd"
IMAGE = "sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest"


def _odbc(host, port, database):
    return (
        "Driver={ODBC Driver 18 for SQL Server};"
        f"Server={host},{port};Database={database};Uid=sa;Pwd={SA};"
        "TrustServerCertificate=yes"
    )


@pytest.fixture(scope="session")
def sql_connection_string():
    container = (
        DockerContainer(IMAGE)
        .with_env("ACCEPT_EULA", "Y")
        .with_env("MSSQL_SA_PASSWORD", SA)
        .with_exposed_ports(1433)
        # On a non-x64 host, pin the platform:
        # .with_kwargs(platform="linux/amd64")
    )
    container.start()
    try:
        host = container.get_container_host_ip()
        port = int(container.get_exposed_port(1433))

        # The engine is not ready when the container starts: poll SELECT 1 until it answers.
        deadline = time.time() + 120
        while True:
            try:
                with pyodbc.connect(_odbc(host, port, "master"), timeout=2) as cx:
                    cx.execute("SELECT 1").fetchone()
                break
            except pyodbc.Error:
                if time.time() > deadline:
                    raise
                time.sleep(2)

        # Provision appdb on the master connection (the engine does not auto-create it).
        with pyodbc.connect(_odbc(host, port, "master"), autocommit=True) as cx:
            cx.execute("IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;")

        yield (
            f"Server={host},{port};Database=appdb;User Id=sa;Password={SA};"
            "TrustServerCertificate=true"
        )
    finally:
        container.stop()


def test_engine_is_azure_sql(sql_connection_string):
    host = sql_connection_string.split("Server=")[1].split(";")[0]
    hostname, port = host.split(",")
    with pyodbc.connect(_odbc(hostname, port, "appdb")) as cx:  # appdb selected here, no USE
        edition = cx.execute("SELECT SERVERPROPERTY('EngineEdition')").fetchval()
        assert edition == 5
```

## Java: Testcontainers + JUnit 5 @Container

Dependencies: `org.testcontainers:testcontainers` and `:junit-jupiter`,
`com.microsoft.sqlserver:mssql-jdbc`, JUnit 5. Use `GenericContainer`, not
`MSSQLServerContainer`. `@Testcontainers` + `@Container` manage start/stop; a static
container is shared across the class. Provision `appdb` in `@BeforeAll`.

```java
import com.microsoft.sqlserver.jdbc.SQLServerDataSource;
import org.junit.jupiter.api.*;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Testcontainers
class WidgetIT {

    private static final String SA = "YourStr0ng_Passw0rd";
    private static final String IMAGE =
        "sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest";

    @Container
    static final GenericContainer<?> ENGINE =
        new GenericContainer<>(DockerImageName.parse(IMAGE))
            .withEnv("ACCEPT_EULA", "Y")
            .withEnv("MSSQL_SA_PASSWORD", SA)
            .withExposedPorts(1433)
            // Wait until the engine answers, not just until the container starts.
            .waitingFor(Wait.forSuccessfulCommand(
                "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '" + SA
                    + "' -C -b -l 2 -Q 'SELECT 1'"))
            .withStartupTimeout(Duration.ofMinutes(2));
    // On a non-x64 host, pin the platform via a custom image modifier or
    // -Dtestcontainers... platform setting for your Docker environment.

    private static String url(String database) {
        return "jdbc:sqlserver://" + ENGINE.getHost() + ":" + ENGINE.getMappedPort(1433)
            + ";databaseName=" + database + ";encrypt=true;trustServerCertificate=true";
    }

    private static SQLServerDataSource dataSource(String database) {
        SQLServerDataSource ds = new SQLServerDataSource();
        ds.setURL(url(database));
        ds.setUser("sa");
        ds.setPassword(SA);
        return ds;
    }

    @BeforeAll
    static void provisionAppDb() throws Exception {
        // Provision appdb on a master connection (the engine does not auto-create it).
        try (Connection cx = dataSource("master").getConnection();
             Statement st = cx.createStatement()) {
            st.execute("IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;");
        }
    }

    @Test
    void engineIsAzureSql() throws Exception {
        try (Connection cx = dataSource("appdb").getConnection();  // appdb in the URL, no USE
             Statement st = cx.createStatement();
             ResultSet rs = st.executeQuery("SELECT SERVERPROPERTY('EngineEdition')")) {
            rs.next();
            assertEquals(5, rs.getInt(1));
        }
    }
}
```
