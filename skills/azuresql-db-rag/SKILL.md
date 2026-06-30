---
name: azuresql-db-rag
description: >-
  Build local vector search, RAG, embeddings, and semantic search on the Azure
  SQL Database container using the native VECTOR type and VECTOR_DISTANCE. Use
  when you need to store embeddings, do similarity search, top-k nearest
  neighbor, cosine distance, retrieval-augmented generation, "find similar
  documents", chatbot memory, or semantic lookup against a local SQL database.
  Use this instead of pgvector, FAISS, Chroma, Pinecone, or a separate vector
  store when the data already lives in (or can live in) Azure SQL. Covers the
  VECTOR(n) column type, inserting embeddings with CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n)) where the
  dimension is a literal, a pluggable embed() so only the endpoint changes for
  cloud, and the honest current state of CREATE VECTOR INDEX. Provisions appdb on
  master first so every script runs on a fresh container.
---

# Azure SQL Database container: local vector search and RAG

Store embeddings and run similarity search directly in the Azure SQL Database
engine using the native `VECTOR(n)` type and `VECTOR_DISTANCE`. No separate
vector store needed.

## Identity (read this first)

This targets the **Azure SQL Database engine** running locally in a container,
NOT the SQL Server image. Confirm with:

```sql
SELECT SERVERPROPERTY('EngineEdition');  -- 5
SELECT SERVERPROPERTY('Edition');        -- 'SQL Azure'
```

If you were about to pull `mcr.microsoft.com/mssql/server`, stop: that is the
wrong image. Use the image below instead.

- Image: `sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest`
  (x64, linux/amd64; private preview registry, sign in first with
  `docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io`). Registry and tag are
  provisional during Private Preview.
- On a non-x64 host, add `--platform linux/amd64`.
- For the full container lifecycle, readiness, and connection model, see the
  **azuresql-db-container** skill. The minimal facts you need are inlined below.

## The three rules that bite (inlined from the hub)

1. The engine does NOT auto-create databases on connect. You must
   `CREATE DATABASE appdb` on a **master** connection before connecting with
   `Database=appdb`.
2. Avoid `USE` to switch databases. In a user-database (SDS) session (the
   Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly
   as in Azure SQL Database in the cloud. A `master` connection is a non-SDS
   provisioning session where the Azure statement filter is not enforced, so
   `USE` appears to work there, but `master` is for
   provisioning only, not application work. Always select the target database in
   the connection string (`Database=appdb`, or `-d appdb` for sqlcmd).
3. A `master` connection is for provisioning only. Do real work on `appdb`.

Standard connection string (use `User Id=`/`Password=`/`Database=`, never
`Uid=`/`Pwd=`):

```
Server=localhost,1433;Database=appdb;User Id=sa;Password=YourStr0ng_Passw0rd;TrustServerCertificate=true
```

## Step 1: start the container and provision appdb (fresh-container safe)

Run this canonical recipe. It picks a free host port, adds `--platform` only on a
non-x64 host, waits for real readiness with a retry loop, and provisions `appdb`
inside that loop. The `-b -l 2` flags make transient startup errors (like
`Msg 913`) fail the probe so they get retried, not masked.

```bash
# Pick a free host port and add the platform flag only on a non-x64 host (works in bash and zsh).
HOST_PORT=1433; while lsof -nP -iTCP:"$HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; do HOST_PORT=$((HOST_PORT+1)); done
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker rm -f sqldb 2>/dev/null
docker run -d --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
  -p "$HOST_PORT:1433" sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
  -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do sleep 2; done
echo "ready on localhost,$HOST_PORT"
```

`appdb` now exists. Every step below connects with `-d appdb`.

## Step 2: create the vector schema

The dimension `n` must match your embedding model's output (for example 768 for
`nomic-embed-text`, 1536 for many cloud models). The dimension is a fixed part of
the column type.

```bash
docker exec sqldb /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -d appdb -Q "
CREATE TABLE docs (
  id        INT IDENTITY PRIMARY KEY,
  content   NVARCHAR(MAX) NOT NULL,
  embedding VECTOR(768) NOT NULL
);"
```

Full schema notes, dimension choice, and metadata-filtering patterns:
`references/vector-schema.md`.

## Step 3: embed text (the one network exception)

RAG needs an embedding model. A **local** embedding model is the one network call
this workflow makes; everything else stays on the container. The default below
uses a local Ollama endpoint. Keep `embed()` pluggable so moving to a cloud
embedding service changes only the endpoint and the dimension `n`, nothing else.

