@echo off
REM =============================================================================
REM Cleanup Script - Inventory Manager (Windows)
REM =============================================================================
REM Clean up Docker resources and old files.
REM
REM Usage:
REM   cleanup.bat              - Clean Docker resources
REM   cleanup.bat --backups    - Also clean old backups (keeps last 7)
REM   cleanup.bat --all        - Full cleanup including logs

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Cleanup
echo ==========================================
echo.

REM Docker cleanup
echo Cleaning up Docker resources...

echo   Removing dangling images...
docker image prune -f >nul 2>&1

echo   Removing unused networks...
docker network prune -f >nul 2>&1

echo   Cleaning build cache...
docker builder prune -f >nul 2>&1

echo Docker cleanup complete!
echo.

REM Backup cleanup
if "%1"=="--backups" goto CLEANUP_BACKUPS
if "%1"=="--all" goto CLEANUP_BACKUPS
goto SKIP_BACKUPS

:CLEANUP_BACKUPS
echo Cleaning old backups (keeping last 7)...
if exist backups (
    powershell -Command "Get-ChildItem backups\*.zip | Sort-Object LastWriteTime -Descending | Select-Object -Skip 7 | Remove-Item -Force"
    echo Old backups cleaned!
)
echo.

:SKIP_BACKUPS

REM Log cleanup
if "%1"=="--all" goto CLEANUP_LOGS
goto SKIP_LOGS

:CLEANUP_LOGS
echo Cleaning old log files...
if exist logs (
    powershell -Command "Get-ChildItem logs\*.log | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force"
    echo Old logs cleaned!
)
echo.

:SKIP_LOGS

echo Cleanup complete!
