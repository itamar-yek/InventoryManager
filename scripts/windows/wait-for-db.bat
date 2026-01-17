@echo off
REM =============================================================================
REM Wait for Database Script - Inventory Manager (Windows)
REM =============================================================================
REM Wait for the database to be ready.
REM
REM Usage:
REM   wait-for-db.bat           - Wait up to 60 seconds
REM   wait-for-db.bat 120       - Wait up to 120 seconds

cd /d "%~dp0..\.."

set TIMEOUT=60
if not "%1"=="" set TIMEOUT=%1

set ELAPSED=0

echo Waiting for database to be ready (timeout: %TIMEOUT%s)...

:LOOP
if %ELAPSED% GEQ %TIMEOUT% goto TIMEOUT_EXIT

docker-compose exec -T db pg_isready -U postgres >nul 2>&1
if %ERRORLEVEL% EQU 0 goto SUCCESS

echo   Still waiting... (%ELAPSED%s)
timeout /t 2 /nobreak >nul
set /a ELAPSED+=2
goto LOOP

:SUCCESS
echo Database is ready!
exit /b 0

:TIMEOUT_EXIT
echo Timeout waiting for database!
exit /b 1
