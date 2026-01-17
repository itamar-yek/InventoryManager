@echo off
REM =============================================================================
REM Backup Script - Inventory Manager (Windows)
REM =============================================================================
REM Create a backup of the database and uploaded files.
REM
REM Usage:
REM   backup.bat

cd /d "%~dp0..\.."

set BACKUP_DIR=backups
set TIMESTAMP=%DATE:~-4%%DATE:~-10,2%%DATE:~-7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_NAME=backup_%TIMESTAMP%

echo ==========================================
echo   Inventory Manager - Creating Backup
echo ==========================================
echo.

REM Create backup directory
if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

set TEMP_DIR=%BACKUP_DIR%\%BACKUP_NAME%
mkdir %TEMP_DIR%

echo Backing up database...
docker-compose exec -T db pg_dump -U postgres inventory > %TEMP_DIR%\database.sql
if %ERRORLEVEL% NEQ 0 (
    echo Database backup failed!
    rmdir /s /q %TEMP_DIR%
    exit /b 1
)

echo Backing up uploads...
if exist uploads (
    xcopy /s /e /q uploads %TEMP_DIR%\uploads\ >nul 2>&1
)

echo Creating archive...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%BACKUP_DIR%\%BACKUP_NAME%.zip'"

REM Cleanup temp directory
rmdir /s /q %TEMP_DIR%

echo.
echo Backup complete: %BACKUP_DIR%\%BACKUP_NAME%.zip
