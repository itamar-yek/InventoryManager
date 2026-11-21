@echo off
REM =============================================================================
REM Start Script - Inventory Manager (Windows)
REM =============================================================================
REM Start all services using Docker Compose.
REM
REM Usage:
REM   start.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Starting Services
echo ==========================================
echo.

docker-compose up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Services started successfully!
    echo.
    echo   Application: http://localhost
    echo   API Docs:    http://localhost/api/docs
) else (
    echo.
    echo Failed to start services. Check Docker is running.
)
