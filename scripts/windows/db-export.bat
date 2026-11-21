@echo off
REM =============================================================================
REM Database Export Script - Inventory Manager (Windows)
REM =============================================================================
REM Export the database to a SQL file.
REM
REM Usage:
REM   db-export.bat                     - Export to backup.sql
REM   db-export.bat mybackup.sql        - Export to specified file
REM   db-export.bat --data-only         - Export data only (no schema)

cd /d "%~dp0..\.."

set OUTFILE=backup.sql
set DATA_ONLY=

if "%1"=="--data-only" (
    set DATA_ONLY=--data-only
    if not "%2"=="" set OUTFILE=%2
) else if not "%1"=="" (
    set OUTFILE=%1
)

echo Exporting database to %OUTFILE%...

if "%DATA_ONLY%"=="" (
    docker exec inventory-db sh -c "pg_dump -U $POSTGRES_USER -d $POSTGRES_DB" > %OUTFILE%
) else (
    docker exec inventory-db sh -c "pg_dump -U $POSTGRES_USER -d $POSTGRES_DB --data-only" > %OUTFILE%
)

if %ERRORLEVEL% EQU 0 (
    echo Export complete: %OUTFILE%
) else (
    echo Export failed.
)
