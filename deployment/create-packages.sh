#!/bin/bash

echo "================================================================"
echo "        Creating SOPGRID Standalone Packages"
echo "================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create temporary directories for packaging
echo "Creating package directories..."
rm -rf sopgrid-windows sopgrid-linux
mkdir -p sopgrid-windows sopgrid-linux

# Files to exclude from packages
EXCLUDE_PATTERNS=(
    "node_modules"
    ".git"
    ".gitignore"
    "sopgrid-windows"
    "sopgrid-linux"
    "*.tar.gz"
    "*.zip"
    ".env"
    "deployment/sopgrid-windows.zip"
    "deployment/sopgrid-linux.tar.gz"
)

# Create exclude file
echo "Creating exclude list..."
cat > /tmp/exclude-list.txt << EOF
node_modules
.git
.gitignore
sopgrid-windows
sopgrid-linux
*.tar.gz
*.zip
.env
deployment/sopgrid-windows.zip
deployment/sopgrid-linux.tar.gz
EOF

# Copy all files to both directories
echo "Copying files..."
rsync -av --exclude-from=/tmp/exclude-list.txt ../ sopgrid-windows/
rsync -av --exclude-from=/tmp/exclude-list.txt ../ sopgrid-linux/

# Copy setup files
echo "Adding setup scripts..."
cp windows-setup.bat sopgrid-windows/SETUP.bat
cp linux-setup.sh sopgrid-linux/setup.sh
chmod +x sopgrid-linux/setup.sh

# Copy config file to both
cp sopgrid-config.ini sopgrid-windows/
cp sopgrid-config.ini sopgrid-linux/

# Create Windows README
cat > sopgrid-windows/README_WINDOWS.txt << 'EOF'
================================================================
                    SOPGRID Windows Installation
================================================================

QUICK START:
1. Double-click SETUP.bat
2. Follow the prompts
3. SOPGRID will start automatically

REQUIREMENTS:
- Windows 10 or later
- Node.js 18 or later (installer will check)
- 4GB RAM minimum
- 2GB free disk space

MANUAL START:
After setup, you can start SOPGRID by:
- Double-clicking "Start SOPGRID.bat"
- Or using the desktop shortcut

ACCESS:
Open your browser to: http://localhost:5000

TROUBLESHOOTING:
- If port 5000 is busy, edit .env and change PORT value
- Check firewall settings if cannot access
- Run as Administrator if permission errors

================================================================
EOF

# Create Linux README
cat > sopgrid-linux/README_LINUX.txt << 'EOF'
================================================================
                    SOPGRID Linux Installation
================================================================

QUICK START:
1. Open terminal in this directory
2. Run: ./setup.sh
3. Follow the prompts
4. SOPGRID will start automatically

REQUIREMENTS:
- Linux (Ubuntu 20.04+, Debian, Fedora, etc.)
- Node.js 18 or later (installer will check)
- 4GB RAM minimum
- 2GB free disk space

MANUAL START:
After setup, you can start SOPGRID by:
- Running: ./start-sopgrid-launcher.sh
- Or using the desktop launcher (if GUI)
- Or as systemd service (see setup output)

ACCESS:
Open your browser to: http://localhost:5000

TROUBLESHOOTING:
- If port 5000 is busy, edit .env and change PORT value
- Check firewall: sudo ufw allow 5000
- For permission errors: chmod +x setup.sh

================================================================
EOF

# Create Windows package
echo ""
echo -e "${YELLOW}Creating Windows package...${NC}"
cd sopgrid-windows
zip -r ../sopgrid-windows.zip . -x "*.sh" > /dev/null 2>&1
cd ..
echo -e "${GREEN}✓ Created sopgrid-windows.zip ($(du -h sopgrid-windows.zip | cut -f1))${NC}"

# Create Linux package
echo -e "${YELLOW}Creating Linux package...${NC}"
tar -czf sopgrid-linux.tar.gz sopgrid-linux/
echo -e "${GREEN}✓ Created sopgrid-linux.tar.gz ($(du -h sopgrid-linux.tar.gz | cut -f1))${NC}"

# Clean up temporary directories
echo ""
echo "Cleaning up..."
rm -rf sopgrid-windows sopgrid-linux
rm -f /tmp/exclude-list.txt

echo ""
echo "================================================================"
echo -e "${GREEN}           PACKAGES CREATED SUCCESSFULLY!${NC}"
echo "================================================================"
echo ""
echo "📦 Windows Package: deployment/sopgrid-windows.zip"
echo "📦 Linux Package:   deployment/sopgrid-linux.tar.gz"
echo ""
echo "To install:"
echo ""
echo "WINDOWS:"
echo "  1. Extract sopgrid-windows.zip"
echo "  2. Double-click SETUP.bat"
echo ""
echo "LINUX:"
echo "  1. tar -xzf sopgrid-linux.tar.gz"
echo "  2. cd sopgrid-linux"
echo "  3. ./setup.sh"
echo ""
echo "Both packages include:"
echo "  ✓ Complete source code"
echo "  ✓ MongoDB certificates"
echo "  ✓ Pre-configured settings"
echo "  ✓ One-click setup scripts"
echo "  ✓ All API keys configured"
echo ""
echo "================================================================"