@echo off
REM =============================================================================
REM Update Script - Inventory Manager (Windows)
REM =============================================================================
REM Pull latest changes and rebuild services.
REM
REM Usage:
REM   update.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Update
echo ==========================================
echo.

echo Creating backup before update...
call "%~dp0backup.bat"
if errorlevel 1 (
    echo ERROR: Backup failed - update aborted, nothing was changed.
    exit /b 1
)

echo.
echo Pulling latest changes...
git pull

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Git pull failed. Please resolve conflicts manually.
    exit /b 1
)

echo.
echo Rebuilding services...
docker-compose build

echo.
echo Restarting services...
REM Replace containers from older versions (data is kept in Docker volumes).
docker stop -t 60 inventory-frontend inventory-backend inventory-db >nul 2>&1
docker rm inventory-frontend inventory-backend inventory-db >nul 2>&1
docker-compose up -d

echo.
echo Waiting for services...
timeout /t 5 /nobreak >nul
call "%~dp0wait-for-db.bat"

echo.
echo ==========================================
echo   Update Complete!
echo ==========================================
echo.
echo Run health-check.bat to verify all services are running.
