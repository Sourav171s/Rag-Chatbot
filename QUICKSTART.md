# 🚀 Quickstart Guide

Get the RAG Chatbot running locally in a few minutes with Docker Compose and the **Google Gemini API free tier**.

The stack: React/Vite frontend → Express/TypeScript backend → Google Gemini (chat + embeddings, via Google's official `@google/genai` SDK) → PostgreSQL + pgvector.

No OpenAI account or key is needed — the backend makes no OpenAI calls.

## 1. Requirements

- **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop)) — it runs PostgreSQL, the backend and the frontend for you. You do **not** need to install PostgreSQL or Node.js.
- **A Gemini API key** (free) — see the next step.

## 2. Get a Gemini API key

1. Open **Google AI Studio → API keys**: https://aistudio.google.com/apikey
2. Sign in with a Google account and click **Create API key**.
3. Copy the key. Keep it private: it goes only into `.env.docker`, which is gitignored and read only by the backend container.

Keys in a Google Cloud project **without billing set up** use the free tier.

## 3. Create `.env.docker`

Create a file named `.env.docker` in the repository root (next to `docker-compose.yml`):

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
DB_PASSWORD=postgres
GEMINI_CHAT_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSION=1536
```

Replace `YOUR_GEMINI_API_KEY` with your key — no quotes, no spaces.

Windows PowerShell (writes the file without a byte-order mark):

```powershell
@"
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
DB_PASSWORD=postgres
GEMINI_CHAT_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSION=1536
"@ | Out-File -FilePath .env.docker -Encoding ascii
notepad .env.docker   # paste your real key, save
```

macOS / Linux:

```bash
cat > .env.docker << 'EOF'
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
DB_PASSWORD=postgres
GEMINI_CHAT_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSION=1536
EOF
```

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | yes | — | Your key. Backend only; never sent to the browser or logged. |
| `GEMINI_CHAT_MODEL` | no | `gemini-3.8-flash` | Model that writes the answers |
| `GEMINI_EMBEDDING_MODEL` | no | `gemini-embedding-2` | Model that turns text into vectors |
| `EMBEDDING_DIMENSION` | no | `1536` | Vector size; must match the `vector(1536)` column |
| `DB_PASSWORD` | no | `postgres` | PostgreSQL password used by Docker Compose |
| `GEMINI_MAX_TOKENS` | no | `2048` | Output budget per answer, **including** Gemini's thinking tokens |
| `GEMINI_THINKING_LEVEL` | no | `low` | `low`, `medium` or `high` (`gemini-3.8-flash` cannot turn thinking off) |
| `GEMINI_MAX_RETRIES` | no | `2` | Retries on 408/429/5xx and network errors, with backoff |

## 4. Start everything

```bash
docker compose up -d --build
```

This will:
- ✅ Start PostgreSQL with the pgvector extension (port 5432)
- ✅ Build and start the backend API (port 3001), run database migrations, and seed the knowledge base
- ✅ Build and start the frontend UI (port 3000)

The first build takes a few minutes. Check that all three containers are up:

```bash
docker compose ps
docker compose logs backend
```

Startup order is enforced: PostgreSQL becomes healthy → the backend runs migrations, then seeding, then starts the API and becomes healthy → the frontend starts.

In the backend log you should see `🎉 Seeding completed!` and `🚀 Server running on port 3001`.

## 5. PostgreSQL + pgvector (what is running)

PostgreSQL stores everything: the knowledge-base documents, their embeddings, and the chat history. The `pgvector` extension adds a `vector(1536)` column type and the `<=>` cosine-distance operator, so similarity search is plain SQL:

```sql
SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS similarity
FROM documents
WHERE metadata->>'embeddingModel' = 'gemini-embedding-2'
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

Tables (created by `backend/src/db/migrate.ts`): `documents` (content, `embedding vector(1536)`, `metadata` JSONB), `conversations`, `messages`, `migrations`.

Open a SQL shell inside the container (no local PostgreSQL install needed):

