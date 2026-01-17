#!/bin/bash
# =============================================================================
# Install Dependencies Script - Inventory Manager
# =============================================================================
# Install local development dependencies (without Docker).
# Use this for local development or if not using Docker.
#
# Prerequisites:
#   - Python 3.9+ installed
#   - Node.js 18+ installed
#
# Usage:
#   ./scripts/install-deps.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  Inventory Manager - Install Dependencies"
echo "=========================================="
echo ""

# -----------------------------------------------------------------------------
# Check Python
# -----------------------------------------------------------------------------
echo "[1/4] Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}ERROR: Python is not installed!${NC}"
    echo "Please install Python 3.9+ from https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
echo -e "      ${GREEN}Python $PYTHON_VERSION found${NC}"

# -----------------------------------------------------------------------------
# Check Node.js
# -----------------------------------------------------------------------------
echo "[2/4] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed!${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "      ${GREEN}Node.js $NODE_VERSION found${NC}"

# -----------------------------------------------------------------------------
# Install backend dependencies
# -----------------------------------------------------------------------------
echo "[3/4] Installing backend dependencies..."
cd "$PROJECT_ROOT/backend"

if [ ! -d "venv" ]; then
    echo "      Creating virtual environment..."
    $PYTHON_CMD -m venv venv
fi

echo "      Activating virtual environment..."
source venv/bin/activate

echo "      Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

deactivate
cd "$PROJECT_ROOT"
echo -e "      ${GREEN}Backend dependencies installed${NC}"

# -----------------------------------------------------------------------------
# Install frontend dependencies
# -----------------------------------------------------------------------------
echo "[4/4] Installing frontend dependencies..."
cd "$PROJECT_ROOT/frontend"

echo "      Installing Node packages..."
npm install

cd "$PROJECT_ROOT"
echo -e "      ${GREEN}Frontend dependencies installed${NC}"

echo ""
echo "=========================================="
echo -e "  ${GREEN}Dependencies Installed Successfully!${NC}"
echo "=========================================="
echo ""
echo "To run locally (without Docker):"
echo ""
echo "  Backend:"
echo "    cd backend"
echo "    source venv/bin/activate"
echo "    uvicorn app.main:app --reload --port 8000"
echo ""
echo "  Frontend (in another terminal):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "Or use Docker (recommended):"
echo "    ./scripts/setup.sh"
