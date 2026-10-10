#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEARCH_PATHS=("$ROOT/docs" "$ROOT/skills" "$ROOT/README.md")

unsafe_ports="$(
  grep -RInE \
    --include='*.md' --include='*.sh' --include='*.yml' --include='*.yaml' --include='*.html' \
    -- '(-p|--publish)[[:space:]]+["'"'"']?[^[:space:]"'"'"']*:1433|^[[:space:]]*-[[:space:]]+["'"'"']?[^[:space:]"'"'"']*:1433' \
    "${SEARCH_PATHS[@]}" |
    grep -vE '127\.0\.0\.1:[^:[:space:]"]+:1433' || true
)"

# A file that generates or requires MSSQL_SA_PASSWORD must not also embed the well-known example
# password elsewhere in credential-bearing form (an assignment, a `-P`/`Pwd=`/`Password=`/
# `TargetPassword=` value, or a `user:password@` URI) - that mismatch means downstream
# sqlcmd/app/connection-string examples authenticate with a different password than the one the
# container was actually started with, and silently fail (see PR #164 review feedback).
password_generating_files="$(
  grep -RIlE \
    --include='*.md' --include='*.sh' --include='*.yml' --include='*.yaml' --include='*.html' \
    -- 'MSSQL_SA_PASSWORD:\?|Aa1![$]\(openssl rand' \
    "${SEARCH_PATHS[@]}" || true
)"

known_passwords=""
if [[ -n "$password_generating_files" ]]; then
  known_passwords="$(
    grep -nE \
      -- '(MSSQL_SA_PASSWORD[:=]|[-]P[[:space:]]+|[Pp]wd[:=]|[Pp]assword[:=]|TargetPassword[:=])[^[:cntrl:]]*YourStr0ng_Passw0rd' \
      $password_generating_files || true
  )"
fi

if [[ -n "$unsafe_ports" ]]; then
  echo "Container examples must bind published SQL ports to 127.0.0.1:" >&2
  echo "$unsafe_ports" >&2
fi

if [[ -n "$known_passwords" ]]; then
  echo "Files that generate/require MSSQL_SA_PASSWORD must not also embed the public example SA password elsewhere:" >&2
  echo "$known_passwords" >&2
fi

if [[ -n "$unsafe_ports" || -n "$known_passwords" ]]; then
  exit 1
fi

echo "Secure container example checks passed."
