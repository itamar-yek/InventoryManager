@echo off
setlocal
REM =============================================================================
REM Export Docker Images - Inventory Manager (Windows)
REM =============================================================================
REM Run this on a machine WITH internet access to create the offline package.
REM It builds everything inside Docker - Node.js and Python are NOT needed.
REM
REM   1. Downloads the base images (PostgreSQL, Python, Node, Nginx)
REM   2. Builds the backend and frontend images from this source code
REM   3. Saves the 3 images the application needs to docker-images\*.tar
REM
REM Afterwards copy the WHOLE project folder (including docker-images\) to the
REM offline machine and follow OFFLINE_INSTALL.md.
REM
REM Prerequisites: Docker Desktop installed and running, internet access.
REM
REM Usage:
REM   export-images.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Export for Offline Deployment
echo ==========================================
echo.

docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    exit /b 1
)

if not exist docker-images mkdir docker-images

echo [1/3] Downloading base images...
docker pull postgres:15-alpine
if errorlevel 1 goto FAILED

echo.
echo [2/3] Building application images (this can take several minutes)...
docker compose build --pull
if errorlevel 1 goto FAILED

echo.
echo [3/3] Saving images to docker-images\ ...
docker save -o docker-images\postgres.tar postgres:15-alpine
if errorlevel 1 goto FAILED
echo       - postgres.tar
docker save -o docker-images\inventory-backend.tar inventory-manager-backend:latest
if errorlevel 1 goto FAILED
echo       - inventory-backend.tar
docker save -o docker-images\inventory-frontend.tar inventory-manager-frontend:latest
if errorlevel 1 goto FAILED
echo       - inventory-frontend.tar

for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"') do set TS=%%i
(
echo Inventory Manager - Offline Deployment Package
echo ===============================================
echo Created: %TS%
echo.
echo docker-images\postgres.tar            PostgreSQL 15 database
echo docker-images\inventory-backend.tar   Backend API
echo docker-images\inventory-frontend.tar  Web interface
echo.
echo FIRST INSTALL on the offline machine:
echo   1. scripts\windows\import-images.bat
echo   2. scripts\windows\setup-offline.bat
echo.
echo UPDATE an existing offline installation ^(keeps all data^):
echo   scripts\windows\update-offline.bat
echo.
echo See OFFLINE_INSTALL.md for details.
) > docker-images\README.txt

echo.
echo ==========================================
echo   Export Complete!
echo ==========================================
echo.
dir docker-images\*.tar
echo.
echo Copy the ENTIRE project folder (including docker-images\) to the offline
echo machine, then follow OFFLINE_INSTALL.md.
exit /b 0

:FAILED
echo.
echo ERROR: Export failed - see the messages above.
exit /b 1
