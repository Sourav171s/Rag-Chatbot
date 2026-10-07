# RAG Chatbot

A full-stack Retrieval-Augmented Generation (RAG) chatbot built with **Google Gemini**, **PostgreSQL + pgvector**, **Express + TypeScript**, and **React + Vite**.

The application answers user questions using a curated AI/ML knowledge base. Instead of sending the entire knowledge base to the LLM, it first converts the user's question into an embedding, retrieves the most relevant document chunks using vector similarity search, and then gives those chunks to Gemini as context.

## ✨ Features

- 🤖 **RAG-powered answers** grounded in a curated AI/ML knowledge base
- 🔎 **Semantic vector search** using PostgreSQL + pgvector
- 🧠 **Gemini-powered generation** using Google's official `@google/genai` SDK
- 🧩 **Gemini Embedding 2** for document and query embeddings
- 💬 **Multi-turn conversations** with persistent chat history
- 📚 **Source citations** showing which documents informed an answer
- 📊 **Token/context usage tracking**
- 🐳 **Docker Compose** for one-command local setup
- 🗄️ **Automatic database migrations**
- 🌱 **Automatic idempotent document seeding**
- ☁️ **Render deployment configuration**
- 🔐 **Server-side API key handling**

---

## 🧠 How RAG Works

The application follows this pipeline:

```text
User Question
      │
      ▼
Gemini Embedding 2
      │
      ▼
Query Embedding
      │
      ▼
PostgreSQL + pgvector
      │
      ▼
Similarity Search
      │
      ▼
Top Relevant Document Chunks
      │
      ▼
RAG Context
      │
      ▼
Gemini 3.8 Flash
      │
      ▼
Generated Answer + Sources
      │
      ▼
Saved Conversation
```

### Example

When the user asks:

> What is Retrieval-Augmented Generation?

The backend:

1. Converts the question into a vector embedding.
2. Searches PostgreSQL for semantically similar document chunks.
3. Selects the most relevant chunks.
4. Adds those chunks to the prompt as context.
5. Sends the request to Gemini.
6. Returns the generated answer together with the relevant source documents.

This helps keep responses grounded in the application's own knowledge base.

---

## 🏗️ Architecture

```text
┌──────────────────────┐
│   React + Vite UI    │
│      Port 3000       │
└──────────┬───────────┘
           │
           │ HTTP
           ▼
┌──────────────────────┐
│ Express + TypeScript │
│      Port 3001       │
└──────────┬───────────┘
           │
     ┌─────┴──────┐
     │            │
     ▼            ▼
┌────────────┐  ┌──────────────────┐
│   Gemini   │  │ PostgreSQL       │
│            │  │ + pgvector       │
│ Chat       │  │                  │
│ Embeddings │  │ Documents        │
└────────────┘  │ Embeddings       │
                │ Conversations    │
                └──────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express + TypeScript |
| LLM | Google Gemini 3.8 Flash |
| Embeddings | Gemini Embedding 2 |
| Vector Database | PostgreSQL + pgvector |
| API SDK | `@google/genai` |
| Styling | Tailwind CSS |
| Database Driver | PostgreSQL (`pg`) |
| Containerization | Docker + Docker Compose |
| Deployment | Render |
| Package Management | npm workspaces |

Gemini Embedding 2 supports flexible output dimensions, including **1536**, which is the dimension used by this project.

---

## 📁 Repository Structure

```text
Rag-Chatbot/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── gemini.config.ts
│   │   │
│   │   ├── db/
│   │   │   ├── docs/
│   │   │   ├── config.ts
│   │   │   ├── migrate.ts
│   │   │   └── seed-embeddings.ts
│   │   │
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   │
│   │   ├── models/
│   │   │   ├── conversation.model.ts
│   │   │   └── document.model.ts
│   │   │
│   │   ├── repositories/
│   │   │   ├── conversation.repository.ts
│   │   │   └── document.repository.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── chat.ts
│   │   │   └── health.ts
│   │   │
│   │   ├── services/
│   │   │   ├── embedding.service.ts
│   │   │   ├── llm.service.ts
│   │   │   ├── rag.service.ts
│   │   │   └── vector.service.ts
│   │   │
│   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── Dockerfile
│   ├── start.sh
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Chatbot.tsx
│   │   ├── config.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── common-ui/
│   └── Shared UI components
│
├── docker-compose.yml
├── render.yaml
├── package.json
├── package-lock.json
├── QUICKSTART.md
├── README.md
├── .gitignore
└── .dockerignore
```

---

# 🚀 Quick Start

## Prerequisites

Install:

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- A Google account
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

You **do not need to install PostgreSQL locally**. Docker Compose runs PostgreSQL with pgvector for you.

---

## 1. Clone the repository

```bash
git clone https://github.com/Sourav171s/Rag-Chatbot.git
cd Rag-Chatbot
```

---

## 2. Create `.env.docker`

Create a file named:

```text
.env.docker
```

in the project root.

Add:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
DB_PASSWORD=postgres
GEMINI_CHAT_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSION=1536
```

