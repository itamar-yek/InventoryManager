@echo off
REM =============================================================================
REM Import Docker Images - Inventory Manager (Windows)
REM =============================================================================
REM Run this script on an OFFLINE machine to load pre-exported Docker images.
REM The images must have been previously exported using export-images.bat
REM
REM Usage:
REM   import-images.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Import Docker Images (Offline)
echo ==========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    exit /b 1
)

REM Check if docker-images folder exists
if not exist docker-images (
    echo ERROR: docker-images folder not found!
    echo.
    echo Please ensure you have copied the entire project folder
    echo including the docker-images directory from a machine
    echo where export-images.bat was run.
    exit /b 1
)

REM Check if tar files exist
if not exist docker-images\postgres.tar (
    echo ERROR: postgres.tar not found in docker-images folder!
    echo Please run export-images.bat on a machine with internet first.
    exit /b 1
)

echo [1/3] Loading PostgreSQL image...
docker load -i docker-images\postgres.tar
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to load postgres image!
    exit /b 1
)
echo       postgres:15-alpine loaded

echo.
echo [2/3] Loading Backend image...
docker load -i docker-images\inventory-backend.tar
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to load backend image!
    exit /b 1
)
echo       inventory-backend loaded

echo.
echo [3/3] Loading Frontend image...
docker load -i docker-images\inventory-frontend.tar
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to load frontend image!
    exit /b 1
)
echo       inventory-frontend loaded

echo.
echo ==========================================
echo   Import Complete!
echo ==========================================
echo.
echo All images have been loaded into Docker.
echo.
echo Next step: Run scripts\windows\setup-offline.bat
echo.
