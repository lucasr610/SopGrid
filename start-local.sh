#!/bin/bash

echo "================================================================"
echo "     SOPGRID LOCAL STANDALONE LAUNCHER"
echo "================================================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ Node.js and npm found"

# Use local environment file if it exists
if [ -f ".env.local" ]; then
    echo "📋 Loading local environment from .env.local"
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "⚠️ No .env.local file found. Using default configuration."
fi

# Override Replit-specific environment variables
export DB_MODE=MONGO
export MONGO_URI=${MONGO_URI:-mongodb://localhost:27017/sopgrid}
export QDRANT_URL=${QDRANT_URL:-http://localhost:6333}
export EMBEDDINGS_PROVIDER=${EMBEDDINGS_PROVIDER:-ollama}
export OLLAMA_URL=${OLLAMA_URL:-http://localhost:11434}
export MANUALS_DIR=${MANUALS_DIR:-~/SopGrid/manuals}
export DISABLE_REPLIT_PLUGINS=true
export NODE_ENV=development

echo ""
echo "🔧 Configuration:"
echo "  MongoDB: $MONGO_URI"
echo "  Qdrant: $QDRANT_URL"
echo "  Embeddings: $EMBEDDINGS_PROVIDER"
echo "  Manuals: $MANUALS_DIR"
echo ""

# Check if services are running
echo "🔍 Checking local services..."
if ! curl -s http://localhost:6333/health | grep -q "ok" 2>/dev/null; then
    echo "⚠️ Qdrant not running. Run './init-local-services.sh' first."
fi

if ! nc -z localhost 27017 2>/dev/null; then
    echo "⚠️ MongoDB not running. Run './init-local-services.sh' first."
fi

# Create manuals directory if it doesn't exist
mkdir -p ${MANUALS_DIR/\~/$HOME}
echo "📁 Manuals directory: ${MANUALS_DIR/\~/$HOME}"

echo ""
echo "🚀 Starting SOPGRID..."
echo "================================================================"
echo ""

# Start the application
npm run dev