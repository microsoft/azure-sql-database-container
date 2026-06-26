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
       VECTOR_DISTANCE('cosine', embedding, CAST('[...]' AS VECTOR(768))) AS distance
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

`CREATE VECTOR INDEX` (DiskANN approximate nearest neighbor) is still in
development in this preview. Do not depend on it. Use full-scan top-k for now.
The query shape does not change when the index ships; you add the index and keep
the same `ORDER BY VECTOR_DISTANCE(...)`.

## Troubleshooting

| Symptom                               | Cause and fix                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `Incorrect syntax near '@P3'`         | Dimension passed as a bind parameter. Interpolate `n` as a literal.           |
| `Explicit conversion from data type ntext to vector is not allowed (529)` | The JSON vector string was sent as ntext. Wrap the parameter: `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))`. |
| `Msg 40508` on `USE`                  | Avoid `USE` to switch databases. In a user-database (SDS) session (the Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly as in Azure SQL Database in the cloud. A `master` connection is a non-SDS provisioning session where the Azure statement filter is not enforced, so `USE` (and `BACKUP`/`RESTORE`) appear to work there, but `master` is for provisioning only, not application work. Always select the target database in the connection string (`Database=appdb`, or `-d appdb` for sqlcmd). |
| Cannot connect / `Msg 913` at startup | Engine not ready yet. Use the `-b -l 2` retry loop from Step 1.               |
| Dimension mismatch on insert          | `len(embed(text))` must equal `n` in the column type and the `CAST` literal.  |
| Results look random                   | Query and stored vectors used different models or metrics; align them.        |
