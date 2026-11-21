@echo off
REM =============================================================================
REM Reset Script - Inventory Manager (Windows)
REM =============================================================================
REM WARNING: This script will DELETE ALL DATA and reset the application!
REM
REM Usage:
REM   reset.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - RESET
echo ==========================================
echo.
echo WARNING: This will DELETE ALL DATA including:
echo   - Database (all users, items, rooms, etc.)
echo   - Uploaded files
echo   - Log files
echo.
echo This action CANNOT be undone!
echo.

set /p CONFIRM="Type 'RESET' to confirm: "

if not "%CONFIRM%"=="RESET" (
    echo.
    echo Reset cancelled.
    exit /b 0
)

echo.
echo Creating final backup before reset...
call "%~dp0backup.bat"
if errorlevel 1 (
    echo.
    echo ERROR: The backup failed, so the reset was CANCELLED. No data was deleted.
    echo Make sure the application is running ^(scripts\windows\start.bat^) and try again.
    exit /b 1
)

echo.
echo Stopping all services and deleting the database volume...
docker-compose down -v >nul 2>&1

echo.
echo Removing local data...
if exist uploads rmdir /s /q uploads 2>nul
if exist logs rmdir /s /q logs 2>nul
mkdir uploads 2>nul
mkdir logs 2>nul

echo.
echo Starting fresh...
docker-compose up -d

echo.
echo Waiting for services to be ready...
timeout /t 5 /nobreak >nul
call "%~dp0wait-for-db.bat"

echo.
echo ==========================================
echo   Reset Complete!
echo ==========================================
echo.
echo The application has been reset to a fresh state.
echo Log in with the default admin account (username: admin).
echo.
echo Note: A backup was saved before reset in .\backups\
