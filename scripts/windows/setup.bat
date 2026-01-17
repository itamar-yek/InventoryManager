@echo off
REM =============================================================================
REM Setup Script - Inventory Manager (Windows)
REM =============================================================================
REM First-time setup for the Inventory Manager application.
REM Run this script once after copying the project to a new machine.
REM
REM Usage:
REM   setup.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - First Time Setup
echo ==========================================
echo.

REM Check if Docker is running
echo [1/7] Checking Docker...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    exit /b 1
)
echo       Docker is running.

REM Check Docker Compose
echo [2/7] Checking Docker Compose...
docker-compose version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Docker Compose is not available!
    echo Please ensure Docker Desktop is properly installed.
    exit /b 1
)
echo       Docker Compose is available.

REM Create directories
echo [3/7] Creating directories...
if not exist uploads mkdir uploads
if not exist backups mkdir backups
if not exist logs mkdir logs
echo       Directories created.

REM Check/create .env file
echo [4/7] Checking environment configuration...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo       Created .env from template.
        echo.
        echo *** IMPORTANT: Edit .env file to set secure passwords! ***
        echo.
        echo       Run: notepad .env
        echo.
        set NEEDS_CONFIG=1
    ) else (
        echo       WARNING: No .env.example found. Creating minimal .env...
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
        set NEEDS_CONFIG=1
    )
) else (
    echo       .env file exists.
)

REM Build Docker images
echo [5/7] Building Docker images (this may take several minutes)...
docker-compose build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to build Docker images!
    echo Check the error messages above.
    exit /b 1
)
echo       Images built successfully.

REM Start services
echo [6/7] Starting services...
docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to start services!
    exit /b 1
)
echo       Services started.

REM Wait for database
echo [7/7] Waiting for database to be ready...
call "%~dp0wait-for-db.bat" 60
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: Database may not be ready yet.
    echo Run 'scripts\windows\status.bat' to check.
)

echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo The application is now running:
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.

if defined NEEDS_CONFIG (
    echo *** IMPORTANT ***
    echo Before using in production:
    echo   1. Edit .env file: notepad .env
    echo   2. Change POSTGRES_PASSWORD to a secure password
    echo   3. Change SECRET_KEY to a random string
    echo   4. Restart: scripts\windows\restart.bat
    echo.
)

echo Next steps:
echo   1. Open http://localhost:3000 in your browser
echo   2. Register the first user (becomes admin)
echo   3. Start adding rooms and inventory!
echo.
echo Run 'scripts\windows\health-check.bat' to verify all services.
