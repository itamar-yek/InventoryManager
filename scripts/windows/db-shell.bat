@echo off
REM =============================================================================
REM Database Shell Script - Inventory Manager (Windows)
REM =============================================================================
REM Open an interactive PostgreSQL shell.
REM
REM Usage:
REM   db-shell.bat

cd /d "%~dp0..\.."

echo Connecting to database...
echo (Type \q to exit)
echo.

docker-compose exec db psql -U postgres inventory
