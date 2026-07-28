# Data API Builder config reference (`dab-config.json`)

## Contents

- Config shape
- Connection via `@env()`
- Entities and sources
- Permissions and policies
- REST and GraphQL options
- Relationships (`dab update --relationship`)
- Regenerating vs hand-editing

## Config shape

`dab init` writes a `dab-config.json` with two top-level areas: `data-source`
(how DAB connects) and `entities` (what it exposes). A minimal file looks like:

```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/download/v2.0.9/dab.draft.schema.json",
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('SQL_CONNECTION_STRING')"
  },
  "runtime": {
    "rest": { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql" },
    "host": { "mode": "development" }
  },
  "entities": {
    "Book": {
      "source": { "object": "dbo.Books", "type": "table" },
      "permissions": [
        { "role": "anonymous", "actions": [{ "action": "*" }] }
      ]
    }
  }
}
```

Prefer changing the file through the CLI (`dab add` / `dab update`) so it stays
schema-valid; see "Regenerating vs hand-editing" below.

## Connection via `@env()`

`--connection-string "@env('SQL_CONNECTION_STRING')"` stores the *indirection*,
not the secret, in the file. DAB resolves `@env('NAME')` from the environment at
`dab start`. Keep the value in `SQL_CONNECTION_STRING`:

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true
```

`database-type` is `mssql` for the Azure SQL engine (the same value used for
Azure SQL Database in the cloud - parity is the point).

## Entities and sources

- `dab add <EntityName> --source <schema.table> --source.type table --permissions "<role>:<actions>"`.
- The **entity name** is the API identity (`/api/Book`, GraphQL `book`/`books`);
  the **source** is the real database object (`dbo.Books`).
- `--source.type` is `table`, `view`, or `stored-procedure`. Views and keyless
  tables need `--source.key-fields "id"`.
- Rename exposed fields with `dab update <Entity> --map "db_col:apiName,..."`.

## Permissions and policies

- `--permissions` is `role:actions`. Actions are `create,read,update,delete` or
  `*`. Example dev value: `anonymous:*` (no auth, full CRUD - local only).
  Tighten to e.g. `anonymous:read` or an `authenticated:*` role for anything
  shared.
- Column-level: `dab update <Entity> --permissions "anonymous:read" --fields.include "id,title"` (or `--fields.exclude`).
- Row-level: `--policy-database "region eq 'US'"` (OData filter appended to the
  query) and `--policy-request "@claims.role == 'admin'"` (evaluated before the
  query).

## REST and GraphQL options

- Defaults: REST at `/api`, GraphQL at `/graphql`. Change per entity with
  `dab update <Entity> --rest <path|true|false>` and
  `--graphql <singular:plural|true|false>`.
- OpenAPI document at `/api/openapi`; Swagger UI at `/swagger` (Development host
  mode only). Health at `/health`.
- Host mode: `--host-mode Development` enables Swagger and detailed errors;
  `Production` (the default) disables them. Use Development locally.

## Relationships (`dab update --relationship`)

Declare relationships so REST/GraphQL can navigate between entities. The flags
(confirmed in the DAB CLI reference):

One-to-many / one-to-one (direct FK), giving DAB the field mapping
`sourceField:targetField`:

```bash
# A User has one Profile (Profile.user_id -> User.id)
dab update User \
  --relationship profile \
  --target.entity Profile \
  --cardinality one \
  --relationship.fields "id:user_id"

# A Category has many Books (Book.category_id -> Category.id)
dab update Category \
  --relationship books \
  --target.entity Book \
  --cardinality many \
  --relationship.fields "id:category_id"
```

Many-to-many through a linking table:

```bash
dab update Book \
  --relationship authors \
  --target.entity Author \
  --cardinality many \
  --relationship.fields "id:id" \
  --linking.object dbo.books_authors \
  --linking.source.fields book_id \
  --linking.target.fields author_id
```

Both related entities must already exist (`dab add`) before you relate them.

## Regenerating vs hand-editing

`dab-config.json` is generated. Prefer `dab add` / `dab update` over editing the
JSON by hand so it stays schema-valid; the pinned `$schema` line (above) enables
editor validation if you must edit.

## Validate against the schema

`dab validate -c dab-config.json` is the authoritative gate: it runs five ordered
stages (schema, config properties, permissions, database connection, entity
metadata) and exits nonzero on the first failure. Stages 4 and 5 connect to the
engine and read the real tables, so a fully green run needs the container up with
the target tables provisioned. `dab start` also fail-fasts on an invalid config.
Run `dab validate` after any hand edit. For the current schema (this reference
pins v2.0.9), fetch it from the Learn MCP or the `$schema` URL if the DAB version
you install differs.
