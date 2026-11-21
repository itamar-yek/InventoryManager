@echo off
setlocal
REM =============================================================================
REM Import Docker Images - Inventory Manager (Windows)
REM =============================================================================
REM Run this on the OFFLINE machine to load the images created by
REM export-images.bat. Loading images never touches the database.
REM
REM Usage:
REM   import-images.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Import Docker Images (Offline)
echo ==========================================
echo.

docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    exit /b 1
)

for %%F in (postgres inventory-backend inventory-frontend) do (
    if not exist docker-images\%%F.tar (
        echo ERROR: docker-images\%%F.tar not found!
        echo Run export-images.bat on a machine with internet and copy the
        echo whole project folder, including docker-images\, to this machine.
        exit /b 1
    )
)

for %%F in (postgres inventory-backend inventory-frontend) do (
    echo Loading %%F.tar ...
    docker load -i docker-images\%%F.tar
    if errorlevel 1 (
        echo ERROR: Failed to load docker-images\%%F.tar - the file may be damaged.
        exit /b 1
    )
)

echo.
echo ==========================================
echo   Import Complete!
echo ==========================================
echo.
echo Next step:
echo   First install:  scripts\windows\setup-offline.bat
echo   Update:         (update-offline.bat continues automatically)
exit /b 0
