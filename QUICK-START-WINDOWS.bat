@echo off
echo ================================================================
echo           SOPGRID COMPLETE SYSTEM - WINDOWS
echo ================================================================
echo.
echo This package includes EVERYTHING:
echo   - All source code
echo   - All 700MB+ of dependencies (pre-installed)
echo   - All MongoDB certificates
echo   - All API keys configured
echo.
echo EXTRACTING AND RUNNING...
echo.

:: Create environment file
echo Creating configuration...
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
echo # RV Part Finder
echo RVPARTFINDER_COMPANY_ID=4917
echo RVPARTFINDER_PIN=2244
echo RVPARTFINDER_USER_ID=PARTS
echo.
echo # Qdrant
echo QDRANT_URL=https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333
echo QDRANT_API_KEY=m0yP0yk52H3fUqLcNbjRXLb7gzQOzJQs7TbvJ0wnTCqP4RTCqKe5vQ
echo.
echo # MongoDB
echo MONGO_URI=mongodb+srv://lucasreynoldssopgrid:dV5WlNZ8pQPjzYGE@sopgrid.xndbx.mongodb.net/?retryWrites=true^&w=majority^&appName=sopgrid^&tlsAllowInvalidCertificates=true^&tlsAllowInvalidHostnames=true^&tls=true^&tlsCAFile=./server/certs/mongodb-latest.pem
echo MONGODB_URI=mongodb+srv://lucasreynoldssopgrid:dV5WlNZ8pQPjzYGE@sopgrid.xndbx.mongodb.net/?retryWrites=true^&w=majority^&appName=sopgrid^&tlsAllowInvalidCertificates=true^&tlsAllowInvalidHostnames=true^&tls=true^&tlsCAFile=./server/certs/mongodb-latest.pem
echo.
echo # Server
echo PORT=5000
echo NODE_ENV=development
echo SESSION_SECRET=sopgrid-secure-session-secret-2024-testing-only
echo DISABLE_REPLIT_PLUGINS=true
echo OS_AGENT_ENABLED=true
) > .env

echo.
echo ================================================================
echo SOPGRID is starting at http://localhost:5000
echo ================================================================
echo.

:: Start the application
npm run dev

pause