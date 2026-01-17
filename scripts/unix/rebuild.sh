#!/bin/bash
# =============================================================================
# Rebuild Script - Inventory Manager
# =============================================================================
# Rebuild Docker images and restart services.
#
# Usage:
#   ./scripts/rebuild.sh           # Rebuild all services
#   ./scripts/rebuild.sh backend   # Rebuild backend only
#   ./scripts/rebuild.sh frontend  # Rebuild frontend only
#   ./scripts/rebuild.sh --clean   # Full rebuild (no cache)

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE="$1"

echo "=========================================="
echo "  Inventory Manager - Rebuild"
echo "=========================================="
echo ""

if [ "$SERVICE" == "--clean" ]; then
    echo -e "${YELLOW}Full rebuild without cache...${NC}"
    docker-compose build --no-cache
    docker-compose up -d
elif [ -z "$SERVICE" ]; then
    echo -e "${YELLOW}Rebuilding all services...${NC}"
    docker-compose build
    docker-compose up -d
else
    echo -e "${YELLOW}Rebuilding $SERVICE...${NC}"
    docker-compose build "$SERVICE"
    docker-compose up -d "$SERVICE"
fi

echo ""
echo -e "${GREEN}Rebuild complete!${NC}"
echo ""

# Show status
docker-compose ps
