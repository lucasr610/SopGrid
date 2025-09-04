@echo off
setlocal EnableDelayedExpansion

echo ================================================================
echo                   SOPGRID Windows Setup Installer
echo                     One-Click Complete Installation
echo ================================================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version and run the installer.
    echo.
    echo After installing Node.js, run this setup again.
    pause
    exit /b 1
)

echo [OK] Node.js is installed: 
node --version
echo.

:: Create .env file from config
echo [STEP 1] Setting up environment configuration...
if exist sopgrid-config.ini (
    copy sopgrid-config.ini .env >nul 2>&1
    echo [OK] Environment configuration created
) else (
    echo [WARNING] sopgrid-config.ini not found, using template
    copy .env.example .env >nul 2>&1
)

:: Install dependencies
echo.
echo [STEP 2] Installing dependencies (this may take a few minutes)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

:: Run database migrations
echo.
echo [STEP 3] Setting up database...
call npm run db:push
if %errorlevel% neq 0 (
    echo [WARNING] Database setup had issues, but continuing...
)

:: Create startup batch file
echo.
echo [STEP 4] Creating startup launcher...
(
echo @echo off
echo cd /d "%CD%"
echo.
echo :: Load environment from .env
echo for /f "tokens=1,2 delims==" %%%%a in ^(.env^) do ^(
echo     echo %%%%a ^| findstr /r "^^#" ^>nul
echo     if errorlevel 1 ^(
echo         if not "%%%%b"=="" set %%%%a=%%%%b
echo     ^)
echo ^)
echo.
echo :: Disable Replit-specific features
echo set DISABLE_REPLIT_PLUGINS=true
echo set REPL_ID=
echo set REPLIT_DEV_DOMAIN=
echo set REPLIT_DOMAINS=
echo.
echo echo ================================================================
echo echo                        SOPGRID SYSTEM
echo echo ================================================================
echo echo.
echo echo Starting SOPGRID on http://localhost:5000
echo echo.
echo.
echo :: Start the application
echo call npm run dev
echo.
echo pause
) > "Start SOPGRID.bat"

echo [OK] Created "Start SOPGRID.bat" launcher
echo.

:: Create desktop shortcut (optional)
echo [STEP 5] Creating desktop shortcut...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\SOPGRID.lnk'); $Shortcut.TargetPath = '%CD%\Start SOPGRID.bat'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.IconLocation = '%SystemRoot%\System32\shell32.dll,13'; $Shortcut.Save()" >nul 2>&1
if %errorlevel% eq 0 (
    echo [OK] Desktop shortcut created
) else (
    echo [INFO] Could not create desktop shortcut, but that's okay
)

echo.
echo ================================================================
echo                    INSTALLATION COMPLETE!
echo ================================================================
echo.
echo SOPGRID has been successfully installed and configured.
echo.
echo To start SOPGRID:
echo   1. Double-click "Start SOPGRID.bat" in this folder
echo   2. Or use the desktop shortcut "SOPGRID"
echo.
echo The application will run at: http://localhost:5000
echo.
echo Press any key to start SOPGRID now...
pause >nul

:: Start the application
call "Start SOPGRID.bat"