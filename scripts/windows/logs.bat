@echo off
REM =============================================================================
REM Logs Script - Inventory Manager (Windows)
REM =============================================================================
REM View logs from services.
REM
REM Usage:
REM   logs.bat              - Show all logs (last 100 lines, follow)
REM   logs.bat backend      - Show backend logs only
REM   logs.bat frontend     - Show frontend logs only
REM   logs.bat db           - Show database logs only

cd /d "%~dp0..\.."

if "%1"=="" (
    echo Showing all logs (Ctrl+C to exit)...
    docker-compose logs -f --tail=100
) else (
    echo Showing %1 logs (Ctrl+C to exit)...
    docker-compose logs -f --tail=100 %1
)
