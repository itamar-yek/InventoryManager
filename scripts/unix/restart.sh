#!/bin/bash
# =============================================================================
# Restart Script - Inventory Manager
# =============================================================================
# Restart all or specific services.
#
# Usage:
#   ./scripts/restart.sh           # Restart all services
#   ./scripts/restart.sh db        # Restart database only
#   ./scripts/restart.sh backend   # Restart backend only
#   ./scripts/restart.sh frontend  # Restart frontend only

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE="$1"

echo "=========================================="
echo "  Inventory Manager - Restart"
echo "=========================================="
echo ""

if [ -z "$SERVICE" ]; then
    echo -e "${YELLOW}Restarting all services...${NC}"
    docker-compose restart
    echo ""
    echo -e "${GREEN}All services restarted!${NC}"
else
    echo -e "${YELLOW}Restarting $SERVICE...${NC}"
    docker-compose restart "$SERVICE"
    echo ""
    echo -e "${GREEN}$SERVICE restarted!${NC}"
fi

# Wait a moment for services to initialize
sleep 2

# Show status
echo ""
echo "Current status:"
docker-compose ps
