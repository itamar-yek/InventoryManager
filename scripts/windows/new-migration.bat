@echo off
setlocal
REM =============================================================================
REM Create a new database migration - Inventory Manager (Windows)
REM =============================================================================
REM Run on the DEVELOPMENT machine (with internet) after changing a model in
REM backend\app\models\. It compares the models to the current migrations and
REM writes a new migration file into backend\migrations\versions\.
REM
REM It uses a throw-away PostgreSQL container - your real database is NOT used
REM and NOT touched.
REM
REM Usage:
REM   new-migration.bat "add supplier column to items"
REM
REM Then: REVIEW the generated file (see DATABASE_CHANGES.md), run the tests,
REM and commit it together with the model change.

cd /d "%~dp0..\.."

if "%~1"=="" (
    echo Usage: new-migration.bat "short description of the change"
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    exit /b 1
)

set NET=inventory-migration-tmp
set DB=inventory-migration-db
docker rm -f %DB% >nul 2>&1
docker network rm %NET% >nul 2>&1
docker network create %NET% >nul
docker run -d --name %DB% --network %NET% -e POSTGRES_PASSWORD=tmp -e POSTGRES_DB=tmp postgres:15-alpine >nul
if errorlevel 1 goto FAILED

echo Waiting for temporary database...
:WAIT
timeout /t 2 /nobreak >nul
docker exec %DB% pg_isready -U postgres -d tmp >nul 2>&1
if errorlevel 1 goto WAIT

echo Generating migration...
docker run --rm --network %NET% -e DATABASE_URL=postgresql://postgres:tmp@%DB%:5432/tmp -v "%CD%\backend:/app" -w /app python:3.11-slim-bookworm sh -c "pip install -q -r requirements.txt >/dev/null 2>&1 && alembic upgrade head && alembic revision --autogenerate -m \"%~1\" && find /app -name __pycache__ -prune -exec rm -rf {} +"
set RESULT=%ERRORLEVEL%

docker rm -f %DB% >nul 2>&1
docker network rm %NET% >nul 2>&1
if not "%RESULT%"=="0" goto FAILED

echo.
echo Done. New file in backend\migrations\versions\ - REVIEW IT before committing.
echo See DATABASE_CHANGES.md for the checklist.
exit /b 0

:FAILED
docker rm -f %DB% >nul 2>&1
docker network rm %NET% >nul 2>&1
echo ERROR: Could not generate the migration - see messages above.
exit /b 1
