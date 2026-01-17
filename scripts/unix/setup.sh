#!/bin/bash
# =============================================================================
# Setup Script - Inventory Manager
# =============================================================================
# Initialize the project for first-time deployment.
#
# Usage:
#   ./scripts/setup.sh

set -e

echo "=========================================="
echo "  Inventory Manager - Setup"
echo "=========================================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_step() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# -----------------------------------------------------------------------------
# Step 1: Create .env file
# -----------------------------------------------------------------------------
echo "Step 1: Environment configuration"
if [ ! -f ".env" ]; then
    cp .env.example .env
    log_step "Created .env file from template"
    log_warn "IMPORTANT: Edit .env and set a secure SECRET_KEY for production!"
else
    log_step ".env file already exists"
fi

# -----------------------------------------------------------------------------
# Step 2: Create necessary directories
# -----------------------------------------------------------------------------
echo ""
echo "Step 2: Creating directories"
mkdir -p uploads backups logs
log_step "Created uploads, backups, and logs directories"

# -----------------------------------------------------------------------------
# Step 3: Build Docker images
# -----------------------------------------------------------------------------
echo ""
echo "Step 3: Building Docker images"
docker-compose build
log_step "Docker images built successfully"

# -----------------------------------------------------------------------------
# Step 4: Start services
# -----------------------------------------------------------------------------
echo ""
echo "Step 4: Starting services"
docker-compose up -d
log_step "Services started"

# -----------------------------------------------------------------------------
# Step 5: Wait for database
# -----------------------------------------------------------------------------
echo ""
echo "Step 5: Waiting for database to be ready"
sleep 5
until docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    echo "  Waiting for database..."
    sleep 2
done
log_step "Database is ready"

# -----------------------------------------------------------------------------
# Step 6: Display status
# -----------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Services running:"
docker-compose ps
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost"
echo "  API Docs: http://localhost/api/docs"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
