@echo off
REM ================================================================
REM SOPGRID FRAMEWORK 16 LAUNCHER
REM Right-click and select "Run in Terminal" or double-click
REM ================================================================

title SOPGRID Framework 16 Launcher

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
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo Node.js found. Checking project setup...

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
        echo Press any key to continue after you've added your API keys...
        pause >nul
    ) else (
        echo ERROR: No .env or .env.template file found!
        echo Please make sure you have your configuration file.
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies... This may take a few minutes.
    echo Please wait...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to install dependencies!
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
)

REM Start SOPGRID
echo.
echo ==========================================
echo   SOPGRID is starting...
echo   Your ChatGPT-style interface will open at:
echo   http://localhost:5000
echo ==========================================
echo.
echo Starting in 3 seconds...
timeout /t 3 /nobreak >nul

REM Start the application and automatically open browser
start "" "http://localhost:5000"
call npm run dev

REM If we get here, the app has stopped
echo.
echo ==========================================
echo   SOPGRID has stopped.
echo ==========================================
echo.
echo Press any key to exit...
pause >nul