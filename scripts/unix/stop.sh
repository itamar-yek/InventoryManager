#!/bin/bash
# =============================================================================
# Stop Script - Inventory Manager
# =============================================================================
# Stop all or specific services.
#
# Usage:
#   ./scripts/stop.sh           # Stop all services
#   ./scripts/stop.sh db        # Stop database only
#   ./scripts/stop.sh backend   # Stop backend only
#   ./scripts/stop.sh frontend  # Stop frontend only
#   ./scripts/stop.sh --volumes # Stop and remove volumes (DATA LOSS!)

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SERVICE="$1"

echo "=========================================="
echo "  Inventory Manager - Stop"
echo "=========================================="
echo ""

if [ "$SERVICE" == "--volumes" ]; then
    echo -e "${RED}WARNING: This will delete all data including the database!${NC}"
    read -p "Are you sure? Type 'yes' to confirm: " confirm
    if [ "$confirm" == "yes" ]; then
        echo -e "${YELLOW}Stopping all services and removing volumes...${NC}"
        docker-compose down -v
        echo -e "${GREEN}All services stopped and volumes removed.${NC}"
    else
        echo "Cancelled."
        exit 0
    fi
elif [ -z "$SERVICE" ]; then
    echo -e "${YELLOW}Stopping all services...${NC}"
    docker-compose down
    echo -e "${GREEN}All services stopped.${NC}"
else
    echo -e "${YELLOW}Stopping $SERVICE...${NC}"
    docker-compose stop "$SERVICE"
    echo -e "${GREEN}$SERVICE stopped.${NC}"
fi
