@echo off
REM =============================================================================
REM Rebuild Script - Inventory Manager (Windows)
REM =============================================================================
REM Rebuild and restart services.
REM
REM Usage:
REM   rebuild.bat              - Rebuild all services
REM   rebuild.bat backend      - Rebuild backend only
REM   rebuild.bat frontend     - Rebuild frontend only

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Rebuilding
echo ==========================================
echo.

if "%1"=="" (
    echo Rebuilding all services...
    docker-compose build --no-cache
    docker-compose up -d
) else (
    echo Rebuilding %1...
    docker-compose build --no-cache %1
    docker-compose up -d %1
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Rebuild complete!
) else (
    echo.
    echo Rebuild failed.
)
