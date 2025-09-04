#!/bin/bash
# SOPGRID Standalone Launcher Script
# Loads configuration from .env file for security

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}           SOPGRID Standalone Launcher                  ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found!${NC}"
    
    if [ -f .env.example ]; then
        echo -e "${YELLOW}Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo -e "${RED}Please edit .env file with your actual configuration values!${NC}"
        echo -e "${RED}Run this script again after updating .env${NC}"
        exit 1
    else
        echo -e "${RED}No .env.example file found either!${NC}"
        exit 1
    fi
fi

# Load environment variables from .env file
set -a
source .env
set +a

# Disable Replit-specific plugins
export DISABLE_REPLIT_PLUGINS=true
unset REPL_ID
unset REPLIT_DEV_DOMAIN
unset REPLIT_DOMAINS

# Validate required environment variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "OPENAI_API_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=($var)
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "${RED}  - $var${NC}"
    done
    echo -e "${YELLOW}Please update your .env file with the required values${NC}"
    exit 1
fi

# Display connection info (partially masked for security)
echo -e "${GREEN}✅ Environment Configuration Loaded${NC}"
echo -e "🗄️  Database: ${PGHOST:-localhost}"
echo -e "🚀 Port: ${PORT:-5000}"
echo -e "🔧 Environment: ${NODE_ENV:-development}"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Start the application
echo -e "${GREEN}Starting SOPGRID...${NC}"
echo ""

# Run in development or production mode based on NODE_ENV
if [ "$NODE_ENV" = "production" ]; then
    # Build if dist doesn't exist
    if [ ! -d "dist" ]; then
        echo -e "${YELLOW}Building production bundle...${NC}"
        npm run build
    fi
    npm run start
else
    npm run dev
fi