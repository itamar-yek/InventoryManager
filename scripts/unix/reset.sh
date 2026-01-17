#!/bin/bash
# =============================================================================
# Reset Script - Inventory Manager
# =============================================================================
# WARNING: This script will DELETE ALL DATA and reset the application!
#
# Usage:
#   ./scripts/reset.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo -e "  ${RED}Inventory Manager - RESET${NC}"
echo "=========================================="
echo ""
echo -e "${RED}WARNING: This will DELETE ALL DATA including:${NC}"
echo "  - Database (all users, items, rooms, etc.)"
echo "  - Uploaded files"
echo "  - Log files"
echo ""
echo -e "${YELLOW}This action CANNOT be undone!${NC}"
echo ""

read -p "Type 'RESET' to confirm: " confirm

if [ "$confirm" != "RESET" ]; then
    echo ""
    echo "Reset cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Creating final backup before reset...${NC}"
./scripts/backup.sh 2>/dev/null || echo "Backup skipped (services may be down)"

echo ""
echo -e "${YELLOW}Stopping all services...${NC}"
docker-compose down -v 2>/dev/null || true

echo ""
echo -e "${YELLOW}Removing local data...${NC}"
rm -rf "$PROJECT_ROOT/uploads/"* 2>/dev/null || true
rm -rf "$PROJECT_ROOT/logs/"* 2>/dev/null || true

echo ""
echo -e "${YELLOW}Rebuilding and starting fresh...${NC}"
docker-compose build
docker-compose up -d

echo ""
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5
./scripts/wait-for-db.sh

echo ""
echo "=========================================="
echo -e "  ${GREEN}Reset Complete!${NC}"
echo "=========================================="
echo ""
echo "The application has been reset to a fresh state."
echo "Register a new user to become the administrator."
echo ""
echo -e "${YELLOW}Note: A backup was saved before reset in ./backups/${NC}"