```bash
docker compose exec postgres psql -U postgres -d rag_chatbot
```

## 6. Migrations and seeding

Both run automatically when the backend container starts (`backend/start.sh`):

1. **Migrations** create the pgvector extension and tables. Each migration runs once (tracked in the `migrations` table).
2. **Seeding** (`RUN_SEED=true` by default) runs this pipeline for the 15 topic files in `backend/src/db/docs/` (the folder's own `README.md` is skipped):

   ```
   markdown files → chunking (≤ 8000 characters) → gemini-embedding-2 (1536 floats each) → documents table (pgvector)
   ```

Seeding is built for the free tier:
- All new chunks are embedded in **one batch request** (up to 100 inputs per request), not one request per file. Each input gets its own vector.
- It is **idempotent**: files whose stored chunks are unchanged and were embedded with the current model are skipped, so restarting the backend makes **zero** embedding calls.
- If a file changes, only that file is re-embedded. Duplicates and rows from another embedding model (for example old OpenAI vectors) are replaced, so vectors are never mixed.
- Every vector is checked to be exactly `EMBEDDING_DIMENSION` long before it is stored, and the script verifies the stored row count at the end.
- If seeding fails (e.g. missing key, quota exceeded, no internet), the error is logged and the API still starts — the container does not crash-loop and re-call the API.

Run seeding manually (e.g. after adding a markdown file and rebuilding):

```bash
docker compose exec backend node dist/db/seed-embeddings.js
```

## 7. Health check and stats

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/chat/stats
```

Windows PowerShell (`curl` is an alias there, so use `Invoke-RestMethod`):

```powershell
Invoke-RestMethod http://localhost:3001/api/health
Invoke-RestMethod http://localhost:3001/api/chat/stats
```

Expected stats:

```json
{
  "success": true,
  "data": {
    "totalDocuments": 15,
    "embeddingDimension": 1536,
    "embeddingModel": "gemini-embedding-2",
    "searchableDocuments": 15
  }
}
```

`searchableDocuments` counts documents embedded with the current model. Only those are used for retrieval.

## 8. Chat

Open **http://localhost:3000** and ask, for example:
- "What is machine learning?"
- "Explain transformers."
- "What is RAG?"

Or call the API directly (PowerShell):

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/chat `
  -ContentType "application/json" `
  -Body '{"message":"What is RAG?"}' | ConvertTo-Json -Depth 6
```

The response contains `message` (Gemini's answer), `sources` (retrieved chunks with similarity scores and metadata), `sourceCount`, `conversationId` (send it back to continue the conversation) and `usage`.

Each chat message makes exactly **two** Gemini calls: one query embedding and one answer generation (plus bounded retries if Gemini is busy).

### How RAG works here

```
question
  → gemini-embedding-2 turns it into a 1536-float query vector ("task: search result | query: …")
  → pgvector finds the closest document vectors (cosine distance, `<=>`), keeps those ≥ SIMILARITY_THRESHOLD (0.2)
  → the top MAX_SOURCES (5) chunks are put into the system instruction as [Source 1] … [Source 5]
  → gemini-3.8-flash answers, using the stored conversation history, and cites the sources
  → the answer, sources and token usage are returned and saved in PostgreSQL
```

The chat call uses Gemini's **Interactions API** (`client.interactions.create`) in stateless mode (`store: false`): the conversation history lives in PostgreSQL and is sent with each request, so Google does not keep it.

## 9. Reset the database

```bash
# Deletes the PostgreSQL volume (all documents, embeddings and chats), then rebuilds and re-seeds
docker compose down -v
docker compose up -d --build
```

Use this after changing the embedding model, or whenever you want a clean slate. Re-seeding costs one batch embedding request.

## 10. Gemini free-tier limits

- Usage is **subject to Google's free-tier rate limits, quotas and terms**. It is not unlimited. Current per-model limits for your project are shown in AI Studio: https://aistudio.google.com/rate-limit
- The chat limit is small: while this project was being tested (October 2026), Google reported **20 requests per day** for `gemini-3.8-flash` on the free tier. Every chat message uses one of them, so plan your testing. Embeddings have a separate quota; seeding uses one request.
- The error message tells you which limit you hit and when it resets, for example: `Rate limit exceeded for model gemini-3.8-flash (limit: 20 requests per day on Free Tier). Please retry in 3h44m`.
- If you hit a limit, the API returns HTTP `429` with a clear message ("rate limit or free-tier quota exceeded"). If Gemini is temporarily overloaded it returns HTTP `503` — wait and retry. The backend retries transient errors at most `GEMINI_MAX_RETRIES` times (default 2), waiting at most 10 seconds between attempts — never in a loop. A busy or rate-limited model can therefore make a single answer take up to about a minute before it fails.
- On the free tier, Google may use your prompts and responses to improve its products. Don't send confidential data.
- This project does **not** use Google Search grounding or any other separately billed feature.

## 11. Changing the embedding model requires re-embedding

Embeddings from different models (or different dimensions) live in different vector spaces, so comparing them gives meaningless similarity scores — an OpenAI `text-embedding-3-small` vector and a `gemini-embedding-2` vector can both have 1536 numbers, but the numbers mean different things. Every stored document therefore has to be embedded again with the new model. This project guards against mixing them:

- Every stored vector records `embeddingModel` and `embeddingDimension` in its metadata.
- Vector search only compares vectors from the **current** `GEMINI_EMBEDDING_MODEL`.
- The seed script replaces seeded documents embedded with another model.

If you change `GEMINI_EMBEDDING_MODEL`, restart the backend (`docker compose up -d --build`) to re-seed, and re-ingest any documents you added through `/api/chat/ingest` — or reset the database (step 9). If you change `EMBEDDING_DIMENSION`, the `vector(1536)` column must change too, which needs a new migration (the seed script stops with a clear error on a mismatch).

## Useful commands

```bash
docker compose logs -f backend     # follow backend logs
docker compose restart backend     # restart (no embedding calls; seeding is idempotent)
docker compose down                # stop everything, keep data
docker compose up -d --build       # rebuild after code changes
```

## Add your own documents

```bash
curl -X POST http://localhost:3001/api/chat/ingest \
  -H "Content-Type: application/json" \
  -d '{"documents":[{"content":"Your custom knowledge here...","metadata":{"category":"Custom","topic":"Your Topic"}}]}'
```

Each ingested document is chunked and all its chunks are embedded in one batch request.

## Troubleshooting

**"Gemini API key is not configured"** — `.env.docker` is missing, the key line is empty, or the container wasn't recreated. Fix the file, then `docker compose up -d --force-recreate backend`.

**"Invalid Gemini API key"** — copy the key again from AI Studio; make sure there are no quotes or spaces.

**"rate limit or free-tier quota exceeded (429)"** — wait a minute (per-minute limit) or until the daily quota resets.

**"Gemini service error (503)"** — Gemini is temporarily overloaded. Wait a little and ask again.

**"Could not reach the Gemini API"** — the backend container has no internet access (for example right after Docker Desktop starts). Check your connection, then re-run seeding: `docker compose exec backend node dist/db/seed-embeddings.js`.

**Ports 3000, 3001 or 5432 already in use** (PowerShell): `Get-NetTCPConnection -LocalPort 5432` — stop the other program or change the port mapping in `docker-compose.yml`.

**Database not seeding** — check `docker compose logs backend` for the seeding error, fix it, then run `docker compose exec backend node dist/db/seed-embeddings.js`.

## FAQ

**Is my API key secure?** The key lives only in `.env.docker` (gitignored) and is passed only to the backend container. The frontend container and the browser bundle never receive it, and the backend never logs it.

**Can I use a different chat model?** Set `GEMINI_CHAT_MODEL` in `.env.docker` and run `docker compose up -d --force-recreate backend`. Check that the model has a free tier on Google's pricing page.

**Can I use a different database?** No — this project is built on PostgreSQL + pgvector.
