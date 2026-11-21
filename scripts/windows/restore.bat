@echo off
setlocal
REM =============================================================================
REM Restore Script - Inventory Manager (Windows)
REM =============================================================================
REM Replaces the current database with the contents of a backup.
REM
REM Supported backup files:
REM   backups\inventory_*.dump        (made by backup.bat)
REM   backups\pre-migration_*.dump    (made automatically before schema upgrades)
REM   backups\backup_*.zip            (made by the OLD backup.bat - contains database.sql)
REM   *.sql                           (plain SQL dump)
REM
REM Safety:
REM   - A backup of the CURRENT data is made first (restore aborts if it fails).
REM   - The restore runs in a single transaction: if anything fails, the
REM     database is left exactly as it was.
REM   - After restoring an older backup, the backend automatically upgrades
REM     its schema on start (with its own pre-migration backup).
REM
REM Usage:
REM   restore.bat backups\inventory_20260101_120000.dump

cd /d "%~dp0..\.."

if "%~1"=="" (
    echo Usage: restore.bat ^<backup-file^>
    echo.
    echo Available backups:
    if exist backups dir /b /o-d backups\*.dump backups\*.zip 2>nul
    exit /b 1
)

set "SRC=%~f1"
set "EXT=%~x1"
if not exist "%SRC%" (
    echo Backup file not found: %1
    exit /b 1
)

docker inspect -f "{{.State.Running}}" inventory-db 2>nul | findstr /i "true" >nul
if errorlevel 1 (
    echo ERROR: The database container "inventory-db" is not running.
    echo Start the application first: scripts\windows\start.bat
    exit /b 1
)

echo ==========================================
echo   Inventory Manager - Restoring Backup
echo ==========================================
echo.
echo Backup to restore: %SRC%
echo.
echo WARNING: All CURRENT data will be replaced by the contents of this backup.
echo (A backup of the current data is made first.)
echo.
set /p CONFIRM="Type RESTORE to confirm: "
if not "%CONFIRM%"=="RESTORE" (
    echo Restore cancelled.
    exit /b 0
)

echo.
echo [1/4] Backing up current data first...
call "%~dp0backup.bat"
if errorlevel 1 (
    echo ERROR: Could not back up the current data. Restore aborted - nothing changed.
    exit /b 1
)

set "TMPDIR=restore_temp"
if /i "%EXT%"==".zip" (
    if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%"
    powershell -NoProfile -Command "Expand-Archive -Path '%SRC%' -DestinationPath '%TMPDIR%' -Force"
    if not exist "%TMPDIR%\database.sql" (
        echo ERROR: database.sql not found inside the zip file.
        rmdir /s /q "%TMPDIR%"
        exit /b 1
    )
    set "SRC=%CD%\%TMPDIR%\database.sql"
    set "EXT=.sql"
)

echo [2/4] Stopping the application (database stays running)...
docker stop inventory-frontend inventory-backend >nul 2>&1

echo [3/4] Restoring database...
docker cp "%SRC%" inventory-db:/tmp/restore_file >nul
if errorlevel 1 goto FAILED

if /i "%EXT%"==".dump" (
    docker exec inventory-db sh -c "(echo 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'; pg_restore --no-owner --no-privileges -f - /tmp/restore_file) | psql -q -v ON_ERROR_STOP=1 --single-transaction -U $POSTGRES_USER -d $POSTGRES_DB >/dev/null"
) else (
    docker exec inventory-db sh -c "(echo 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'; cat /tmp/restore_file) | psql -q -v ON_ERROR_STOP=1 --single-transaction -U $POSTGRES_USER -d $POSTGRES_DB >/dev/null"
)
if errorlevel 1 goto FAILED
docker exec inventory-db rm -f /tmp/restore_file >nul 2>&1
if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%"

echo [4/4] Starting the application...
docker start inventory-backend inventory-frontend >nul
echo.
echo Restore complete! The application will be available again in about a minute.
exit /b 0

:FAILED
docker exec inventory-db rm -f /tmp/restore_file >nul 2>&1
if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%"
echo.
echo ERROR: Restore FAILED. The database was NOT changed (the restore is all-or-nothing).
echo Starting the application again with the existing data...
docker start inventory-backend inventory-frontend >nul
exit /b 1
