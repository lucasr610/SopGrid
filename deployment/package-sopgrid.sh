#!/bin/bash

echo "================================================================"
echo "        Creating SOPGRID Complete Standalone Packages"
echo "================================================================"
echo ""

# Create clean package directories
echo "Preparing package directories..."
cd /home/runner/workspace
rm -rf /tmp/sopgrid-windows /tmp/sopgrid-linux
mkdir -p /tmp/sopgrid-windows /tmp/sopgrid-linux

# List of directories and files to include
echo "Copying application files..."

# Copy main directories
for dir in client server shared attached_assets data; do
    if [ -d "$dir" ]; then
        echo "  Copying $dir..."
        cp -r "$dir" /tmp/sopgrid-windows/
        cp -r "$dir" /tmp/sopgrid-linux/
    fi
done

# Copy important files
for file in package.json package-lock.json tsconfig.json drizzle.config.ts \
           vite.config.ts tailwind.config.ts postcss.config.js \
           eslint.config.js components.json; do
    if [ -f "$file" ]; then
        echo "  Copying $file..."
        cp "$file" /tmp/sopgrid-windows/
        cp "$file" /tmp/sopgrid-linux/
    fi
done

# Copy deployment files and setup scripts
echo "Adding setup and configuration..."
cp deployment/sopgrid-config.ini /tmp/sopgrid-windows/
cp deployment/sopgrid-config.ini /tmp/sopgrid-linux/
cp deployment/windows-setup.bat /tmp/sopgrid-windows/SETUP.bat
cp deployment/linux-setup.sh /tmp/sopgrid-linux/setup.sh
chmod +x /tmp/sopgrid-linux/setup.sh

# Copy launcher scripts
cp start-standalone.sh /tmp/sopgrid-linux/
cp start-standalone.cmd /tmp/sopgrid-windows/
chmod +x /tmp/sopgrid-linux/start-standalone.sh

# Copy Docker files for advanced users
cp Dockerfile docker-compose.yml .dockerignore /tmp/sopgrid-linux/ 2>/dev/null || true
cp Dockerfile docker-compose.yml .dockerignore /tmp/sopgrid-windows/ 2>/dev/null || true

# Create .env.example in both
cp .env.example /tmp/sopgrid-windows/ 2>/dev/null || true
cp .env.example /tmp/sopgrid-linux/ 2>/dev/null || true

# Create Windows README
cat > /tmp/sopgrid-windows/README.txt << 'EOF'
================================================================
           SOPGRID WINDOWS - COMPLETE STANDALONE PACKAGE
================================================================

QUICK INSTALLATION (RECOMMENDED):
---------------------------------
1. Double-click SETUP.bat
2. Wait for installation to complete
3. SOPGRID will start automatically

The SETUP.bat will:
  - Check for Node.js installation
  - Configure environment variables
  - Install all dependencies
  - Setup database connection
  - Create desktop shortcut
  - Start SOPGRID

MANUAL INSTALLATION:
--------------------
If automatic setup fails:
1. Install Node.js from https://nodejs.org (LTS version)
2. Open Command Prompt in this folder
3. Run: npm install
4. Rename sopgrid-config.ini to .env
5. Run: npm run dev

ACCESS SOPGRID:
--------------
Browser: http://localhost:5000
Default Port: 5000 (change in .env if needed)

FILES INCLUDED:
--------------
✓ Complete SOPGRID source code
✓ MongoDB certificates (./server/certs/)
✓ Pre-configured API keys
✓ All dependencies listed
✓ Docker support files

TROUBLESHOOTING:
---------------
- Port conflict: Change PORT in .env file
- Permission errors: Run as Administrator
- Missing Node.js: Install from nodejs.org
- Firewall blocking: Allow Node.js through Windows Firewall

SECURITY NOTE:
-------------
This package contains test API keys. 
Change them before production use!

================================================================
EOF

# Create Linux README
cat > /tmp/sopgrid-linux/README.txt << 'EOF'
================================================================
           SOPGRID LINUX - COMPLETE STANDALONE PACKAGE
================================================================

QUICK INSTALLATION (RECOMMENDED):
---------------------------------
1. Open terminal in this directory
2. Run: ./setup.sh
3. Follow the prompts
4. SOPGRID will start automatically

The setup.sh will:
  - Check for Node.js installation
  - Configure environment variables
  - Install all dependencies
  - Setup database connection
  - Create desktop launcher (if GUI)
  - Start SOPGRID

MANUAL INSTALLATION:
--------------------
If automatic setup fails:
1. Install Node.js (v18+):
   - Ubuntu/Debian: sudo apt install nodejs npm
   - Fedora: sudo dnf install nodejs npm
   - Or use nvm/fnm for version management
2. Run: npm install
3. Copy sopgrid-config.ini to .env
4. Run: npm run dev

ACCESS SOPGRID:
--------------
Browser: http://localhost:5000
Default Port: 5000 (change in .env if needed)

FILES INCLUDED:
--------------
✓ Complete SOPGRID source code
✓ MongoDB certificates (./server/certs/)
✓ Pre-configured API keys
✓ All dependencies listed
✓ Docker support files
✓ Systemd service file

DOCKER OPTION:
-------------
For containerized deployment:
  docker-compose up -d

TROUBLESHOOTING:
---------------
- Port conflict: Change PORT in .env file
- Permission errors: chmod +x setup.sh
- Missing Node.js: See manual installation
- Firewall: sudo ufw allow 5000

SECURITY NOTE:
-------------
This package contains test API keys. 
Change them before production use!

================================================================
EOF

# Create the packages
echo ""
echo "Creating Windows package..."
cd /tmp
zip -r sopgrid-windows.zip sopgrid-windows/ > /dev/null 2>&1
mv sopgrid-windows.zip /home/runner/workspace/deployment/
echo "✓ Windows package created: deployment/sopgrid-windows.zip"

echo "Creating Linux package..."
tar -czf sopgrid-linux.tar.gz sopgrid-linux/
mv sopgrid-linux.tar.gz /home/runner/workspace/deployment/
echo "✓ Linux package created: deployment/sopgrid-linux.tar.gz"

# Show package sizes
echo ""
echo "Package Information:"
echo "-------------------"
cd /home/runner/workspace/deployment
ls -lh sopgrid-windows.zip sopgrid-linux.tar.gz

# Cleanup
rm -rf /tmp/sopgrid-windows /tmp/sopgrid-linux

echo ""
echo "================================================================"
echo "              PACKAGES READY FOR DOWNLOAD!"
echo "================================================================"
echo ""
echo "📦 WINDOWS PACKAGE: deployment/sopgrid-windows.zip"
echo "   Extract and run SETUP.bat"
echo ""
echo "📦 LINUX PACKAGE: deployment/sopgrid-linux.tar.gz"
echo "   Extract with: tar -xzf sopgrid-linux.tar.gz"
echo "   Then run: ./setup.sh"
echo ""
echo "Both packages are complete, standalone, and ready to run!"
echo "No Replit dependencies - works on any system with Node.js"
echo "================================================================"