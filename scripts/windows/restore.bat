@echo off
REM =============================================================================
REM Restore Script - Inventory Manager (Windows)
REM =============================================================================
REM Restore from a backup file.
REM
REM Usage:
REM   restore.bat backups\backup_20240115.zip

cd /d "%~dp0..\.."

if "%1"=="" (
    echo Usage: restore.bat ^<backup-file.zip^>
    echo.
    echo Available backups:
    if exist backups dir /b backups\*.zip 2>nul
    exit /b 1
)

if not exist "%1" (
    echo Backup file not found: %1
    exit /b 1
)

echo ==========================================
echo   Inventory Manager - Restoring Backup
echo ==========================================
echo.
echo WARNING: This will overwrite current data!
echo.
set /p CONFIRM="Type 'RESTORE' to confirm: "

if not "%CONFIRM%"=="RESTORE" (
    echo Restore cancelled.
    exit /b 0
)

set TEMP_DIR=restore_temp

echo.
echo Extracting backup...
powershell -Command "Expand-Archive -Path '%1' -DestinationPath '%TEMP_DIR%' -Force"

echo Restoring database...
if exist %TEMP_DIR%\database.sql (
    docker-compose exec -T db psql -U postgres inventory < %TEMP_DIR%\database.sql
)

echo Restoring uploads...
if exist %TEMP_DIR%\uploads (
    xcopy /s /e /q /y %TEMP_DIR%\uploads uploads\ >nul 2>&1
)

REM Cleanup
rmdir /s /q %TEMP_DIR%

echo.
echo Restore complete!
