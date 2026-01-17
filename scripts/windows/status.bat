@echo off
REM =============================================================================
REM Status Script - Inventory Manager (Windows)
REM =============================================================================
REM Show status of all services.
REM
REM Usage:
REM   status.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Service Status
echo ==========================================
echo.

echo Container Status:
echo -----------------
docker-compose ps
echo.

echo Health Checks:
echo --------------

REM Check backend health
curl -s http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Backend:  HEALTHY
) else (
    echo   Backend:  DOWN
)

REM Check frontend
curl -s http://localhost:3000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Frontend: HEALTHY
) else (
    echo   Frontend: DOWN
)

REM Check database
docker-compose exec -T db pg_isready -U postgres >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Database: HEALTHY
) else (
    echo   Database: DOWN
)

echo.