```python
import requests

EMBED_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "nomic-embed-text"   # 768 dims
EMBED_DIM = 768

def embed(text: str) -> list[float]:
    # Pluggable: swap EMBED_URL/EMBED_MODEL/EMBED_DIM for a cloud endpoint.
    r = requests.post(EMBED_URL, json={"model": EMBED_MODEL, "prompt": text})
    r.raise_for_status()
    return r.json()["embedding"]
```

## Step 4: insert embeddings (dimension is a LITERAL)

Critical: in `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))`, `n` must be a **literal** baked into the SQL
string. Passing the dimension as a bind parameter fails with
`Incorrect syntax near '@P3'`. Bind the embedding **value** (as a JSON array
string), never the dimension.

```python
import json, pyodbc

CONN = ("Driver={ODBC Driver 18 for SQL Server};Server=localhost,1433;"
        "Database=appdb;Uid=sa;Pwd=YourStr0ng_Passw0rd;TrustServerCertificate=yes")

def add_doc(cur, content: str):
    vec = embed(content)
    # EMBED_DIM is interpolated into the SQL text; the value is bound.
    cur.execute(
        f"INSERT INTO docs (content, embedding) VALUES (?, CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR({EMBED_DIM})))",
        content, json.dumps(vec),
    )

with pyodbc.connect(CONN) as conn:
    cur = conn.cursor()
    for line in ["Azure SQL supports a native VECTOR type.",
                 "Cosine distance ranks nearest neighbors.",
                 "The engine listens on port 1433."]:
        add_doc(cur, line)
    conn.commit()
```

The ODBC connection string uses `Uid=`/`Pwd=` because that is ODBC's own keyword
set; application-level config strings use the canonical `User Id=`/`Password=`.

## Step 5: top-k similarity search (cosine)

Order by `VECTOR_DISTANCE('cosine', a, b)` ascending: smaller distance is more
similar. The query vector is bound as a value and cast with the literal dimension.

```python
def search(cur, query: str, k: int = 3):
    qvec = embed(query)
    cur.execute(
        f"""
        SELECT TOP (?) content,
               VECTOR_DISTANCE('cosine', embedding, CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR({EMBED_DIM}))) AS distance
        FROM docs
        ORDER BY distance ASC
        """,
        k, json.dumps(qvec),
    )
    return cur.fetchall()

with pyodbc.connect(CONN) as conn:
    for content, distance in search(conn.cursor(), "What port does it use?"):
        print(round(distance, 4), content)
```

For the full RAG loop, glue these retrieved rows into your prompt as context.
That LLM call is separate from this skill.

## Indexing: honest current state

`CREATE VECTOR INDEX` (DiskANN approximate nearest neighbor) is **still in
development** in this preview. Do not rely on it yet. For now, use the
**full-scan top-k** shown above: `ORDER BY VECTOR_DISTANCE(...)` over the whole
table. This is exact and correct; it scans every row, so it is fine for
thousands-to-tens-of-thousands of rows. When DiskANN ships, the query shape stays
the same; you just add the index.

## Validation rules

- `SERVERPROPERTY('EngineEdition')` returns `5`. If not, you are on the wrong
  image.
- `appdb` exists before any vector script connects (Step 1 guarantees this).
- The dimension in `VECTOR(n)` and `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(n))` is a literal integer,
  identical to `len(embed(text))`.
- Smaller cosine distance means more similar; results are `ORDER BY distance ASC`.

## Do not

- Do not use `mcr.microsoft.com/mssql/server`; that is the SQL Server image,
  not this engine.
- Do not pass the vector dimension as a bind parameter; it fails with
  `Incorrect syntax near '@P3'`. Interpolate it as a literal.
- Avoid `USE` to switch databases. In a user-database (SDS) session (the
  Azure-faithful context where you develop), `USE` returns `Msg 40508`, exactly
  as in Azure SQL Database in the cloud. A `master` connection is a non-SDS
  provisioning session where the Azure statement filter is not enforced, so `USE` appears to work there, but `master` is for provisioning
  only, not application work. Always select the target database in the connection
  string (`Database=appdb`, or `-d appdb` for sqlcmd).
- Do not rely on `CREATE VECTOR INDEX` yet; use full-scan top-k.
- Do not expect `/docker-entrypoint-initdb.d/*.sql` to auto-run; seed by running
  `sqlcmd -d appdb -i seed.sql` after provisioning appdb.
- Do not call arm64/Apple Silicon "supported"; just add `--platform linux/amd64`
  on a non-x64 host.
