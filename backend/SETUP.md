# PostgreSQL + pgvector Setup Guide

This guide will help you set up PostgreSQL with the pgvector extension for the RAG chatbot backend.

## Prerequisites

- PostgreSQL 12 or higher
- Node.js 18 or higher

## PostgreSQL Installation

### macOS (using Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Or start manually
pg_ctl -D /usr/local/var/postgresql@15 start
```

### Ubuntu/Debian

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows

Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

## Install pgvector Extension

### macOS (using Homebrew)

```bash
# Install pgvector
brew install pgvector

# Or build from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

### Ubuntu/Debian

```bash
# Install build dependencies
sudo apt install postgresql-server-dev-15 build-essential git

# Clone and build pgvector
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

### Verify Installation

```bash
# Connect to PostgreSQL
psql postgres

# Check if pgvector is available
SELECT * FROM pg_available_extensions WHERE name = 'vector';

# Exit
\q
```

## Database Setup

### 1. Create Database and User

```bash
# Connect to PostgreSQL as superuser
psql postgres

# Run the following SQL commands:
```

```sql
-- Create database
CREATE DATABASE rag_chatbot;

-- Create user (change password!)
CREATE USER rag_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rag_chatbot TO rag_user;

-- Connect to the new database
\c rag_chatbot

-- Grant schema privileges (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO rag_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rag_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rag_user;

-- Exit
\q
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cd rag-chatbot/backend
cp .env.example .env
```

Update the `.env` file with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rag_chatbot
DB_USER=rag_user
DB_PASSWORD=your_secure_password
DB_POOL_MAX=20
```

### 3. Run Database Migrations

```bash
# Install dependencies first
npm install

# Run migrations
npm run db:migrate
```

Expected output:
```
🔄 Starting database migrations...
✅ Database connection established successfully
▶️  Running 001_enable_pgvector...
✅ Completed 001_enable_pgvector
▶️  Running 002_create_documents_table...
✅ Completed 002_create_documents_table
...
🎉 All migrations completed successfully!
```

### 4. (Optional) Seed Sample Data

```bash
npm run db:seed
```

## Database Schema

### Documents Table

Stores text content with vector embeddings for similarity search.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),  -- Adjust dimension based on your model
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `documents_embedding_idx` - IVFFlat index for fast vector similarity search
- `documents_metadata_idx` - GIN index for metadata queries

### Conversations Table

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Testing the Setup

### 1. Start the Server

```bash
npm run dev
```

Expected output:
```
✅ Database connection established successfully
🚀 Server running on port 3001
📝 Environment: development
🔗 API: http://localhost:3001/api
```

### 2. Test Health Endpoint

```bash
curl http://localhost:3001/api/health
```

### 3. Test Vector Database Stats

```bash
curl http://localhost:3001/api/chat/stats
```

Expected response:
```json
{
  "success": true,
  "data": {
    "totalDocuments": 0,
    "embeddingDimension": 1536
  }
}
```

## Troubleshooting

### Error: "relation 'vector' does not exist"

The pgvector extension is not installed. Follow the installation steps above.

### Error: "password authentication failed"

Check your `.env` file and ensure the credentials match your PostgreSQL user.

### Error: "database 'rag_chatbot' does not exist"

Run the database creation SQL commands from step 1.

### Connection timeout

Check if PostgreSQL is running:
```bash
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

## Next Steps

1. **Embedding Model**: Already integrated (Gemini `gemini-embedding-2`, 1536 dimensions)
2. **LLM**: Already integrated (Gemini `gemini-3.8-flash`)
3. **Ingest Documents**: Add your knowledge base documents
4. **Tune Vector Search**: Adjust similarity thresholds and result limits

## Useful Commands

```bash
# Connect to database
psql -U rag_user -d rag_chatbot

# List tables
\dt

# Describe table structure
\d documents

# Count documents
SELECT COUNT(*) FROM documents;

# View sample embeddings
SELECT id, content, metadata FROM documents LIMIT 5;

# Test vector search (requires embeddings)
SELECT content, 1 - (embedding <=> '[0.1,0.2,...]'::vector) as similarity
FROM documents
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[0.1,0.2,...]'::vector
LIMIT 5;
```