#!/bin/bash
# ================================================================
# SOPGRID FRAMEWORK 16 ONE-CLICK LAUNCHER (Linux/Mac)
# Double-click this file to start SOPGRID - NO TERMINAL NEEDED
# ================================================================

echo ""
echo "=========================================="
echo "  SOPGRID Framework 16 Launcher"
echo "  Starting your AI-powered RV service system..."
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found!"
    echo "Please install Node.js from https://nodejs.org"
    read -p "Press Enter to exit..."
    exit 1
fi

# Navigate to the script directory
cd "$(dirname "$0")"

# Check if .env file exists, if not copy from template
if [ ! -f ".env" ]; then
    if [ -f ".env.template" ]; then
        echo "Creating .env file from template..."
        cp ".env.template" ".env"
        echo ""
        echo "IMPORTANT: Please edit the .env file and add your API keys!"
        echo "The file has been created for you."
        echo ""
        read -p "Press Enter to continue..."
    else
        echo "ERROR: No .env or .env.template file found!"
        echo "Please make sure you have your configuration file."
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies... This may take a few minutes."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies!"
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

# Start SOPGRID
echo ""
echo "=========================================="
echo "  SOPGRID is starting..."
echo "  Your ChatGPT-style interface will open at:"
echo "  http://localhost:5000"
echo "=========================================="
echo ""

# Start the application and automatically open browser
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5000" &
elif command -v open &> /dev/null; then
    open "http://localhost:5000" &
fi

npm run dev

# If we get here, the app has stopped
echo ""
echo "SOPGRID has stopped."
read -p "Press Enter to exit..."