#!/bin/bash
# =============================================================================
# Development Start Script - Inventory Manager
# =============================================================================
# Start the application in development mode (without Docker).
# Requires dependencies to be installed first (run install-deps.sh).
#
# Usage:
#   ./scripts/dev-start.sh              # Start both backend and frontend
#   ./scripts/dev-start.sh backend      # Start backend only
#   ./scripts/dev-start.sh frontend     # Start frontend only

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

start_backend() {
    echo "Starting backend..."
    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

start_frontend() {
    echo "Starting frontend..."
    cd "$PROJECT_ROOT/frontend"
    npm run dev
}

case "$1" in
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    *)
        echo "=========================================="
        echo "  Inventory Manager - Development Mode"
        echo "=========================================="
        echo ""
        echo "Starting both backend and frontend..."
        echo ""
        echo -e "${YELLOW}Note: This will start both services in the foreground.${NC}"
        echo -e "${YELLOW}For separate terminals, run with 'backend' or 'frontend' argument.${NC}"
        echo ""

        # Start backend in background
        cd "$PROJECT_ROOT/backend"
        source venv/bin/activate
        uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
        BACKEND_PID=$!

        # Wait for backend to start
        sleep 3

        # Start frontend in foreground
        cd "$PROJECT_ROOT/frontend"
        npm run dev &
        FRONTEND_PID=$!

        echo ""
        echo -e "${GREEN}Services started:${NC}"
        echo "  Backend:  http://localhost:8000 (PID: $BACKEND_PID)"
        echo "  Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
        echo "  API Docs: http://localhost:8000/docs"
        echo ""
        echo "Press Ctrl+C to stop all services..."

        # Handle Ctrl+C to stop both services
        trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

        # Wait for both processes
        wait
        ;;
esac
