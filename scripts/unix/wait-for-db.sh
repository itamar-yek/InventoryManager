#!/bin/bash
# =============================================================================
# Wait for Database Script - Inventory Manager
# =============================================================================
# Wait for the database to be ready to accept connections.
#
# Usage:
#   ./scripts/wait-for-db.sh           # Wait up to 60 seconds
#   ./scripts/wait-for-db.sh 120       # Wait up to 120 seconds

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TIMEOUT="${1:-60}"
ELAPSED=0

echo "Waiting for database to be ready (timeout: ${TIMEOUT}s)..."

while [ $ELAPSED -lt $TIMEOUT ]; do
    if docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}Database is ready!${NC}"
        exit 0
    fi

    echo -e "${YELLOW}  Still waiting... (${ELAPSED}s)${NC}"
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

echo -e "${RED}Timeout waiting for database!${NC}"
exit 1
