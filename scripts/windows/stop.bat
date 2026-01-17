@echo off
REM =============================================================================
REM Stop Script - Inventory Manager (Windows)
REM =============================================================================
REM Stop all services.
REM
REM Usage:
REM   stop.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Stopping Services
echo ==========================================
echo.

docker-compose down

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Services stopped successfully!
) else (
    echo.
    echo Failed to stop services.
)
