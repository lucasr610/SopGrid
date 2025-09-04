#!/bin/bash
set -e

echo "================================================================"
echo "                   SOPGRID Linux Setup Installer"
echo "                     One-Click Complete Installation"
echo "================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed!${NC}"
    echo ""
    echo "Please install Node.js using one of these methods:"
    echo "  1. Using NodeSource (recommended):"
    echo "     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "     sudo apt-get install -y nodejs"
    echo ""
    echo "  2. Using snap:"
    echo "     sudo snap install node --classic"
    echo ""
    echo "  3. Using nvm:"
    echo "     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "     nvm install 20"
    echo ""
    echo "After installing Node.js, run this setup again."
    exit 1
fi

echo -e "${GREEN}[OK] Node.js is installed:${NC} $(node --version)"
echo ""

# Create .env file from config
echo "[STEP 1] Setting up environment configuration..."
if [ -f "sopgrid-config.ini" ]; then
    cp sopgrid-config.ini .env
    echo -e "${GREEN}[OK] Environment configuration created${NC}"
else
    echo -e "${YELLOW}[WARNING] sopgrid-config.ini not found, using template${NC}"
    cp .env.example .env 2>/dev/null || true
fi

# Install dependencies
echo ""
echo "[STEP 2] Installing dependencies (this may take a few minutes)..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK] Dependencies installed${NC}"
else
    echo -e "${RED}[ERROR] Failed to install dependencies${NC}"
    exit 1
fi

# Run database migrations
echo ""
echo "[STEP 3] Setting up database..."
npm run db:push || {
    echo -e "${YELLOW}[WARNING] Database setup had issues, but continuing...${NC}"
}

# Create startup script
echo ""
echo "[STEP 4] Creating startup launcher..."
cat > "start-sopgrid-launcher.sh" << 'EOF'
#!/bin/bash

# Change to script directory
cd "$(dirname "$0")"

# Load environment from .env
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Disable Replit-specific features
export DISABLE_REPLIT_PLUGINS=true
unset REPL_ID
unset REPLIT_DEV_DOMAIN
unset REPLIT_DOMAINS

echo "================================================================"
echo "                        SOPGRID SYSTEM"
echo "================================================================"
echo ""
echo "Starting SOPGRID on http://localhost:5000"
echo ""

# Start the application
npm run dev
EOF

chmod +x start-sopgrid-launcher.sh
echo -e "${GREEN}[OK] Created start-sopgrid-launcher.sh${NC}"

# Create desktop entry for GUI environments
echo ""
echo "[STEP 5] Creating desktop launcher..."
DESKTOP_FILE="$HOME/.local/share/applications/sopgrid.desktop"
mkdir -p "$HOME/.local/share/applications"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=SOPGRID
Comment=Cognitive OS for RV Technicians
Exec=$(pwd)/start-sopgrid-launcher.sh
Path=$(pwd)
Icon=utilities-terminal
Terminal=true
Categories=Development;
EOF

if [ -f "$DESKTOP_FILE" ]; then
    chmod +x "$DESKTOP_FILE"
    echo -e "${GREEN}[OK] Desktop launcher created${NC}"
else
    echo -e "${YELLOW}[INFO] Could not create desktop launcher, but that's okay${NC}"
fi

# Create systemd service (optional)
echo ""
echo "[STEP 6] Creating systemd service (optional)..."
SERVICE_FILE="sopgrid-user.service"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=SOPGRID User Service
After=network.target

[Service]
Type=simple
WorkingDirectory=$(pwd)
ExecStart=$(which npm) run dev
Restart=always
RestartSec=10
Environment="PATH=/usr/bin:/usr/local/bin"
EnvironmentFile=$(pwd)/.env

[Install]
WantedBy=default.target
EOF

echo -e "${GREEN}[OK] Created sopgrid-user.service${NC}"
echo "To install as a user service, run:"
echo "  systemctl --user enable $(pwd)/$SERVICE_FILE"
echo "  systemctl --user start sopgrid-user"

echo ""
echo "================================================================"
echo "                    INSTALLATION COMPLETE!"
echo "================================================================"
echo ""
echo -e "${GREEN}SOPGRID has been successfully installed and configured.${NC}"
echo ""
echo "To start SOPGRID:"
echo "  1. Run: ./start-sopgrid-launcher.sh"
echo "  2. Or use the desktop launcher (if GUI available)"
echo "  3. Or install as a systemd service (see above)"
echo ""
echo "The application will run at: http://localhost:5000"
echo ""
echo -n "Press Enter to start SOPGRID now..."
read

# Start the application
./start-sopgrid-launcher.sh