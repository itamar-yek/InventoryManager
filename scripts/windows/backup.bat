@echo off
setlocal
REM =============================================================================
REM Backup Script - Inventory Manager (Windows)
REM =============================================================================
REM Creates a full database backup in backups\inventory_YYYYMMDD_HHMMSS.dump
REM (PostgreSQL custom format - restore it with restore.bat).
REM
REM Usage:
REM   backup.bat
REM
REM Exit code is 0 only if the backup file was written successfully.

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Creating Backup
echo ==========================================
echo.

docker inspect -f "{{.State.Running}}" inventory-db 2>nul | findstr /i "true" >nul
if errorlevel 1 (
    echo ERROR: The database container "inventory-db" is not running.
    echo Start the application first: scripts\windows\start.bat
    exit /b 1
)

if not exist backups mkdir backups

REM Locale-independent timestamp
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%i
set BACKUP_FILE=backups\inventory_%TS%.dump

echo Dumping database...
docker exec inventory-db sh -c "pg_dump -U $POSTGRES_USER -d $POSTGRES_DB --format=custom --file=/tmp/backup.dump"
if errorlevel 1 goto FAILED

docker cp inventory-db:/tmp/backup.dump "%BACKUP_FILE%" >nul
if errorlevel 1 goto FAILED
docker exec inventory-db rm -f /tmp/backup.dump >nul 2>&1

if not exist "%BACKUP_FILE%" goto FAILED
for %%A in ("%BACKUP_FILE%") do if %%~zA LSS 100 goto FAILED

echo.
echo Backup complete: %BACKUP_FILE%
for %%A in ("%BACKUP_FILE%") do echo Size: %%~zA bytes
echo.
echo TIP: Copy the backups folder to another disk/USB drive regularly.
exit /b 0

:FAILED
echo.
echo ERROR: Backup FAILED. Nothing was changed.
if exist "%BACKUP_FILE%" del "%BACKUP_FILE%"
exit /b 1
