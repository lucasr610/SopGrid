#!/bin/bash

echo "================================================================"
echo "     Creating COMPLETE SOPGRID Package with ALL Dependencies"
echo "================================================================"
echo ""

# Check current directory
WORKSPACE="/home/runner/workspace"
cd "$WORKSPACE"

echo "Package will include:"
echo "  - All source code"
echo "  - Complete node_modules (707MB+)"
echo "  - All certificates"
echo "  - Ready-to-run configuration"
echo ""

# Create deployment directory if it doesn't exist
mkdir -p deployment

# Windows Package
echo "Creating COMPLETE Windows package..."
echo "This will take a few minutes due to the size..."

# Create a script that will generate the .env on Windows
cat > setup-env.bat << 'ENVBAT'
@echo off
echo Creating .env configuration file...
(
echo # Database Configuration
echo DATABASE_URL=postgresql://neondb_owner:npg_HfnGDKdsO2z6@ep-solitary-sound-afij4cf3.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
echo PGPASSWORD=npg_HfnGDKdsO2z6
echo PGUSER=neondb_owner
echo PGDATABASE=neondb
echo PGHOST=ep-solitary-sound-afij4cf3.c-2.us-west-2.aws.neon.tech
echo PGPORT=5432
echo.
echo # API Keys
echo OPENAI_API_KEY=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
echo ANTHROPIC_API_KEY=sk-ant-api03-JQS1uo1sT9D-y5JJGfBN8u0FCqy5HgqVj1PmHgJDxcaKjlYY7rWqOOK3jm10EQiVOJZdaUlvCKGRNhL3oC0F-Q
echo GEMINI_API_KEY=AIzaSyAUSHeXj8oAOOJo-2YBDQxOOY6xpR5fGjA
echo.
echo # RV Part Finder API
echo RVPARTFINDER_COMPANY_ID=4917
echo RVPARTFINDER_PIN=2244
echo RVPARTFINDER_USER_ID=PARTS
echo.
echo # Vector Database
echo QDRANT_URL=https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333
echo QDRANT_API_KEY=m0yP0yk52H3fUqLcNbjRXLb7gzQOzJQs7TbvJ0wnTCqP4RTCqKe5vQ
echo.
echo # MongoDB
echo MONGO_URI=mongodb+srv://lucasreynoldssopgrid:dV5WlNZ8pQPjzYGE@sopgrid.xndbx.mongodb.net/?retryWrites=true^&w=majority^&appName=sopgrid^&tlsAllowInvalidCertificates=true^&tlsAllowInvalidHostnames=true^&tls=true^&tlsCAFile=./server/certs/mongodb-latest.pem
echo MONGODB_URI=mongodb+srv://lucasreynoldssopgrid:dV5WlNZ8pQPjzYGE@sopgrid.xndbx.mongodb.net/?retryWrites=true^&w=majority^&appName=sopgrid^&tlsAllowInvalidCertificates=true^&tlsAllowInvalidHostnames=true^&tls=true^&tlsCAFile=./server/certs/mongodb-latest.pem
echo.
echo # Server Configuration
echo PORT=5000
echo NODE_ENV=development
echo SESSION_SECRET=sopgrid-secure-session-secret-2024-testing-only
echo DISABLE_REPLIT_PLUGINS=true
echo OS_AGENT_ENABLED=true
) > .env
echo .env file created successfully!
ENVBAT

# Create Linux env setup script
cat > setup-env.sh << 'ENVSH'
#!/bin/bash
echo "Creating .env configuration file..."
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://neondb_owner:npg_HfnGDKdsO2z6@ep-solitary-sound-afij4cf3.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
PGPASSWORD=npg_HfnGDKdsO2z6
PGUSER=neondb_owner
PGDATABASE=neondb
PGHOST=ep-solitary-sound-afij4cf3.c-2.us-west-2.aws.neon.tech
PGPORT=5432

# API Keys
OPENAI_API_KEY=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
ANTHROPIC_API_KEY=sk-ant-api03-JQS1uo1sT9D-y5JJGfBN8u0FCqy5HgqVj1PmHgJDxcaKjlYY7rWqOOK3jm10EQiVOJZdaUlvCKGRNhL3oC0F-Q
GEMINI_API_KEY=AIzaSyAUSHeXj8oAOOJo-2YBDQxOOY6xpR5fGjA

# RV Part Finder API
RVPARTFINDER_COMPANY_ID=4917
RVPARTFINDER_PIN=2244
RVPARTFINDER_USER_ID=PARTS

# Vector Database
QDRANT_URL=https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=m0yP0yk52H3fUqLcNbjRXLb7gzQOzJQs7TbvJ0wnTCqP4RTCqKe5vQ

