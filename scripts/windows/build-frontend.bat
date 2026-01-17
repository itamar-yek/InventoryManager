@echo off
REM =============================================================================
REM Build Frontend - Inventory Manager (Windows)
REM =============================================================================
REM Run this script on a machine WITH internet access to build the frontend.
REM This creates the static files that can be used for offline deployment.
REM
REM Prerequisites:
REM   1. Node.js installed (version 18+)
REM   2. Internet access (for npm install)
REM
REM Usage:
REM   build-frontend.bat

cd /d "%~dp0..\..\frontend"

echo ==========================================
echo   Build Frontend for Offline Deployment
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

echo [1/3] Installing dependencies...
call npm ci
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: npm install failed!
    exit /b 1
)

echo.
echo [2/3] Building frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed!
    exit /b 1
)

echo.
echo [3/3] Verifying build output...
if not exist dist (
    echo ERROR: dist folder not created!
    exit /b 1
)
if not exist dist\index.html (
    echo ERROR: index.html not found in dist!
    exit /b 1
)

echo.
echo ==========================================
echo   Frontend Build Complete!
echo ==========================================
echo.
echo Built files are in: frontend\dist\
echo.
echo The pre-built frontend is ready for offline deployment.
echo You can now run export-images.bat to create the offline package.
echo.
