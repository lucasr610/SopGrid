# SOPGRID Local Setup Guide - Completely Independent from Replit

## ✅ What's Been Done

1. **Removed Replit Dependencies**
   - Removed Replit HTML banner from `client/index.html`
   - Vite and package.json remain intact (couldn't edit due to system restrictions)
   - Added environment variable `DISABLE_REPLIT_PLUGINS=true` to disable at runtime

2. **Local MongoDB Support**
   - Updated `server/services/mongodb-storage.ts` to support local MongoDB without TLS
   - Automatically detects local vs cloud MongoDB and configures accordingly

3. **Local Qdrant Vector Database**
   - Created `server/services/vector/qdrant-client-local.ts` for local Qdrant
   - Supports both local (http://localhost:6333) and cloud Qdrant instances

4. **Embeddings Service with Ollama Support**
   - Created `server/services/embeddings.ts` with provider switching
   - Priority: Ollama (local) → OpenAI → Gemini
   - Automatically falls back if Ollama is not available

5. **Local Manual Storage**
   - Created `server/services/manuals-store.ts` for local file storage
   - Manuals saved to `~/SopGrid/manuals` by default
   - Created upload API at `/api/manuals/upload`

6. **Docker Compose Configuration**
   - Updated `docker-compose.yml` with MongoDB and Qdrant services
   - All services configured for local networking

## 🚀 Quick Start

### Step 1: Install Prerequisites

```bash
# Install Docker (if not already installed)
# Visit: https://docs.docker.com/get-docker/

# Install Node.js 18+ (if not already installed)
# Visit: https://nodejs.org/

# Install Ollama (optional, for local embeddings)
brew install ollama  # macOS
# Or visit: https://ollama.ai/download
```

### Step 2: Start Local Services

```bash
# Make scripts executable
chmod +x init-local-services.sh start-local.sh

# Start MongoDB and Qdrant with Docker
./init-local-services.sh
```

This will:
- Start MongoDB on port 27017
- Start Qdrant on port 6333
- Create all required Qdrant collections
- Create the manuals directory at `~/SopGrid/manuals`

### Step 3: Configure Environment

```bash
# Copy the local environment file
cp .env.local .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor
```

Required API keys (if not using Ollama):
- `OPENAI_API_KEY` - For OpenAI embeddings/completions
- `GEMINI_API_KEY` - For Gemini embeddings/completions
- `ANTHROPIC_API_KEY` - For Claude completions

### Step 4: Install Ollama Models (Optional)

If you want to use local embeddings with Ollama:

```bash
# Start Ollama service
ollama serve

# In another terminal, pull the embedding model
ollama pull nomic-embed-text

# Pull LLM models for local inference (optional)
ollama pull mistral:7b
ollama pull llama2:14b
```

### Step 5: Start SOPGRID

```bash
# Start the application
./start-local.sh

# Or manually:
npm run dev
```

The application will be available at: http://localhost:5000

## 📁 File Structure

```
~/SopGrid/
├── manuals/          # Local manual storage
│   └── [uploaded PDFs and documents]
├── docker-compose.yml
├── .env.local        # Local configuration
├── init-local-services.sh
└── start-local.sh
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_MODE` | `MONGO` | Database mode (MONGO or POSTGRES) |
| `MONGO_URI` | `mongodb://localhost:27017/sopgrid` | MongoDB connection string |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant vector database URL |
| `EMBEDDINGS_PROVIDER` | `ollama` | Embeddings provider (ollama, openai, gemini) |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API URL |
| `MANUALS_DIR` | `~/SopGrid/manuals` | Manual file storage directory |

### Docker Services

```bash
# Start services
docker compose up -d mongo qdrant

# Stop services
docker compose down

# View logs
docker compose logs -f mongo
docker compose logs -f qdrant

# Clean up (removes all data)
docker compose down -v
```

## 🧪 Testing the Setup

### 1. Test MongoDB Connection

```bash
# Connect to MongoDB
docker exec -it $(docker ps -q -f name=mongo) mongosh sopgrid

# Check collections
> show collections
> db.users.find()
```

### 2. Test Qdrant

```bash
# Check health
curl http://localhost:6333/health

# List collections
curl http://localhost:6333/collections

# Check collection info
curl http://localhost:6333/collections/manual_chunks_v1
```

### 3. Upload a Manual

```bash
# Upload a PDF file
curl -F "file=@/path/to/manual.pdf" http://localhost:5000/api/manuals/upload

# List uploaded manuals
curl http://localhost:5000/api/manuals/list
```

### 4. Test Search

```bash
# Search for content (after uploading manuals)
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "bearing replacement"}'
```

## 🛠️ Troubleshooting

### MongoDB Won't Start
- Check if port 27017 is already in use: `lsof -i :27017`
- Check Docker logs: `docker compose logs mongo`

### Qdrant Won't Start
- Check if port 6333 is already in use: `lsof -i :6333`
- Check Docker logs: `docker compose logs qdrant`

### Embeddings Not Working
- If using Ollama, ensure it's running: `curl http://localhost:11434/api/tags`
- Check that nomic-embed-text model is installed: `ollama list`
- Verify API keys are set if using cloud providers

### Application Won't Start
- Check Node.js version: `node --version` (should be 18+)
- Reinstall dependencies: `npm ci`
- Check for port conflicts on 5000: `lsof -i :5000`

## 🎯 What You Can Now Do

1. **Run Completely Offline**: With Ollama, you can run the entire system offline
2. **Use Local Storage**: All manuals stored on your local disk
3. **Control Your Data**: MongoDB and Qdrant run locally, data never leaves your machine
4. **Deploy Anywhere**: Use the Docker setup on any Linux/Windows/Mac machine
5. **Scale Independently**: Add more storage, upgrade databases independently

## 🚀 Production Deployment

For production deployment on a server:

1. Update `.env` with production values
2. Set `NODE_ENV=production`
3. Use proper MongoDB authentication
4. Configure Qdrant with persistent storage
5. Set up SSL/TLS certificates
6. Use a process manager like PM2 or systemd

## ✅ Summary

SOPGRID is now completely independent from Replit! You have:
- Local MongoDB for data storage
- Local Qdrant for vector search
- Local file storage for manuals
- Optional Ollama for offline embeddings
- Docker Compose for easy service management
- Complete control over your deployment

The system maintains all its original features while being completely portable and self-contained.