# MongoDB
MONGO_URI=mongodb+srv://lucasreynoldssopgrid:dV5WlNZ8pQPjzYGE@sopgrid.xndbx.mongodb.net/?retryWrites=true&w=majority&appName=sopgrid&tlsAllowInvalidCertificates=true&tlsAllowInvalidHostnames=true&tls=true&tlsCAFile=./server/certs/mongodb-latest.pem
MONGODB_URI=mongodb+srv://lucasreynoldssopgrid:dV5WlNZ8pQPjzYGE@sopgrid.xndbx.mongodb.net/?retryWrites=true&w=majority&appName=sopgrid&tlsAllowInvalidCertificates=true&tlsAllowInvalidHostnames=true&tls=true&tlsCAFile=./server/certs/mongodb-latest.pem

# Server Configuration
PORT=5000
NODE_ENV=development
SESSION_SECRET=sopgrid-secure-session-secret-2024-testing-only
DISABLE_REPLIT_PLUGINS=true
OS_AGENT_ENABLED=true
EOF
echo ".env file created successfully!"
chmod 600 .env
ENVSH
chmod +x setup-env.sh

# Create simple Windows launcher
cat > RUN-SOPGRID-WINDOWS.bat << 'WINRUN'
@echo off
echo ================================================================
echo                      STARTING SOPGRID
echo ================================================================
echo.

if not exist .env (
    echo First time setup - creating configuration...
    call setup-env.bat
    echo.
)

echo Starting SOPGRID on http://localhost:5000
echo Press Ctrl+C to stop
echo.

npm run dev
pause
WINRUN

# Create simple Linux launcher
cat > run-sopgrid-linux.sh << 'LINRUN'
#!/bin/bash
echo "================================================================"
echo "                      STARTING SOPGRID"
echo "================================================================"
echo ""

if [ ! -f .env ]; then
    echo "First time setup - creating configuration..."
    ./setup-env.sh
    echo ""
fi

echo "Starting SOPGRID on http://localhost:5000"
echo "Press Ctrl+C to stop"
echo ""

npm run dev
LINRUN
chmod +x run-sopgrid-linux.sh

# Now create the actual archives with EVERYTHING
echo ""
echo "Creating Windows archive (this will be large ~1GB+)..."

# Exclude only what's absolutely not needed
tar --exclude='.git' \
    --exclude='sopgrid-complete-*' \
    --exclude='deployment/*.tar.gz' \
    --exclude='deployment/*.zip' \
    -czf deployment/sopgrid-complete-windows.tar.gz \
    client/ server/ shared/ attached_assets/ data/ node_modules/ \
    package.json package-lock.json tsconfig.json drizzle.config.ts \
    vite.config.ts tailwind.config.ts postcss.config.js \
    eslint.config.js components.json \
    setup-env.bat RUN-SOPGRID-WINDOWS.bat \
    Dockerfile docker-compose.yml .dockerignore \
    start-standalone.cmd start-standalone.sh \
    .env.example 2>/dev/null

echo ""
echo "Creating Linux archive..."

tar --exclude='.git' \
    --exclude='sopgrid-complete-*' \
    --exclude='deployment/*.tar.gz' \
    --exclude='deployment/*.zip' \
    -czf deployment/sopgrid-complete-linux.tar.gz \
    client/ server/ shared/ attached_assets/ data/ node_modules/ \
    package.json package-lock.json tsconfig.json drizzle.config.ts \
    vite.config.ts tailwind.config.ts postcss.config.js \
    eslint.config.js components.json \
    setup-env.sh run-sopgrid-linux.sh \
    Dockerfile docker-compose.yml .dockerignore \
    start-standalone.sh sopgrid.service \
    .env.example 2>/dev/null

# Clean up temporary files
rm -f setup-env.bat setup-env.sh RUN-SOPGRID-WINDOWS.bat run-sopgrid-linux.sh

# Show the final sizes
echo ""
echo "================================================================"
echo "         COMPLETE PACKAGES CREATED SUCCESSFULLY!"
echo "================================================================"
echo ""
ls -lh deployment/sopgrid-complete-*.tar.gz
echo ""
echo "These packages include:"
echo "  ✓ ALL source code"
echo "  ✓ ALL node_modules (707MB+ of dependencies)"
echo "  ✓ MongoDB certificates"
echo "  ✓ Environment setup scripts"
echo "  ✓ Ready-to-run launchers"
echo ""
echo "TO USE:"
echo ""
echo "WINDOWS:"
echo "  1. Extract: tar -xzf sopgrid-complete-windows.tar.gz"
echo "  2. Run: RUN-SOPGRID-WINDOWS.bat"
echo ""
echo "LINUX:"
echo "  1. Extract: tar -xzf sopgrid-complete-linux.tar.gz"
echo "  2. Run: ./run-sopgrid-linux.sh"
echo ""
echo "NO INSTALLATION NEEDED - Everything is already included!"
echo "================================================================"