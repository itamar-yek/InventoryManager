@echo off
REM =============================================================================
REM Restart Script - Inventory Manager (Windows)
REM =============================================================================
REM Restart all services or a specific service.
REM
REM Usage:
REM   restart.bat              - Restart all services
REM   restart.bat backend      - Restart backend only
REM   restart.bat frontend     - Restart frontend only
REM   restart.bat db           - Restart database only

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Restarting Services
echo ==========================================
echo.

if "%1"=="" (
    echo Restarting all services...
    docker-compose restart
) else (
    echo Restarting %1...
    docker-compose restart %1
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Restart complete!
) else (
    echo.
    echo Restart failed.
)
