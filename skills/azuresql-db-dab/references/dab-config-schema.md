# dab-config.json: the config schema, distilled

## Contents

- Why this file exists
- The load-bearing shape (MSSQL path)
- Key-by-key notes
- Validate before you run
- Authoritative schema and docs

## Why this file exists

An agent that hand-writes or patches `dab-config.json` needs the config's shape, and it will not fetch the
JSON schema at runtime. This is the distilled, load-bearing shape for the common "expose Azure SQL tables as
REST + GraphQL" path, so generation is correct without pulling the full ~85 KB schema. For anything beyond
this (Cosmos, telemetry, caching, health probes, key vault), read the authoritative schema linked below, or
prefer the CLI (`dab init` / `dab add` / `dab update`) which always writes schema-valid JSON.

## The load-bearing shape (MSSQL path)

```jsonc
{
  // Pin the schema so editors and `dab validate` check against a known version.
  "$schema": "https://github.com/Azure/data-api-builder/releases/download/v2.0.9/dab.draft.schema.json",

  "data-source": {
    "database-type": "mssql",                     // Azure SQL engine == mssql
    "connection-string": "@env('SQL_CONNECTION_STRING')"  // @env indirection; never inline the secret
  },

  "runtime": {
    "rest":    { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql" },
    "mcp":     { "enabled": true, "path": "/mcp" },   // DAB's built-in MCP endpoint (a DAB API surface)
    "host":    { "mode": "development" }              // development enables Swagger + detailed errors
  },

  "entities": {
    "Book": {                                      // entity name == the API identity (/api/Book, GraphQL book/books)
      "source": { "object": "dbo.Books", "type": "table" },   // type: table | view | stored-procedure
      "permissions": [
        { "role": "anonymous", "actions": [ { "action": "*" } ] }  // role:actions; "*" or create/read/update/delete
      ]
      // optional per-entity: "relationships", "mappings", "fields", "rest", "graphql", "mcp"
    }
  }
}
```

Relationship object form (added by `dab update <E> --relationship ...`), for reference:

```jsonc
"relationships": {
  "authors": {
    "cardinality": "many",            // one | many
    "target.entity": "Author",
    "source.fields": [ "id" ],
    "target.fields": [ "book_id" ]
    // many-to-many also sets "linking.object" + "linking.source.fields" + "linking.target.fields"
  }
}
```

## Key-by-key notes

- `$schema` (string): the JSON schema URL. Pin a version (above) rather than `.../releases/latest/...` so the
  contract does not drift under you.
- `data-source.database-type`: `mssql` for the Azure SQL engine (same value used against Azure SQL Database in
  the cloud). `connection-string` uses `@env('NAME')`; keep the value in `SQL_CONNECTION_STRING`.
- `runtime.rest` / `runtime.graphql` / `runtime.mcp`: each `{ enabled, path }`. Defaults `/api`, `/graphql`,
  `/mcp`. `host.mode` is `development` or `production` (production disables Swagger and detail).
- `entities.<Name>.source`: `object` is the real `schema.table`; `type` is table/view/stored-procedure. Views
  and keyless tables also need `key-fields`.
- `entities.<Name>.permissions`: array of `{ role, actions: [ { action } ] }`. `anonymous:*` is unauthenticated
  full CRUD (local dev only). Column/row rules live under an action's `fields` / `policy`.
- `autoentities` (MSSQL only): pattern-based auto-exposure as an alternative to hand-listing entities. Beyond
  this common path; see the authoritative reference.

## Validate before you run

`dab validate -c dab-config.json` is the authoritative gate. It runs five ordered stages and exits nonzero on
the first failure: (1) schema, (2) config properties, (3) permissions, (4) database connection, (5) entity
metadata. Stages 4 and 5 connect to the engine and read the real tables, so a fully green `dab validate`
requires the container running with the target tables provisioned. `dab start` also fail-fasts on an invalid
config. Run `dab validate` after any hand edit, before `dab start`.

## Authoritative schema and docs

- Config reference (all keys, examples): https://learn.microsoft.com/en-us/azure/data-api-builder/configuration/
- Pinned JSON schema: https://github.com/Azure/data-api-builder/releases/download/v2.0.9/dab.draft.schema.json
- If the **Microsoft Learn MCP** server is available, you can pull the current DAB configuration reference on
  demand; it returns the prose reference, not the schema JSON, so this distilled shape stays the source for
  generation. Optional booster, not required.
