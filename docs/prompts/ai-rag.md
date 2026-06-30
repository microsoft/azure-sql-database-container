# AI Prompt: Build a local RAG pipeline on the Azure SQL Database container

**Role:** You are an expert AI engineer building a retrieval-augmented-generation (RAG) data layer in the current project, using the Azure SQL Database container as a local vector store.

**Purpose:** Stand up the container, create a table with a native `VECTOR` column, embed text locally with a free model, store the vectors, and run top-k similarity search with `VECTOR_DISTANCE`. The same schema and queries run unchanged against Azure SQL Database in the Microsoft Azure cloud; only the embedding endpoint changes (local model now, Azure OpenAI in production).

**Scope:**
- Assumes a Python project with Docker available. Adapt to Node.js with the `mssql` driver if the project is JavaScript.
- Uses Ollama for local embeddings so there is no cloud spend or data egress while prototyping.

Read the entire instruction set before executing.

---

## Instructions

### 1. Start the container

```bash
# The image is in a private preview registry; sign in with the credentials provided when you sign up at https://aka.ms/sqldbcontainerpreview-signup (pull-only; may be rotated during the preview) first
docker login sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io
# The image is x64-only; on a non-x64 host (Apple Silicon) this adds --platform linux/amd64 to run it under emulation.
PLATFORM=(); case "$(docker info -f '{{.Architecture}}' 2>/dev/null)" in x86_64|amd64) ;; *) PLATFORM=(--platform linux/amd64);; esac
docker run --name sqldb "${PLATFORM[@]}" -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng_Passw0rd" \
    -p 1433:1433 -d sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/mssql-server/sqldb-dev-edition:latest
```

Wait for the engine, then create the `appdb` database. Azure SQL Database does **not** create databases automatically on connect, so `appdb` must exist before `rag.py` connects:

```bash
# Create appdb, retrying until it succeeds (waits out engine startup; -b makes sqlcmd return a
# non-zero exit on a SQL error so the loop retries while the engine is still initializing).
until docker exec sqldb /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "YourStr0ng_Passw0rd" -C -b -l 2 \
    -Q "IF DB_ID('appdb') IS NULL CREATE DATABASE appdb;" >/dev/null 2>&1; do
  sleep 2
done
```

### 2. Install dependencies and a local embedding model

`mssql-python` requires **Python 3.10 or newer** (there is no distribution for 3.9). Use a 3.10+ interpreter or virtual environment.

```bash
pip install mssql-python ollama python-dotenv
ollama pull nomic-embed-text   # 768-dimensional embeddings, runs locally
```

### 3. Configure the connection string

Create `.env` with a single connection string (swap only this value for the cloud later):

```dotenv
SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;Uid=sa;Pwd=YourStr0ng_Passw0rd;TrustServerCertificate=yes;"
```

### 4. Create the RAG script

Create `rag.py`. If the project already has code, preserve it and add this as a new module.

```python
import os, json, ollama
import mssql_python
from dotenv import load_dotenv

load_dotenv()
DIM = 768  # nomic-embed-text

def embed(text: str) -> str:
    vec = ollama.embeddings(model="nomic-embed-text", prompt=text)["embedding"]
    return json.dumps(vec)  # the VECTOR column accepts a JSON array

conn = mssql_python.connect(os.environ["SQL_CONNECTION_STRING"])
cur = conn.cursor()

# Schema: a native VECTOR column, same type as Azure SQL Database in the cloud
cur.execute(f"""
    DROP TABLE IF EXISTS documents;
    CREATE TABLE documents (
        id INT IDENTITY(1,1) PRIMARY KEY,
        content NVARCHAR(MAX) NOT NULL,
        embedding VECTOR({DIM}) NOT NULL
    );
""")

# Index for embeddings: store each chunk with its vector
chunks = [
    "The Azure SQL Database container runs the Azure SQL Database engine locally.",
    "It supports a native vector type and VECTOR_DISTANCE similarity search.",
    "Build and test locally, then deploy to Azure SQL Database with a connection-string change.",
]
for c in chunks:
    cur.execute(
        # VECTOR's dimension must be a literal (inline DIM), not a bind parameter. The bound JSON
        # string must be cast to NVARCHAR(MAX) first: a long embedding is otherwise sent as ntext
        # and fails with "Explicit conversion from data type ntext to vector is not allowed" (529).
        f"INSERT INTO documents (content, embedding) VALUES (?, CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR({DIM})));",
        c, embed(c),
    )
conn.commit()

# Retrieve: top-k nearest neighbours by cosine distance
query = "How do I run vector search locally?"
cur.execute(
    f"""
    SELECT TOP 3 content,
        VECTOR_DISTANCE('cosine', embedding, CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR({DIM}))) AS distance
    FROM documents
    ORDER BY distance;
    """,
    embed(query),
)
print(f"Query: {query}\n")
for content, distance in cur.fetchall():
    print(f"{distance:.4f}  {content}")

cur.close()
conn.close()
```

Run it:

```bash
python rag.py
```

---

## Validation rules

- The `embedding` column is a native `VECTOR(768)`; vectors are inserted as JSON arrays with `CAST(CAST(? AS NVARCHAR(MAX)) AS VECTOR(768))` (the inner `NVARCHAR(MAX)` keeps a long embedding from being sent as ntext, which fails with error 529).
- Retrieval uses `VECTOR_DISTANCE('cosine', ...)` and orders ascending (smaller distance = closer match).
- The embedding dimension is consistent between insert and query.
- The connection string is read from the environment; queries are parameterized with `?`.

## Going to the cloud

- The schema and queries are unchanged in Azure SQL Database. Swap the local Ollama embedding call for Azure OpenAI (or keep a pluggable `embed()` function), and point `SQL_CONNECTION_STRING` at your Azure SQL Database server.

## Do not

- Do not hardcode the connection string or send local data to any external service while prototyping (Ollama runs on the machine).
- Do not mix embedding models or dimensions between writing and querying.
