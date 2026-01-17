#!/bin/bash
# =============================================================================
# Start Script - Inventory Manager
# =============================================================================
# Start all or specific services.
#
# Usage:
#   ./scripts/start.sh           # Start all services
#   ./scripts/start.sh db        # Start database only
#   ./scripts/start.sh backend   # Start backend only
#   ./scripts/start.sh frontend  # Start frontend only

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE="$1"

echo "=========================================="
echo "  Inventory Manager - Start"
echo "=========================================="
echo ""

if [ -z "$SERVICE" ]; then
    echo -e "${YELLOW}Starting all services...${NC}"
    docker-compose up -d
    echo ""
    echo -e "${GREEN}All services started!${NC}"
else
    echo -e "${YELLOW}Starting $SERVICE...${NC}"
    docker-compose up -d "$SERVICE"
    echo ""
    echo -e "${GREEN}$SERVICE started!${NC}"
fi

echo ""
echo "Run './scripts/status.sh' to check service status"
echo "Run './scripts/logs.sh' to view logs"
