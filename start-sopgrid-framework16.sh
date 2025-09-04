#!/bin/bash
# SOPGRID Auto-Start Script for Framework 16
# All credentials hardcoded for standalone deployment

cd ~/SopGrid

# Export all environment variables with WORKING credentials
export DATABASE_URL="postgresql://neondb_owner:npg_HfnGDKdsO2z6@ep-solitary-sound-afij4cf3.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
export PGPASSWORD="npg_HfnGDKdsO2z6"
export PGUSER="neondb_owner"
export PGDATABASE="neondb"
export PGHOST="ep-solitary-sound-afij4cf3.c-2.us-west-2.aws.neon.tech"
export PGPORT="5432"
export OPENAI_API_KEY="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"
export ANTHROPIC_API_KEY="sk-ant-api03-JQS1uo1sT9D-y5JJGfBN8u0FCqy5HgqVj1PmHgJDxcaKjlYY7rWqOOK3jm10EQiVOJZdaUlvCKGRNhL3oC0F-Q"
export GEMINI_API_KEY="AIzaSyAUSHeXj8oAOOJo-2YBDQxOOY6xpR5fGjA"
export RVPARTFINDER_COMPANY_ID="4917"
export RVPARTFINDER_PIN="2244"
export RVPARTFINDER_USER_ID="PARTS"
export QDRANT_URL="https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333"
export QDRANT_API_KEY="m0yP0yk52H3fUqLcNbjRXLb7gzQOzJQs7TbvJ0wnTCqP4RTCqKe5vQ"
export MONGO_URI="mongodb+srv://lucasreynoldssopgrid:dV5WlNZ8pQPjzYGE@sopgrid.xndbx.mongodb.net/?retryWrites=true&w=majority&appName=sopgrid&tlsAllowInvalidCertificates=true&tlsAllowInvalidHostnames=true&tls=true&tlsCAFile=/home/reynolds-lucas/SopGrid/server/certs/mongodb-latest.pem"

echo "✅ Environment variables loaded"
echo "🗄️ PostgreSQL: $PGHOST"
echo "🔧 Database: $PGDATABASE"
echo "🚀 Starting SOPGRID..."
echo ""

# Start the application
npm run dev