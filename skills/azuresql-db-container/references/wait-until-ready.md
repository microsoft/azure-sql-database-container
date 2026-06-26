# Wait until ready (canonical readiness)

The engine is NOT ready the instant `docker run` returns. Initialization takes
time, and early connections hit transient errors (for example `Msg 913`). Always
gate the next step on a readiness check. This doc is reused by the CI and sidecar
skills.

## The readiness retry loop (canonical)

Provision `appdb` inside the same loop so readiness and provisioning happen
together:

```bash
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do sleep 2; done
echo "ready"
```

Why each flag matters:

- `-b` makes a SQL error set the exit code. Without it, a transient startup
  error (like `Msg 913`) would print but still exit `0`, so the loop would
  "succeed" too early. With `-b`, transient errors are retried, not masked.
- `-l 2` sets a 2 second login timeout, so each attempt fails fast while the
  engine is still coming up instead of hanging.
- `-C` trusts the self-signed certificate.

**Never poll bare sqlcmd without `-l`.** A login with no timeout can hang and
defeat the retry loop.

## Compose healthcheck (equivalent)

For a compose stack, express the same check as a healthcheck so dependents can
wait on `service_healthy`:

```yaml
healthcheck:
  test: ["CMD", "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa",
         "-P", "YourStrong!Passw0rd", "-C", "-b", "-l", "2", "-Q", "SELECT 1"]
  interval: 10s
  timeout: 5s
  retries: 12
  start_period: 20s
```

The healthcheck only proves the engine answers; it does not create `appdb`.
After the service is healthy, run the provisioning command separately:

```bash
docker compose exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -C -b \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;"
```

## Validation rules

- The loop uses `-b` and `-l 2`.
- Provisioning `appdb` happens only after (or inside) the readiness check.
- A compose dependent waits on `condition: service_healthy`, then provisions.

## Do not

- Do not assume readiness from `docker run` returning.
- Do not poll bare `sqlcmd` without `-l` (it can hang).
- Do not drop `-b` (transient startup errors would be masked as success).
