@echo off
setlocal
REM =============================================================================
REM Update an OFFLINE installation - Inventory Manager (Windows)
REM =============================================================================
REM Use this to install a new version on the offline machine WITHOUT losing data.
REM
REM Steps:
REM   1. On the internet machine: get the new code and run export-images.bat
REM   2. Copy the new project folder to the offline machine. Keep your existing
REM      .env and backups\ folder (copy them into the new folder).
REM   3. Run this script from the new folder.
REM
REM What it does:
REM   - Backs up the database (aborts if the backup fails)
REM   - Loads the new images
REM   - Restarts the application; the backend upgrades the database schema
REM     automatically (with another backup right before the change)

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Offline Update
echo ==========================================
echo.

if not exist .env (
    echo ERROR: .env not found in this folder.
    echo Copy the .env file from your current installation into:
    echo   %CD%
    echo It contains the database password - without it the app cannot open your data.
    exit /b 1
)

docker inspect -f "{{.State.Running}}" inventory-db 2>nul | findstr /i "true" >nul
if errorlevel 1 (
    echo The database is not running - starting it to take a backup...
    docker start inventory-db >nul 2>&1
    timeout /t 10 /nobreak >nul
)

echo [1/3] Backing up the database...
call "%~dp0backup.bat"
if errorlevel 1 (
    echo ERROR: Backup failed - update aborted, nothing was changed.
    exit /b 1
)

echo.
echo [2/3] Loading new images...
call "%~dp0import-images.bat"
if errorlevel 1 (
    echo ERROR: Loading images failed - update aborted. The running version was not changed.
    exit /b 1
)

echo.
echo [3/3] Restarting with the new version...
call "%~dp0setup-offline.bat"
exit /b %ERRORLEVEL%