Replace `YOUR_GEMINI_API_KEY` with your actual Gemini API key.

### Security

Never commit `.env.docker` to GitHub.

Your API key should remain on the backend and must never be exposed to the frontend.

---

## 3. Start the application

```bash
docker compose up -d --build
```

Docker will start:

- PostgreSQL + pgvector
- Backend API
- Database migrations
- Database seeding
- Frontend

---

## 4. Open the application

Open:

```text
http://localhost:3000
```

You can now ask questions such as:

```text
What is machine learning?
```

```text
Explain transformers.
```

```text
What is retrieval-augmented generation?
```

---

# 🐳 Docker Commands

### Start all services

```bash
docker compose up -d
```

### Rebuild after code changes

```bash
docker compose up -d --build
```

### Stop services

```bash
docker compose down
```

### View all logs

```bash
docker compose logs -f
```

### View backend logs

```bash
docker compose logs -f backend
```

### View PostgreSQL logs

```bash
docker compose logs -f postgres
```

### View frontend logs

```bash
docker compose logs -f frontend
```

### Check container status

```bash
docker compose ps
```

---

# 🔄 Reset the Database

When changing the embedding model or rebuilding the knowledge base, existing vectors should not be mixed with embeddings generated by another model.

To completely reset PostgreSQL:

```bash
docker compose down -v
docker compose up -d --build
```

The `-v` flag removes the PostgreSQL volume, including:

- documents
- embeddings
- conversations
- other stored database data

The application will then run migrations and seed the database again.

---

# 🌱 Database Seeding

The project contains a curated collection of AI/ML documentation in:

```text
backend/src/db/docs/
```

The seed process:

```text
Markdown Documents
        ↓
Document Processing
        ↓
Gemini Embedding 2
        ↓
1536-Dimensional Vectors
        ↓
PostgreSQL + pgvector
```

Seeding is designed to be **idempotent**, so already-embedded documents are skipped on subsequent starts.

This prevents unnecessary embedding API calls when containers are restarted.

---

# 🗄️ PostgreSQL + pgvector

This project uses PostgreSQL for application and document storage, with the `pgvector` extension for vector similarity search.

Conceptually, the database stores:

```text
Documents
   │
   ├── Content
   ├── Metadata
   └── Embedding Vector
             │
             ▼
         pgvector
             │
             ▼
    Similarity Search
```

### Why PostgreSQL + pgvector?

Using PostgreSQL allows structured application data and vector data to live in the same database.

That means the application can combine:

- relational data
- document metadata
- conversation history
- vector embeddings

without introducing a separate vector database.

---

# 🔍 Similarity Search

When a user asks a question, the query is converted into an embedding vector.

The vector is compared with stored document embeddings using pgvector similarity search.

The most relevant chunks are then passed to Gemini as retrieval context.

Conceptually:

```text
Query Vector
     │
     ▼
Compare against stored vectors
     │
     ▼
Rank by similarity
     │
     ▼
Top K chunks
     │
     ▼
Gemini context
```

The exact similarity threshold and maximum number of sources can be configured through environment variables, depending on the current backend configuration.

---

# 🔌 API Endpoints

## Health Check

```http
GET /api/health
```

Example:

```bash
curl http://localhost:3001/api/health
```

---

## Database / RAG Statistics

```http
GET /api/chat/stats
```

Example:

```bash
curl http://localhost:3001/api/chat/stats
```

This endpoint can be used to verify:

- document count
- embedding dimension
- database state

---

## Chat

The backend exposes the chat functionality through the `/api/chat` routes.

The frontend uses these endpoints to:

- create conversations
- send messages
- retrieve responses
- preserve conversation history
- display source documents

See:

```text
backend/src/routes/chat.ts
```

for the current API implementation.

---

# 🔐 Security

The application keeps the Gemini API key on the backend.

### Do

```text
GEMINI_API_KEY → backend environment
```

### Do not

```text
GEMINI_API_KEY → React frontend
```

Never:

- hardcode the API key
- commit `.env.docker`
- expose the key through frontend environment variables
- print the key in logs
- upload the key to GitHub

---

# 💰 Gemini API Usage

This project uses the Gemini Developer API.

