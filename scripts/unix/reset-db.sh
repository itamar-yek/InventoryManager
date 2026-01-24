#!/bin/bash
# =============================================================================
# Reset Database - Inventory Manager (Unix/Mac)
# =============================================================================
# This script completely resets the database, removing all data.
# USE WITH CAUTION - ALL DATA WILL BE LOST!
#
# Usage:
#   ./scripts/unix/reset-db.sh
#   ./scripts/unix/reset-db.sh --force   # Skip confirmation prompt

set -e

# Navigate to project root
cd "$(dirname "$0")/../.."

echo "=========================================="
echo "  Database Reset - Inventory Manager"
echo "=========================================="
echo ""
echo "WARNING: This will DELETE ALL DATA including:"
echo "  - All rooms and storage units"
echo "  - All items and their history"
echo "  - All user accounts"
echo ""

# Check for --force flag
if [ "$1" != "--force" ]; then
    read -p "Are you sure you want to reset the database? (type 'yes' to confirm): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
fi

echo ""
echo "Resetting database..."

# Determine which compose file to use
if [ -f docker-compose.offline.yml ] && docker-compose -f docker-compose.offline.yml ps 2>/dev/null | grep -q "inventory"; then
    COMPOSE_FILE="docker-compose.offline.yml"
elif [ -f docker-compose.yml ]; then
    COMPOSE_FILE="docker-compose.yml"
else
    COMPOSE_FILE="docker-compose.offline.yml"
fi

echo "Using: $COMPOSE_FILE"

# Stop services
echo "[1/4] Stopping services..."
docker-compose -f $COMPOSE_FILE down 2>/dev/null || true

# Remove database volume
echo "[2/4] Removing database volume..."
docker volume rm inventory-postgres-data 2>/dev/null || true

# Remove any orphan volumes
echo "[3/4] Cleaning up..."
docker volume prune -f 2>/dev/null || true

# Restart services
echo "[4/4] Restarting services with fresh database..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services
echo ""
echo "Waiting for services to initialize..."
sleep 15

echo ""
echo "=========================================="
echo "  Database Reset Complete!"
echo "=========================================="
echo ""
echo "The database has been reset. All data has been removed."
echo ""
echo "Next steps:"
echo "  1. Open http://localhost in your browser"
echo "  2. Register the first user (becomes admin)"
echo "  3. Start fresh!"
echo ""
