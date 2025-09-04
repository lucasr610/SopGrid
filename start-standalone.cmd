@echo off
REM SOPGRID Standalone Launcher Script for Windows
REM Loads configuration from .env file for security

echo ═══════════════════════════════════════════════════════
echo            SOPGRID Standalone Launcher                 
echo ═══════════════════════════════════════════════════════
echo.

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found!
    
    if exist .env.example (
        echo Creating .env from .env.example...
        copy .env.example .env
        echo Please edit .env file with your actual configuration values!
        echo Run this script again after updating .env
        pause
        exit /b 1
    ) else (
        echo No .env.example file found either!
        pause
        exit /b 1
    )
)

REM Load environment variables from .env file
for /f "tokens=1,2 delims==" %%a in (.env) do (
    REM Skip comments and empty lines
    echo %%a | findstr /r "^#" >nul
    if errorlevel 1 (
        if not "%%b"=="" (
            set %%a=%%b
        )
    )
)

REM Disable Replit-specific plugins
set DISABLE_REPLIT_PLUGINS=true
set REPL_ID=
set REPLIT_DEV_DOMAIN=
set REPLIT_DOMAINS=

REM Validate required environment variables
set "MISSING_VARS="
if "%DATABASE_URL%"=="" set "MISSING_VARS=DATABASE_URL"
if "%OPENAI_API_KEY%"=="" set "MISSING_VARS=%MISSING_VARS% OPENAI_API_KEY"

if not "%MISSING_VARS%"=="" (
    echo Error: Missing required environment variables: %MISSING_VARS%
    echo Please update your .env file with the required values
    pause
    exit /b 1
)

REM Display connection info
echo ✅ Environment Configuration Loaded
echo 🗄️  Database: %PGHOST%
echo 🚀 Port: %PORT%
echo 🔧 Environment: %NODE_ENV%
echo.

REM Check if dependencies are installed
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

REM Start the application
echo Starting SOPGRID...
echo.

REM Run in development or production mode based on NODE_ENV
if "%NODE_ENV%"=="production" (
    REM Build if dist doesn't exist
    if not exist dist (
        echo Building production bundle...
        call npm run build
    )
    call npm run start
) else (
    call npm run dev
)

pause