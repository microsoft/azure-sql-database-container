# Vector schema reference

Schema patterns, dimension choices, insert/query mechanics, and metadata
filtering for vector search on the Azure SQL Database container.

## Contents

- [Prerequisites](#prerequisites)
- [Choosing the dimension n](#choosing-the-dimension-n)
- [Table shapes](#table-shapes)
- [Inserting embeddings](#inserting-embeddings)
- [Top-k query patterns](#top-k-query-patterns)
- [Distance metrics](#distance-metrics)
- [Metadata filtering](#metadata-filtering)
- [Seeding a corpus](#seeding-a-corpus)
- [Indexing status](#indexing-status)
- [Troubleshooting](#troubleshooting)

## Prerequisites

`appdb` must already exist on a `master` connection before anything here runs.
The engine does NOT auto-create it. See the canonical start recipe in `SKILL.md`
(Step 1) or the **azuresql-db-container** skill. All commands below connect with
`-d appdb`.

## Choosing the dimension n

`n` is fixed in the column type and must equal the length of the vector your
embedding model returns. Common values:

| Model (example)        | Dimension |
| ---------------------- | --------- |
| nomic-embed-text       | 768       |
| all-MiniLM-L6-v2       | 384       |
| many cloud text models | 1536      |

If you change models, the dimension usually changes; the column type, the
`CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))` literal, and `EMBED_DIM` in code must all move together.

## Table shapes

Minimal:

```sql
CREATE TABLE docs (
  id        INT IDENTITY PRIMARY KEY,
  content   NVARCHAR(MAX) NOT NULL,
  embedding VECTOR(768) NOT NULL
);
```

With metadata for filtered search:

```sql
CREATE TABLE chunks (
  id         INT IDENTITY PRIMARY KEY,
  doc_id     INT          NOT NULL,
  source     NVARCHAR(256) NOT NULL,
  chunk_ix   INT          NOT NULL,
  content    NVARCHAR(MAX) NOT NULL,
  created_at DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME(),
  embedding  VECTOR(768)  NOT NULL
);
CREATE INDEX ix_chunks_source ON chunks (source);  -- ordinary B-tree for the WHERE filter
```

The `VECTOR` column stores the embedding; ordinary columns and indexes handle
metadata filtering.

## Inserting embeddings

The dimension is a literal in the SQL text; the value is bound as a JSON array
string. Passing the dimension as a parameter fails with
`Incorrect syntax near '@P3'`.

T-SQL (literal vector, for quick checks via sqlcmd):

```sql
INSERT INTO docs (content, embedding)
VALUES (N'hello', CAST('[0.1, 0.2, 0.3, ...768 values...]' AS VECTOR(768)));
```

Parameterized (application code): bind `content` and the JSON-encoded vector;
interpolate the dimension.

```python
cur.execute(
    f"INSERT INTO docs (content, embedding) VALUES (?, CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR({EMBED_DIM})))",
    content, json.dumps(vec),
)
```

Batch many rows with `cur.executemany(...)` using the same SQL string.

## Top-k query patterns

Nearest neighbors, smallest cosine distance first:

```sql
SELECT TOP (5) content,
       VECTOR_DISTANCE('cosine', embedding, CAST('[...query vector...]' AS VECTOR(768))) AS distance
FROM docs
ORDER BY distance ASC;
```

Parameterized:

```python
cur.execute(
    f"""SELECT TOP (?) content,
              VECTOR_DISTANCE('cosine', embedding, CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR({EMBED_DIM}))) AS distance
       FROM docs ORDER BY distance ASC""",
    k, json.dumps(qvec),
)
```

This is a full scan: exact and correct, fine for thousands to tens of thousands
of rows.

## Distance metrics

`VECTOR_DISTANCE(metric, a, b)` supports `'cosine'`, `'euclidean'`, and
`'dot'`. For all of them, `ORDER BY distance ASC` returns the closest first.
Cosine is the default choice for normalized text embeddings. Pick one metric and
use it consistently for a given table; mixing metrics across insert and query is
meaningless.

## Metadata filtering

Combine an ordinary `WHERE` with the distance ordering. Filter first, then rank:

```sql
SELECT TOP (5) content,
       VECTOR_DISTANCE('cosine', embedding, CAST('[...query vector...]' AS VECTOR(768))) AS distance
FROM chunks
WHERE source = N'handbook.pdf'
ORDER BY distance ASC;
```

The B-tree index on `source` narrows the candidate set before the vector scan.

## Seeding a corpus

The image does NOT auto-run `/docker-entrypoint-initdb.d/*.sql` (that is a
Postgres/MySQL convention and is not honored here). Seed explicitly AFTER
provisioning `appdb`:

```bash
docker exec -i sqldb /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -d appdb -i seed.sql
```

For programmatic seeding, loop over your documents in application code calling
`embed()` then the parameterized insert.

## Indexing status

`CREATE VECTOR INDEX` (DiskANN approximate nearest neighbor) works on this image.
Measured 2026-08-29 on `12.0.2000.8`, `EngineEdition` 5: 2000 rows of `VECTOR(3)`
indexed in 478 ms, visible in `sys.indexes` as `type_desc` `VECTOR`, and queried
through `vector_search(...)`.

It needs `SET QUOTED_IDENTIFIER ON` (and `SET ANSI_NULLS ON`), which are off by
default in `sqlcmd`. Without
it you get `Msg 1934`, whose text names indexed views, computed columns, filtered
indexes, query notifications, XML methods and spatial indexes, and never the
session setting that caused it.

Once the index exists, `vector_search(...)` rejects an explicit `TOP_N` with
`Msg 42274`. Use `SELECT TOP (k)` with `ORDER BY s.distance`.

Full-scan top-k with `ORDER BY VECTOR_DISTANCE(...)` stays exact and stays the
right choice for a small table.

## The rules the index imposes once it exists

Measured 2026-08-31 on `12.0.2000.8` unless marked as documented.

| Rule | Evidence |
|---|---|
| At least **100 rows with non-null vectors**. 99 is refused, 100 succeeds, and 120 rows with 60 nulls is refused | `Msg 42266`, measured at the boundary |
| `TRUNCATE TABLE` is refused while the index exists | `Msg 42232`, measured. Drop the index, truncate, reload 100 rows, recreate |
| `DROP VECTOR INDEX` is not a statement | `Msg 102, Incorrect syntax near 'VECTOR'`. Use `DROP INDEX name ON table` |
| `INSERT`, `UPDATE`, `DELETE` all work with the index in place | measured. Older index versions made the table read only |
| The table needs a primary key clustered index | documented |
| Vector indexes cannot be partitioned and are not replicated to subscribers | documented |
| A **security policy and a vector index cannot share a table** on the container, in either order | `Msg 37579` creating the policy after the index, `Msg 42244` creating the index after the policy. Both measured. **Documented nowhere.** The two coexist on Azure SQL Database, so this is a parity gap |
| The `vector` column tops out at **1998 dimensions**, so a 3072-dimension model does not fit | `Msg 2717, The size (1999) given to the column 'v' exceeds the maximum allowed (1998)`. Learn states the same ceiling. The dimension cannot be widened later by `ALTER COLUMN`, even on an empty table |

### The security policy conflict, in full

A chunk table is a second copy of the source text, so the row-level security
policy protecting the original table does not reach it. Add a vector index and no
policy can be put on the chunk table at all, which leaves the tenant filter in the
retrieval query's `WHERE` clause as the entire boundary, held up by a test rather
than by the engine.

```text
Msg 37579, Level 16, State 1
The security policy 'p_chunks' cannot reference tables with vector indexes.
Table 'dbo.chunks' has a vector index.

Msg 42244
A vector index cannot be created on tables with security policies.
Table 'dbo.chunks' has security policy 'p_chunks'.
```

**Where the sources disagree:** Microsoft Learn's `CREATE VECTOR INDEX`
limitations list names partitioning, the clustered primary key, replication,
`TRUNCATE TABLE` and data-tier package import, and the `vector` type's limitations
page names constraints, indexes, ledger tables and Always Encrypted. As of
2026-09-03 neither mentions security policies. The refusal above is this skill's
own measurement. If it ever stops reproducing, the product moved.

Three ways to live with it: keep the tenant filter in the query and test that
removing it changes the row count; drop the vector index on the tenant-scoped
table and take exact search; or split the table, with the indexed vector column on
a policy-free table joined back to a policy-bearing table holding the chunk text
and tenant column.

## Two things that will bite later, both documented rather than measured

**Indexes built on the earlier data structure are deprecated.** They still work in
the current release and will be retired. They cannot be upgraded in place: drop
and recreate is the only path, and dropping disables approximate search on that
table until the new one is built, so it belongs in a maintenance window. The
older structure also made the table read only after index creation and applied
filters only after retrieval, which is why the migration is worth doing rather
than deferring.

**A vector index cannot be deployed with DacPac or BACPAC.** The import creates
schema objects before loading data, so the index is created against an empty
table, hits the 100 row minimum, and the import fails. The workaround is to drop
vector indexes before exporting and recreate them after importing. This is worth
knowing before someone plans a migration around an export.

## Troubleshooting

| Symptom                               | Cause and fix                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `Incorrect syntax near '@P3'`         | Dimension passed as a bind parameter. Interpolate `n` as a literal.           |
| `Explicit conversion from data type ntext to vector is not allowed (529)` | The JSON vector string was sent as ntext. Wrap the parameter: `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))`. |
| `Msg 40508` on `USE`                  | Avoid `USE` to switch databases. In a user-database session (the Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as in Azure SQL Database in the cloud. A `master` connection is a provisioning session where the Azure statement filter is not enforced, so `USE` appears to work there, but `master` is for provisioning only, not application work. Always select the target database in the connection string (`Database=appdb`, or `-d appdb` for sqlcmd). |
| Cannot connect / `Msg 913` at startup | Engine not ready yet. Use the `-b -l 2` retry loop from Step 1.               |
| Dimension mismatch on insert          | `len(embed(text))` must equal `n` in the column type and the `CAST` literal.  |
| Results look random                   | Query and stored vectors used different models or metrics; align them.        |
