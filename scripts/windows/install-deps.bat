@echo off
REM =============================================================================
REM Install Dependencies Script - Inventory Manager (Windows)
REM =============================================================================
REM Install local development dependencies (without Docker).
REM Use this for local development or if not using Docker.
REM
REM Prerequisites:
REM   - Python 3.9+ installed and in PATH
REM   - Node.js 18+ installed and in PATH
REM
REM Usage:
REM   install-deps.bat

cd /d "%~dp0..\.."

echo ==========================================
echo   Inventory Manager - Install Dependencies
echo ==========================================
echo.

REM Check Python
echo [1/4] Checking Python...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    python3 --version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Python is not installed or not in PATH!
        echo Please install Python 3.9+ from https://www.python.org/downloads/
        echo Make sure to check "Add Python to PATH" during installation.
        exit /b 1
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)
echo       Python found.

REM Check Node.js
echo [2/4] Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)
echo       Node.js found.

REM Install backend dependencies
echo [3/4] Installing backend dependencies...
cd backend

if not exist venv (
    echo       Creating virtual environment...
    %PYTHON_CMD% -m venv venv
)

echo       Activating virtual environment...
call venv\Scripts\activate.bat

echo       Installing Python packages...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install Python dependencies!
    cd ..
    exit /b 1
)

call venv\Scripts\deactivate.bat
cd ..
echo       Backend dependencies installed.

REM Install frontend dependencies
echo [4/4] Installing frontend dependencies...
cd frontend

echo       Installing Node packages...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install Node.js dependencies!
    cd ..
    exit /b 1
)

cd ..
echo       Frontend dependencies installed.

echo.
echo ==========================================
echo   Dependencies Installed Successfully!
echo ==========================================
echo.
echo To run locally (without Docker):
echo.
echo   Backend:
echo     cd backend
echo     venv\Scripts\activate
echo     uvicorn app.main:app --reload --port 8000
echo.
echo   Frontend (in another terminal):
echo     cd frontend
echo     npm run dev
echo.
echo Or use Docker (recommended):
echo     scripts\windows\setup.bat
