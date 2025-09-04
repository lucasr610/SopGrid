#!/bin/bash

echo "================================================================"
echo "     SOPGRID LOCAL SERVICES INITIALIZATION"
echo "================================================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose found"
echo ""

# Start MongoDB and Qdrant services
echo "🚀 Starting local services (MongoDB & Qdrant)..."
docker compose up -d mongo qdrant

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check MongoDB
echo -n "🍃 Checking MongoDB... "
if docker exec $(docker ps -q -f name=mongo) mongosh --eval "db.version()" &> /dev/null; then
    echo "✅ MongoDB is running"
else
    echo "❌ MongoDB failed to start"
    exit 1
fi

# Check Qdrant
echo -n "🔍 Checking Qdrant... "
if curl -s http://localhost:6333/health | grep -q "ok"; then
    echo "✅ Qdrant is running"
else
    echo "❌ Qdrant failed to start"
    exit 1
fi

echo ""
echo "📦 Initializing Qdrant collections..."

# Initialize Qdrant collections
curl -s -X PUT "http://localhost:6333/collections/manual_chunks_v1" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": { "size": 768, "distance": "Cosine" },
    "optimizers_config": { "default_segment_number": 2 }
  }' > /dev/null 2>&1

curl -s -X PUT "http://localhost:6333/collections/document_memory" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": { "size": 768, "distance": "Cosine" },
    "optimizers_config": { "default_segment_number": 2 }
  }' > /dev/null 2>&1

curl -s -X PUT "http://localhost:6333/collections/sop_memory" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": { "size": 768, "distance": "Cosine" },
    "optimizers_config": { "default_segment_number": 2 }
  }' > /dev/null 2>&1

curl -s -X PUT "http://localhost:6333/collections/agent_memory" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": { "size": 768, "distance": "Cosine" },
    "optimizers_config": { "default_segment_number": 2 }
  }' > /dev/null 2>&1

echo "✅ Qdrant collections initialized"

# Create manuals directory
echo "📁 Creating manuals directory..."
mkdir -p ~/SopGrid/manuals
echo "✅ Manuals directory created at: ~/SopGrid/manuals"

echo ""
echo "================================================================"
echo "     LOCAL SERVICES READY!"
echo "================================================================"
echo ""
echo "Services running:"
echo "  🍃 MongoDB: mongodb://localhost:27017/sopgrid"
echo "  🔍 Qdrant: http://localhost:6333"
echo "  📁 Manuals: ~/SopGrid/manuals"
echo ""
echo "To start SOPGRID:"
echo "  npm run dev"
echo ""
echo "To stop services:"
echo "  docker compose down"
echo ""
echo "================================================================"