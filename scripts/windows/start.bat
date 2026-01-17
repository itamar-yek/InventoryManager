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
    echo   Frontend: http://localhost:3000
    echo   Backend:  http://localhost:8000
    echo   API Docs: http://localhost:8000/docs
) else (
    echo.
    echo Failed to start services. Check Docker is running.
)
