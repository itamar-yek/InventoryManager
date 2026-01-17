@echo off
REM =============================================================================
REM Development Start Script - Inventory Manager (Windows)
REM =============================================================================
REM Start the application in development mode (without Docker).
REM Requires dependencies to be installed first (run install-deps.bat).
REM
REM Usage:
REM   dev-start.bat              - Start both backend and frontend
REM   dev-start.bat backend      - Start backend only
REM   dev-start.bat frontend     - Start frontend only

cd /d "%~dp0..\.."

if "%1"=="backend" goto START_BACKEND
if "%1"=="frontend" goto START_FRONTEND

REM Start both - need two terminal windows
echo ==========================================
echo   Inventory Manager - Development Mode
echo ==========================================
echo.
echo Starting services in development mode...
echo.
echo This will open two new terminal windows:
echo   - Backend (Python/FastAPI)
echo   - Frontend (Vite/React)
echo.

REM Start backend in new window
start "Inventory Manager - Backend" cmd /k "cd /d %~dp0..\..\backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "Inventory Manager - Frontend" cmd /k "cd /d %~dp0..\..\frontend && npm run dev"

echo.
echo Services starting in separate windows...
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000 (or port shown in frontend window)
echo   API Docs: http://localhost:8000/docs
echo.
echo Close the terminal windows to stop the services.
goto END

:START_BACKEND
echo Starting backend only...
cd backend
call venv\Scripts\activate.bat
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
goto END

:START_FRONTEND
echo Starting frontend only...
cd frontend
npm run dev
goto END

:END
