@echo off
setlocal
REM =============================================================================
REM Offline Setup / Start - Inventory Manager (Windows)
REM =============================================================================
REM Run on the OFFLINE machine after import-images.bat.
REM Safe to run again at any time: it never deletes data.
REM
REM   - Creates .env with random passwords on a brand-new install
REM     (never changes .env or the database password of an existing install)
REM   - Backs up the existing database first (if one is running)
REM   - Starts the application; the backend upgrades the database schema
REM     automatically, with its own backup before any change
REM
REM Usage:
REM   setup-offline.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Offline Setup
echo ==========================================
echo.

echo [1/5] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    exit /b 1
)

echo [2/5] Checking images...
for %%I in (postgres:15-alpine inventory-manager-backend:latest inventory-manager-frontend:latest) do (
    docker image inspect %%I >nul 2>&1
    if errorlevel 1 (
        echo.
        echo ERROR: Image %%I is not loaded. Run scripts\windows\import-images.bat first.
        exit /b 1
    )
)
if not exist backups mkdir backups

echo [3/5] Checking configuration (.env)...
if exist .env (
    echo       Using existing .env
    goto ENV_DONE
)
docker volume inspect inventory-postgres-data >nul 2>&1
if not errorlevel 1 goto ENV_EXISTING_DB

REM Brand-new install: generate strong random secrets.
powershell -NoProfile -Command "$c = Get-Content '.env.example' -Raw; $pw = [guid]::NewGuid().ToString('N'); $sk = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'); $c = $c -replace '(?m)^POSTGRES_PASSWORD=.*$', ('POSTGRES_PASSWORD=' + $pw); $c = $c -replace '(?m)^SECRET_KEY=.*$', ('SECRET_KEY=' + $sk); $c = $c -replace '(?m)^DATABASE_URL=.*$', ('DATABASE_URL=postgresql://postgres:' + $pw + '@db:5432/inventory'); [IO.File]::WriteAllText('.env', $c)"
if errorlevel 1 (
    echo ERROR: Could not create .env
    exit /b 1
)
echo       Created .env with a random database password and secret key.
echo       KEEP A COPY OF .env TOGETHER WITH YOUR BACKUPS.
goto ENV_DONE

:ENV_EXISTING_DB
REM A database already exists but .env is missing. The database keeps the
REM password it was created with, so we must NOT invent a new one.
copy .env.example .env >nul
echo.
echo       WARNING: An existing database was found but there was no .env file.
echo       Created .env from .env.example (database password: postgres).
echo       If your database was set up with a different password, put the
echo       ORIGINAL password in .env (POSTGRES_PASSWORD) and run this again.
echo.

:ENV_DONE

echo [4/5] Starting the application...
docker inspect -f "{{.State.Running}}" inventory-db 2>nul | findstr /i "true" >nul
if errorlevel 1 goto NO_BACKUP_NEEDED
echo       Backing up the existing database first...
call "%~dp0backup.bat" >nul
if errorlevel 1 (
    echo ERROR: Backup of the existing database failed. Nothing was changed.
    exit /b 1
)
echo       Backup done (see backups\).
:NO_BACKUP_NEEDED

REM Remove old containers (e.g. from a previous version). This does NOT
REM delete any data - the data lives in the inventory-postgres-data volume.
docker stop -t 60 inventory-frontend inventory-backend inventory-db >nul 2>&1
docker rm inventory-frontend inventory-backend inventory-db >nul 2>&1

docker compose -f docker-compose.offline.yml up -d
if errorlevel 1 (
    echo.
    echo ERROR: Failed to start services! See the messages above.
    exit /b 1
)

echo [5/5] Waiting for the application to become ready (up to 5 minutes)...
set /a TRIES=0
:WAIT_LOOP
set STATUS=
for /f %%s in ('docker inspect -f "{{.State.Health.Status}}" inventory-backend 2^>nul') do set STATUS=%%s
if "%STATUS%"=="healthy" goto READY
set /a TRIES+=1
if %TRIES% GEQ 60 goto NOT_READY
timeout /t 5 /nobreak >nul
goto WAIT_LOOP

:NOT_READY
echo.
echo ERROR: The backend did not become ready. Last log lines:
echo ------------------------------------------------------------
docker logs --tail 40 inventory-backend
echo ------------------------------------------------------------
echo Your data has NOT been deleted. If a database upgrade failed, it was rolled
echo back and a backup is in the backups folder.
exit /b 1

:READY
echo.
echo ==========================================
echo   Inventory Manager is running!
echo ==========================================
echo.
echo   Open:      http://localhost   (or http://^<this-computer's-IP^> from other PCs)
echo   API docs:  http://localhost/api/docs
echo.
echo   First install: log in as "admin" with the password from ADMIN_PASSWORD
echo   in .env (default: admin).
echo.
echo   Daily use:   scripts\windows\start.bat / stop.bat
echo   Backup:      scripts\windows\backup.bat
echo.
exit /b 0