Gemini model availability, free-tier access, quotas, and rate limits are controlled by Google and can change over time. Check the current [Gemini API pricing documentation](https://ai.google.dev/gemini-api/docs/pricing) for the latest limits and pricing.

For development:

- avoid unnecessary repeated seeding
- avoid unnecessary LLM calls
- keep retries bounded
- reset/reseed only when required
- monitor your Gemini API usage

This project does **not** claim unlimited free API usage.

---

# 🧪 Verifying the Installation

After starting Docker:

```bash
docker compose ps
```

All services should be running.

Then check the backend:

```bash
curl http://localhost:3001/api/health
```

Check RAG/database statistics:

```bash
curl http://localhost:3001/api/chat/stats
```

Finally, open:

```text
http://localhost:3000
```

and ask:

```text
What is machine learning?
```

A successful request should involve:

```text
Gemini Embedding
        ↓
pgvector Retrieval
        ↓
Relevant Documents
        ↓
Gemini Generation
        ↓
Answer + Sources
```

---

# 🐛 Troubleshooting

## Docker containers are not running

Check:

```bash
docker compose ps
```

Then inspect logs:

```bash
docker compose logs -f
```

---

## Backend cannot connect to PostgreSQL

Check:

```bash
docker compose logs postgres
```

and:

```bash
docker compose ps
```

PostgreSQL must be healthy before the backend starts.

---

## Gemini API key error

Verify that `.env.docker` contains:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Do not add quotes around the key.

After editing environment variables, recreate the backend:

```bash
docker compose up -d --force-recreate backend
```

---

## Gemini rate-limit / quota error

You may see an HTTP `429` response when the applicable free-tier quota or rate limit is reached.

Wait for the relevant limit to reset rather than creating repeated retry loops.

Check Google's current limits in AI Studio and the Gemini API documentation.

---

## Embedding dimension error

The current project expects:

```text
1536 dimensions
```

Check:

```env
EMBEDDING_DIMENSION=1536
```

If you change the embedding model or dimension, reset the database and re-embed all documents:

```bash
docker compose down -v
docker compose up -d --build
```

Do not mix embeddings created by different embedding models.

---

## Frontend cannot reach backend

For local Docker development, the frontend should communicate with:

```text
http://localhost:3001
```

Check the frontend configuration and the Docker Compose environment/build arguments.

---

# ☁️ Deploying to Render

The repository includes:

```text
render.yaml
```

for deployment using Render Blueprints.

### Deployment overview

1. Fork this repository to your GitHub account.
2. Open the [Render Dashboard](https://dashboard.render.com/).
3. Create a new Blueprint.
4. Connect your forked repository.
5. Render reads the included `render.yaml`.
6. Configure your `GEMINI_API_KEY`.
7. Deploy the services.

The deployment configuration is designed around:

```text
Render
  │
  ├── Frontend service
  ├── Backend service
  └── PostgreSQL database
         └── pgvector
```

Before deploying, review the current Render pricing and service limitations.

---

# 📚 Additional Documentation

For more detailed information:

| File | Description |
|---|---|
| `QUICKSTART.md` | Step-by-step local Docker setup |
| `backend/README.md` | Backend and API documentation |
| `backend/SETUP.md` | PostgreSQL and pgvector setup |
| `backend/DOCKER.md` | Backend Docker configuration |
| `frontend/README.md` | Frontend documentation |
| `common-ui/README.md` | Shared UI component documentation |

---

# 🧩 NPM Workspaces

This repository uses npm workspaces:

```text
root
├── backend
├── frontend
└── common-ui
```

Available root scripts depend on the current root `package.json`. Typical build commands are:

```bash
npm run build
```

Build the full workspace.

```bash
npm run build:backend
```

Build the backend, if this script is present in the root workspace configuration.

```bash
npm run build:frontend
```

Build the frontend, if this script is present in the root workspace configuration.

```bash
npm run build:common-ui
```

Build the shared UI package, if this script is present in the root workspace configuration.

---

# 🎯 Project Goals

This project demonstrates the main components required to build a practical RAG system:

- document ingestion
- text chunking
- embedding generation
- vector storage
- semantic similarity search
- retrieval
- context construction
- LLM generation
- conversation persistence
- source attribution
- containerized deployment

---

# 🧠 Interview-Level RAG Flow

A simplified request looks like this:

```text
1. User sends a question
        ↓
2. Backend receives the question
        ↓
3. Gemini Embedding 2 creates a query vector
        ↓
4. PostgreSQL + pgvector searches for similar vectors
        ↓
5. Top relevant chunks are retrieved
        ↓
6. Retrieved chunks are added to the LLM context
        ↓
7. Gemini 3.8 Flash generates the answer
        ↓
8. Sources are attached to the response
        ↓
9. Conversation is persisted
        ↓
10. Frontend displays the answer
```

The important idea is that **Gemini generates the answer, but PostgreSQL + pgvector determines which parts of the knowledge base should be provided as context.**

---

# 🔮 Future Improvements

Possible future enhancements include:

- hybrid keyword + vector search
- reranking retrieved chunks
- streaming responses
- document upload UI
- PDF ingestion
- configurable chunk sizes
- authentication
- conversation management
- evaluation metrics for retrieval quality
- observability and tracing
- automated RAG evaluation

---

# 🤝 Contributing

Contributions and improvements are welcome.

For larger changes, open an issue first to discuss the proposed approach.

---

## 📄 License

This project is licensed under the MIT License.
