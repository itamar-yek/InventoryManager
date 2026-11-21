#!/bin/bash
# =============================================================================
# Export Docker Images - Inventory Manager (Unix/Mac)
# =============================================================================
# Run this script on a machine WITH internet access to create an offline
# deployment package. This will:
#   1. Build the frontend (requires Node.js)
#   2. Build Docker images
#   3. Export images to .tar files
#
# The entire project folder can then be copied to an offline machine.
#
# Prerequisites:
#   1. Node.js installed (version 18+)
#   2. Docker installed and running
#   3. Internet connectivity
#
# Usage:
#   ./scripts/unix/export-images.sh

set -e

# Navigate to project root
cd "$(dirname "$0")/../.."

echo "=========================================="
echo "  Export for Offline Deployment"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Create docker-images directory
mkdir -p docker-images

echo "[2/6] Pulling base images..."
docker pull postgres:15-alpine
docker pull nginx:alpine
docker pull python:3.11-slim

echo ""
echo "[3/6] Building application images..."
docker compose build --pull || { echo 'ERROR: build failed'; exit 1; }

echo ""
echo "[4/6] Exporting images to tar files..."
echo "      This may take several minutes..."

# Export all required images
docker save -o docker-images/postgres.tar postgres:15-alpine
echo "      - postgres:15-alpine exported"

docker save -o docker-images/inventory-backend.tar inventory-manager-backend:latest
echo "      - inventory-backend exported"

docker save -o docker-images/inventory-frontend.tar inventory-manager-frontend:latest
echo "      - inventory-frontend exported"

echo ""
echo "[6/6] Creating offline package info..."
cat > docker-images/README.txt << 'EOF'
Inventory Manager - Offline Deployment Package
===============================================

This package includes:
  - Pre-built frontend static files (frontend/dist/)
  - Docker images (docker-images/*.tar)
  - All source code and configuration

To deploy on an offline machine:
  1. Copy the ENTIRE project folder to the target machine
  2. Install Docker on the target machine
  3. Run: ./scripts/unix/import-images.sh
  4. Run: ./scripts/unix/setup-offline.sh

Docker images included:
  - postgres.tar (PostgreSQL 15 Alpine)
  - inventory-backend.tar (FastAPI backend)
  - inventory-frontend.tar (React + Nginx frontend)

Note: Node.js is NOT required on the offline machine.
The frontend has been pre-built and is included.
EOF

echo ""
echo "=========================================="
echo "  Export Complete!"
echo "=========================================="
echo ""
echo "Exported files:"
echo "  - Docker images in: docker-images/"
echo "  - Frontend build in: frontend/dist/"
echo ""
echo "Total Docker image size:"
du -sh docker-images/*.tar 2>/dev/null || echo "  (no tar files found)"
echo ""
echo "To deploy offline:"
echo "  1. Copy the ENTIRE project folder to the offline machine"
echo "  2. Install Docker (no internet needed after install)"
echo "  3. Run: ./scripts/unix/import-images.sh"
echo "  4. Run: ./scripts/unix/setup-offline.sh"
echo ""
echo "NOTE: Node.js is NOT required on the offline machine!"
echo ""
