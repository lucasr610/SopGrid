@echo off
REM ================================================================
REM SOPGRID FRAMEWORK 16 ONE-CLICK LAUNCHER
REM Double-click this file to start SOPGRID - NO TERMINAL NEEDED
REM ================================================================

echo.
echo ==========================================
echo   SOPGRID Framework 16 Launcher
echo   Starting your AI-powered RV service system...
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Navigate to the script directory
cd /d "%~dp0"

REM Check if .env file exists, if not copy from template
if not exist ".env" (
    if exist ".env.template" (
        echo Creating .env file from template...
        copy ".env.template" ".env" >nul
        echo.
        echo IMPORTANT: Please edit the .env file and add your API keys!
        echo The file has been created for you.
        echo.
        pause
    ) else (
        echo ERROR: No .env or .env.template file found!
        echo Please make sure you have your configuration file.
        pause
        exit /b 1
    )
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies... This may take a few minutes.
    echo.
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)

REM Start SOPGRID
echo.
echo ==========================================
echo   SOPGRID is starting...
echo   Your ChatGPT-style interface will open at:
echo   http://localhost:5000
echo ==========================================
echo.

REM Start the application and automatically open browser
start "" "http://localhost:5000"
npm run dev

REM If we get here, the app has stopped
echo.
echo SOPGRID has stopped.
pause