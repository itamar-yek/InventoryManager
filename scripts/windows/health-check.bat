@echo off
REM =============================================================================
REM Health Check Script - Inventory Manager (Windows)
REM =============================================================================
REM Check health of all services with detailed output.
REM
REM Usage:
REM   health-check.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Health Check
echo ==========================================
echo.

set ERRORS=0

REM Check Docker
echo [1/4] Docker...
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       OK - Docker is running
) else (
    echo       FAIL - Docker is not running
    set /a ERRORS+=1
)

REM Check Database
echo [2/4] Database...
docker-compose exec -T db pg_isready -U postgres >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       OK - PostgreSQL is accepting connections
) else (
    echo       FAIL - PostgreSQL is not responding
    set /a ERRORS+=1
)

REM Check Backend
echo [3/4] Backend API...
curl -s -f http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       OK - Backend is healthy
) else (
    echo       FAIL - Backend is not responding
    set /a ERRORS+=1
)

REM Check Frontend
echo [4/4] Frontend...
curl -s -f http://localhost:3000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       OK - Frontend is serving
) else (
    echo       FAIL - Frontend is not responding
    set /a ERRORS+=1
)

echo.
echo ==========================================
if %ERRORS% EQU 0 (
    echo   All systems operational!
) else (
    echo   %ERRORS% service(s) have issues
)
echo ==========================================

exit /b %ERRORS%
