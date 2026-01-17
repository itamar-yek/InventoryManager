#!/bin/bash
# =============================================================================
# Logs Script - Inventory Manager
# =============================================================================
# View logs from services.
#
# Usage:
#   ./scripts/logs.sh              # All logs (follow mode)
#   ./scripts/logs.sh -f           # All logs (follow mode, explicit)
#   ./scripts/logs.sh backend      # Backend logs only
#   ./scripts/logs.sh frontend     # Frontend logs only
#   ./scripts/logs.sh db           # Database logs only
#   ./scripts/logs.sh backend 100  # Last 100 lines of backend logs

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

SERVICE="$1"
LINES="$2"

# Default to follow mode if no args
if [ -z "$SERVICE" ] || [ "$SERVICE" == "-f" ]; then
    echo "Following all logs (Ctrl+C to exit)..."
    echo ""
    docker-compose logs -f
elif [ -n "$LINES" ]; then
    # Show specific number of lines
    docker-compose logs --tail="$LINES" "$SERVICE"
else
    # Follow specific service
    echo "Following $SERVICE logs (Ctrl+C to exit)..."
    echo ""
    docker-compose logs -f "$SERVICE"
fi
