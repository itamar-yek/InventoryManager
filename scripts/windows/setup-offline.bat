@echo off
REM =============================================================================
REM Offline Setup Script - Inventory Manager (Windows)
REM =============================================================================
REM Use this script on an OFFLINE machine after importing images.
REM This script does NOT require internet connectivity or Node.js.
REM
REM Prerequisites:
REM   1. Docker Desktop installed and running
REM   2. Images imported via import-images.bat
REM   3. Project folder copied from machine where export-images.bat was run
REM
REM Usage:
REM   setup-offline.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Offline Setup
echo ==========================================
echo.

REM Check if Docker is running
echo [1/5] Checking Docker...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    exit /b 1
)
echo       Docker is running.

REM Verify images are loaded
echo [2/5] Verifying images are loaded...
docker image inspect postgres:15-alpine >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: PostgreSQL image not found!
    echo Please run import-images.bat first.
    exit /b 1
)
docker image inspect inventorymanager-main-backend >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Backend image not found!
    echo Please run import-images.bat first.
    exit /b 1
)
docker image inspect inventorymanager-main-frontend >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Frontend image not found!
    echo Please run import-images.bat first.
    exit /b 1
)
echo       All images verified.

REM Create directories
echo [3/5] Creating directories...
if not exist uploads mkdir uploads
if not exist backups mkdir backups
if not exist logs mkdir logs
echo       Directories created.

REM Check/create .env file
echo [4/5] Checking environment configuration...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo       Created .env from template.
    ) else (
        (
            echo # Database Configuration
            echo POSTGRES_USER=postgres
            echo POSTGRES_PASSWORD=changeme_in_production
            echo POSTGRES_DB=inventory
            echo.
            echo # Security - CHANGE THIS IN PRODUCTION!
            echo SECRET_KEY=change_this_to_a_secure_random_string
            echo.
            echo # Application Settings
            echo DEBUG=false
            echo ACCESS_TOKEN_EXPIRE_MINUTES=30
        ) > .env
    )
) else (
    echo       .env file exists.
)

REM Start services using offline compose (no build needed - uses pre-loaded images)
echo [5/5] Starting services...
docker-compose -f docker-compose.offline.yml up -d
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to start services!
    echo.
    echo If you see build errors, make sure you:
    echo   1. Ran export-images.bat on a machine with internet
    echo   2. Ran import-images.bat on this machine
    exit /b 1
)

REM Wait for services
echo.
echo Waiting for services to be ready...
timeout /t 15 /nobreak >nul

echo.
echo ==========================================
echo   Offline Setup Complete!
echo ==========================================
echo.
echo The application is now running:
echo.
echo   Application: http://localhost
echo   API Docs:    http://localhost/api/docs
echo.
echo Next steps:
echo   1. Open http://localhost in your browser
echo   2. Register the first user (becomes admin)
echo   3. Start adding rooms and inventory!
echo.
echo Useful commands:
echo   docker-compose -f docker-compose.offline.yml logs -f    View logs
echo   docker-compose -f docker-compose.offline.yml down       Stop services
echo   docker-compose -f docker-compose.offline.yml restart    Restart
echo.
