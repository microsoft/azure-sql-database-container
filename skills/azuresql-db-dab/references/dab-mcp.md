# DAB's built-in MCP endpoint

## Framing (read this first)

Data API Builder (version 1.7+; use the latest 2.x) can serve a **Model Context
Protocol (MCP) endpoint from the same `dab-config.json`**, over the entities you
already configured. Present it as **an additional API surface that DAB provides**
- alongside its REST and GraphQL surfaces - **not** as a standalone "MSSQL MCP
server." An MCP client that connects to DAB is talking to your DAB API, which
happens to sit in front of the Azure SQL engine. Everything DAB's permissions
and policies enforce for REST/GraphQL applies to the MCP surface too.

## Contents

- Where it lives
- Enabling / disabling it
- Scoping which entities and operations are exposed
- Connecting an MCP client
- stdio mode

## Where it lives

With `dab start` running, the MCP endpoint is at:

```
http://localhost:5000/mcp
```

It is **enabled by default**. It uses streamable HTTP and pins the MCP protocol
version `2025-06-18`.

## Enabling / disabling it

Controlled under `runtime.mcp` in `dab-config.json`:

```json
"runtime": {
  "mcp": {
    "enabled": true,
    "path": "/mcp",
    "dml-tools": {
      "create-record": true,
      "read-records": true,
      "update-record": true,
      "delete-record": true
    }
  }
}
```

CLI toggles on `dab start`: `--mcp.enabled true|false` and `--mcp.path /mcp`.
Set `enabled: false` (or `--mcp.enabled false`) to turn the surface off entirely.

## Scoping which entities and operations are exposed

- Global DML tools are the `runtime.mcp.dml-tools` flags above (turn off, say,
  `delete-record` to make the whole surface read/write-but-no-delete).
- Per entity: `dab update <Entity> --mcp.dml-tools false` removes that entity
  from the MCP DML tools while leaving it on REST/GraphQL.
- Because MCP goes through the same entity permissions, a read-only surface is
  just `anonymous:read` (or an authenticated role) on the entities - the MCP
  client cannot do more than the entity's permissions allow.

## Connecting an MCP client

Point any MCP client that supports streamable HTTP at
`http://localhost:5000/mcp`. The client discovers tools generated from your
entities (read/create/update/delete per the `dml-tools` and per-entity
permissions). This is the "the database is available to my agent as tools"
story - delivered *by DAB as an API feature*, so you get REST, GraphQL, and MCP
from one config with one set of permissions.

## stdio mode

For clients that spawn a local process instead of connecting over HTTP:

```bash
dab start --mcp-stdio            # optionally: --mcp-stdio role:<role>
```

This runs DAB's MCP surface over stdio using the same `dab-config.json`.
