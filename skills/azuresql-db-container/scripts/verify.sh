#!/usr/bin/env bash
#
# verify.sh - reusable harness that proves a container is the real Azure SQL
# Database engine (EngineEdition=5 / Edition='SQL Azure') and is usable.
#
# Steps:
#   1. Pick a free host port starting at 1433.
#   2. Add --platform linux/amd64 only on a non-x64 host.
#   3. docker run the engine image (FAIL CLOSED on the SQL Server box image).
#   4. Wait-until-ready with the sqlcmd -C -b -l 2 retry loop.
#   5. Assert EngineEdition=5 AND Edition='SQL Azure' (non-zero exit otherwise).
#   6. CREATE DATABASE appdb.
#   7. Print "VERIFY OK on localhost,<port>".
#   8. Tear down with docker rm -f, unless --keep is passed.
#
set -euo pipefail

# ----------------------------------------------------------------------------
# Config (override via env)
# ----------------------------------------------------------------------------
IMAGE="${IMAGE:-sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest}"
SA_PASSWORD="${MSSQL_SA_PASSWORD:-YourStrong!Passw0rd}"
CONTAINER="${CONTAINER:-sqldb-verify}"
SQLCMD="/opt/mssql-tools18/bin/sqlcmd"

KEEP=0
for arg in "$@"; do
  case "$arg" in
    --keep) KEEP=1 ;;
    *) echo "ERROR: unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# ----------------------------------------------------------------------------
# FAIL CLOSED: the SQL Server box image is NOT the Azure SQL Database engine.
# ----------------------------------------------------------------------------
case "$IMAGE" in
  *mcr.microsoft.com/mssql/server*)
    echo "ERROR: '$IMAGE' is the SQL Server box image, NOT the Azure SQL Database engine." >&2
    echo "       Use sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest" >&2
    echo "       (returns EngineEdition=5 / Edition='SQL Azure'). Aborting." >&2
    exit 1
    ;;
esac

# ----------------------------------------------------------------------------
# 1. Pick a free host port starting at 1433.
# ----------------------------------------------------------------------------
HOST_PORT=1433
while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  HOST_PORT=$((HOST_PORT + 1))
done
echo "==> Using host port $HOST_PORT"

# ----------------------------------------------------------------------------
# 2. Add --platform linux/amd64 only on a non-x64 host.
# ----------------------------------------------------------------------------
PLATFORM=()
case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in
  x86_64|amd64) ;;
  *) PLATFORM=(--platform linux/amd64); echo "==> Non-x64 host: adding ${PLATFORM[*]}" ;;
esac

# ----------------------------------------------------------------------------
# 3. docker run the engine image.
# ----------------------------------------------------------------------------
cleanup() {
  if [ "$KEEP" -eq 1 ]; then
    echo "==> --keep set: leaving container '$CONTAINER' running on localhost,$HOST_PORT"
  else
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
echo "==> Starting engine: $IMAGE"
docker run -d --name "$CONTAINER" "${PLATFORM[@]}" \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=$SA_PASSWORD" \
  -p "$HOST_PORT:1433" \
  "$IMAGE" >/dev/null

# ----------------------------------------------------------------------------
# 4. Wait-until-ready with the sqlcmd -C -b -l 2 retry loop.
#    -b: a SQL error sets the exit code, so transient startup errors (Msg 913)
#        are retried, not masked. -l 2: short login timeout per attempt.
# ----------------------------------------------------------------------------
echo "==> Waiting for the engine to become ready..."
ATTEMPTS=0
MAX_ATTEMPTS=60
until docker exec "$CONTAINER" "$SQLCMD" -S localhost -U sa -P "$SA_PASSWORD" -C -b -l 2 \
  -Q "SELECT 1;" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    echo "ERROR: engine did not become ready after $MAX_ATTEMPTS attempts." >&2
    docker logs "$CONTAINER" 2>&1 | tail -n 20 >&2 || true
    exit 1
  fi
  sleep 2
done
echo "==> Engine is accepting connections"

# ----------------------------------------------------------------------------
# 5. Assert EngineEdition=5 AND Edition='SQL Azure'.
# ----------------------------------------------------------------------------
echo "==> Verifying engine identity"
ENGINE_EDITION="$(docker exec "$CONTAINER" "$SQLCMD" -S localhost -U sa -P "$SA_PASSWORD" -C -b -l 2 \
  -h -1 -W -Q "SET NOCOUNT ON; SELECT CAST(SERVERPROPERTY('EngineEdition') AS INT);" | tr -d '[:space:]')"
EDITION="$(docker exec "$CONTAINER" "$SQLCMD" -S localhost -U sa -P "$SA_PASSWORD" -C -b -l 2 \
  -h -1 -W -Q "SET NOCOUNT ON; SELECT CONVERT(VARCHAR(128), SERVERPROPERTY('Edition'));" | sed 's/[[:space:]]*$//')"

echo "    EngineEdition = $ENGINE_EDITION"
echo "    Edition       = $EDITION"

if [ "$ENGINE_EDITION" != "5" ] || [ "$EDITION" != "SQL Azure" ]; then
  echo "ERROR: not the Azure SQL Database engine." >&2
  echo "       Expected EngineEdition=5 and Edition='SQL Azure'." >&2
  echo "       Got EngineEdition='$ENGINE_EDITION', Edition='$EDITION'." >&2
  exit 1
fi

# ----------------------------------------------------------------------------
# 6. CREATE DATABASE appdb (on the master connection; the engine does not
#    auto-create databases).
# ----------------------------------------------------------------------------
echo "==> Provisioning database 'appdb'"
docker exec "$CONTAINER" "$SQLCMD" -S localhost -U sa -P "$SA_PASSWORD" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null

# ----------------------------------------------------------------------------
# 7. Done.
# ----------------------------------------------------------------------------
echo "VERIFY OK on localhost,$HOST_PORT"
