#!/bin/bash
# =============================================================================
# Import Docker Images - Inventory Manager (Unix/Mac)
# =============================================================================
# Run this script on an OFFLINE machine to load pre-exported Docker images.
# The images must have been previously exported using export-images.sh
#
# Usage:
#   ./scripts/unix/import-images.sh

set -e

# Navigate to project root
cd "$(dirname "$0")/../.."

echo "=========================================="
echo "  Import Docker Images (Offline)"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Check if docker-images folder exists
if [ ! -d docker-images ]; then
    echo "ERROR: docker-images folder not found!"
    echo ""
    echo "Please ensure you have copied the entire project folder"
    echo "including the docker-images directory from a machine"
    echo "where export-images.sh was run."
    exit 1
fi

# Check if tar files exist
if [ ! -f docker-images/postgres.tar ]; then
    echo "ERROR: postgres.tar not found in docker-images folder!"
    echo "Please run export-images.sh on a machine with internet first."
    exit 1
fi

echo "[1/3] Loading PostgreSQL image..."
docker load -i docker-images/postgres.tar
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to load postgres image!"
    exit 1
fi
echo "      postgres:15-alpine loaded"

echo ""
echo "[2/3] Loading Backend image..."
docker load -i docker-images/inventory-backend.tar
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to load backend image!"
    exit 1
fi
echo "      inventory-backend loaded"

echo ""
echo "[3/3] Loading Frontend image..."
docker load -i docker-images/inventory-frontend.tar
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to load frontend image!"
    exit 1
fi
echo "      inventory-frontend loaded"

echo ""
echo "=========================================="
echo "  Import Complete!"
echo "=========================================="
echo ""
echo "All images have been loaded into Docker."
echo ""
echo "Next step: Run ./scripts/unix/setup-offline.sh"
echo ""
