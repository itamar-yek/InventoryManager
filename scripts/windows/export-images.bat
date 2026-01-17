@echo off
REM =============================================================================
REM Export Docker Images - Inventory Manager (Windows)
REM =============================================================================
REM Run this script on a machine WITH internet access to create an offline
REM deployment package. This will:
REM   1. Build the frontend (requires Node.js)
REM   2. Build Docker images
REM   3. Export images to .tar files
REM
REM The entire project folder can then be copied to an offline machine.
REM
REM Prerequisites:
REM   1. Node.js installed (version 18+)
REM   2. Docker Desktop installed and running
REM   3. Internet connectivity
REM
REM Usage:
REM   export-images.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Export for Offline Deployment
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    exit /b 1
)

REM Create docker-images directory
if not exist docker-images mkdir docker-images

echo [1/6] Building frontend...
cd frontend
call npm ci
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed!
    cd ..
    exit /b 1
)
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend build failed!
    cd ..
    exit /b 1
)
cd ..
echo       Frontend built successfully.

echo.
echo [2/6] Pulling base images...
docker pull postgres:15-alpine
docker pull nginx:alpine
docker pull python:3.11-slim

echo.
echo [3/6] Building application images...
set DOCKER_BUILDKIT=0
set COMPOSE_DOCKER_CLI_BUILD=0
docker-compose build

echo.
echo [4/6] Exporting images to tar files...
echo       This may take several minutes...

REM Export all required images
docker save -o docker-images\postgres.tar postgres:15-alpine
echo       - postgres:15-alpine exported

docker save -o docker-images\inventory-backend.tar inventorymanager-main-backend
echo       - inventory-backend exported

docker save -o docker-images\inventory-frontend.tar inventorymanager-main-frontend
echo       - inventory-frontend exported

echo.
echo [5/6] Verifying frontend dist is included...
if not exist frontend\dist\index.html (
    echo ERROR: Frontend dist folder not found!
    exit /b 1
)
echo       Frontend dist verified.

echo.
echo [6/6] Creating offline package info...
(
echo Inventory Manager - Offline Deployment Package
echo ===============================================
echo.
echo Created on: %DATE% %TIME%
echo.
echo This package includes:
echo   - Pre-built frontend static files (frontend\dist\)
echo   - Docker images (docker-images\*.tar)
echo   - All source code and configuration
echo.
echo To deploy on an offline machine:
echo   1. Copy the ENTIRE project folder to the target machine
echo   2. Install Docker Desktop on the target machine
echo   3. Run: scripts\windows\import-images.bat
echo   4. Run: scripts\windows\setup-offline.bat
echo.
echo Docker images included:
echo   - postgres.tar (PostgreSQL 15 Alpine^)
echo   - inventory-backend.tar (FastAPI backend^)
echo   - inventory-frontend.tar (React + Nginx frontend^)
echo.
echo Note: Node.js is NOT required on the offline machine.
echo The frontend has been pre-built and is included.
) > docker-images\README.txt

echo.
echo ==========================================
echo   Export Complete!
echo ==========================================
echo.
echo Exported files:
echo   - Docker images in: docker-images\
echo   - Frontend build in: frontend\dist\
echo.
echo Total Docker image size:
dir docker-images\*.tar /s 2>nul | findstr "File(s)"
echo.
echo To deploy offline:
echo   1. Copy the ENTIRE project folder to the offline machine
echo   2. Install Docker Desktop (no internet needed after install)
echo   3. Run: scripts\windows\import-images.bat
echo   4. Run: scripts\windows\setup-offline.bat
echo.
echo NOTE: Node.js is NOT required on the offline machine!
echo.
