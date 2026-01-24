#!/bin/bash
# =============================================================================
# Offline Setup Script - Inventory Manager (Unix/Mac)
# =============================================================================
# Use this script on an OFFLINE machine after importing images.
# This script does NOT require internet connectivity or Node.js.
#
# Prerequisites:
#   1. Docker installed and running
#   2. Images imported via import-images.sh
#   3. Project folder copied from machine where export-images.sh was run
#
# Usage:
#   ./scripts/unix/setup-offline.sh

set -e

# Navigate to project root
cd "$(dirname "$0")/../.."

echo "=========================================="
echo "  Inventory Manager - Offline Setup"
echo "=========================================="
echo ""

# Check if Docker is running
echo "[1/5] Checking Docker..."
if ! docker info &> /dev/null; then
    echo ""
    echo "ERROR: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi
echo "      Docker is running."

# Verify images are loaded
echo "[2/5] Verifying images are loaded..."
if ! docker image inspect postgres:15-alpine &> /dev/null; then
    echo ""
    echo "ERROR: PostgreSQL image not found!"
    echo "Please run import-images.sh first."
    exit 1
fi
if ! docker image inspect inventorymanager-main-backend &> /dev/null; then
    echo ""
    echo "ERROR: Backend image not found!"
    echo "Please run import-images.sh first."
    exit 1
fi
if ! docker image inspect inventorymanager-main-frontend &> /dev/null; then
    echo ""
    echo "ERROR: Frontend image not found!"
    echo "Please run import-images.sh first."
    exit 1
fi
echo "      All images verified."

# Create directories
echo "[3/5] Creating directories..."
mkdir -p uploads backups logs
echo "      Directories created."

# Check/create .env file
echo "[4/5] Checking environment configuration..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "      Created .env from template."
    else
        cat > .env << 'ENVEOF'
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=changeme_in_production
POSTGRES_DB=inventory

# Security - CHANGE THIS IN PRODUCTION!
SECRET_KEY=change_this_to_a_secure_random_string

# Application Settings
DEBUG=false
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVEOF
        echo "      Created default .env file."
    fi
else
    echo "      .env file exists."
fi

# Start services using offline compose (no build needed - uses pre-loaded images)
echo "[5/5] Starting services..."
docker-compose -f docker-compose.offline.yml up -d
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Failed to start services!"
    echo ""
    echo "If you see build errors, make sure you:"
    echo "  1. Ran export-images.sh on a machine with internet"
    echo "  2. Ran import-images.sh on this machine"
    exit 1
fi

# Wait for services
echo ""
echo "Waiting for services to be ready..."
sleep 15

echo ""
echo "=========================================="
echo "  Offline Setup Complete!"
echo "=========================================="
echo ""
echo "The application is now running:"
echo ""
echo "  Application: http://localhost"
echo "  API Docs:    http://localhost/api/docs"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost in your browser"
echo "  2. Register the first user (becomes admin)"
echo "  3. Start adding rooms and inventory!"
echo ""
echo "Useful commands:"
echo "  docker-compose -f docker-compose.offline.yml logs -f    View logs"
echo "  docker-compose -f docker-compose.offline.yml down       Stop services"
echo "  docker-compose -f docker-compose.offline.yml restart    Restart"
echo ""
