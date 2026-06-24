---
name: azure-sql-rag
description: Use this skill when the user wants to build retrieval-augmented generation (RAG), vector search, embeddings, or semantic search on the Azure SQL Database container. Triggers include "RAG with SQL Database", "store embeddings locally", "vector search in Azure SQL", "VECTOR_DISTANCE", "similarity search", or "build a local vector store". Start from the azure-sql-database-container skill to get the container running first. The image is x64; on Apple Silicon and arm64 it runs under emulation.
---

# Local RAG on the Azure SQL Database container

**Goal:** a RAG data layer with a native `VECTOR` column, embeddings from a local model, and top-k similarity search with `VECTOR_DISTANCE`. The schema and queries run unchanged in Azure SQL Database in the cloud; only the embedding endpoint changes (local model now, Azure OpenAI in production).

Prerequisite: the container is running (use the `azure-sql-database-container` skill).

> The image is x64 (`linux/amd64`). On Apple Silicon / arm64, run it under emulation: `docker run --platform linux/amd64 ...` (or `container run --arch amd64 --rosetta ...` on Apple Containers). The `VECTOR` type and `VECTOR_DISTANCE` work under emulation; `CREATE VECTOR INDEX` (DiskANN) is still in development, so use full-scan similarity for now.

## 1. Dependencies and a local embedding model

```bash
pip install mssql-python ollama python-dotenv
ollama pull nomic-embed-text   # 768-dim embeddings, runs locally, no cloud spend or egress
```

## 2. Connection string

```dotenv
SQL_CONNECTION_STRING="Server=localhost,1433;Database=appdb;Uid=sa;Pwd=YourStrong!Passw0rd;TrustServerCertificate=yes;"
```

## 3. RAG script (Python)

```python
import os, json, ollama, mssql_python
from dotenv import load_dotenv

load_dotenv()
DIM = 768  # nomic-embed-text

def embed(text: str) -> str:
    vec = ollama.embeddings(model="nomic-embed-text", prompt=text)["embedding"]
    return json.dumps(vec)  # the VECTOR column accepts a JSON array

conn = mssql_python.connect(os.environ["SQL_CONNECTION_STRING"])
cur = conn.cursor()

cur.execute(f"""
    DROP TABLE IF EXISTS documents;
    CREATE TABLE documents (
        id INT IDENTITY(1,1) PRIMARY KEY,
        content NVARCHAR(MAX) NOT NULL,
        embedding VECTOR({DIM}) NOT NULL
    );
""")

chunks = [
    "The Azure SQL Database container runs the Azure SQL Database engine locally.",
    "It supports a native vector type and VECTOR_DISTANCE similarity search.",
    "Build and test locally, then deploy to Azure SQL Database with a connection-string change.",
]
for c in chunks:
    cur.execute(
        "INSERT INTO documents (content, embedding) VALUES (?, CAST(? AS VECTOR(?)));",
        c, embed(c), DIM,
    )
conn.commit()

query = "How do I run vector search locally?"
cur.execute(
    """
    SELECT TOP 3 content,
        VECTOR_DISTANCE('cosine', embedding, CAST(? AS VECTOR(?))) AS distance
    FROM documents
    ORDER BY distance;
    """,
    embed(query), DIM,
)
for content, distance in cur.fetchall():
    print(f"{distance:.4f}  {content}")

cur.close(); conn.close()
```

## Rules

- The `embedding` column is a native `VECTOR(768)`; insert JSON arrays cast with `CAST(? AS VECTOR(768))`.
- Retrieve with `VECTOR_DISTANCE('cosine', ...)` and order ascending (smaller distance = closer).
- Keep the embedding dimension consistent between insert and query.
- Read the connection string from the environment; parameterize with `?`.

## Going to the cloud

Schema and queries are unchanged in Azure SQL Database. Swap the local Ollama embedding call for Azure OpenAI (keep a pluggable `embed()`), and point `SQL_CONNECTION_STRING` at your Azure SQL Database server.
