#!/bin/bash
# =============================================================================
# Update Script - Inventory Manager
# =============================================================================
# Update the application after code changes.
# Performs a rolling update to minimize downtime.
#
# Usage:
#   ./scripts/update.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  Inventory Manager - Update"
echo "=========================================="
echo ""

# Create a backup before updating
echo -e "${YELLOW}Step 1: Creating backup...${NC}"
./scripts/backup.sh
echo ""

# Rebuild images
echo -e "${YELLOW}Step 2: Rebuilding images...${NC}"
docker-compose build
echo ""

# Update backend first (stateless)
echo -e "${YELLOW}Step 3: Updating backend...${NC}"
docker-compose up -d --no-deps backend
echo "Waiting for backend to be healthy..."
sleep 5
until docker-compose exec -T backend curl -sf http://localhost:8000/api/health > /dev/null 2>&1; do
    echo "  Waiting for backend..."
    sleep 2
done
echo -e "${GREEN}Backend updated!${NC}"
echo ""

# Update frontend
echo -e "${YELLOW}Step 4: Updating frontend...${NC}"
docker-compose up -d --no-deps frontend
echo "Waiting for frontend to be healthy..."
sleep 3
until docker-compose exec -T frontend wget -q --spider http://localhost/health 2>/dev/null; do
    echo "  Waiting for frontend..."
    sleep 2
done
echo -e "${GREEN}Frontend updated!${NC}"
echo ""

echo "=========================================="
echo -e "  ${GREEN}Update Complete!${NC}"
echo "=========================================="
echo ""

# Show status
docker-compose ps
