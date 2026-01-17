#!/bin/bash
# =============================================================================
# Cleanup Script - Inventory Manager
# =============================================================================
# Clean up Docker resources and old files.
#
# Usage:
#   ./scripts/cleanup.sh              # Clean Docker resources
#   ./scripts/cleanup.sh --backups    # Also clean old backups (keeps last 7)
#   ./scripts/cleanup.sh --all        # Full cleanup including logs

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  Inventory Manager - Cleanup"
echo "=========================================="
echo ""

# Docker cleanup
echo -e "${YELLOW}Cleaning up Docker resources...${NC}"

# Remove dangling images
echo "  Removing dangling images..."
docker image prune -f 2>/dev/null || true

# Remove unused networks
echo "  Removing unused networks..."
docker network prune -f 2>/dev/null || true

# Remove build cache
echo "  Cleaning build cache..."
docker builder prune -f 2>/dev/null || true

echo -e "${GREEN}Docker cleanup complete!${NC}"
echo ""

# Backup cleanup
if [ "$1" == "--backups" ] || [ "$1" == "--all" ]; then
    BACKUP_DIR="$PROJECT_ROOT/backups"
    KEEP=7

    if [ -d "$BACKUP_DIR" ]; then
        echo -e "${YELLOW}Cleaning old backups (keeping last $KEEP)...${NC}"

        COUNT=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
        if [ "$COUNT" -gt "$KEEP" ]; then
            ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read file; do
                echo "  Removing: $(basename "$file")"
                rm -f "$file"
            done
            echo -e "${GREEN}Removed $((COUNT - KEEP)) old backup(s)${NC}"
        else
            echo "  No old backups to remove (have $COUNT, keeping $KEEP)"
        fi
    fi
    echo ""
fi

# Log cleanup
if [ "$1" == "--all" ]; then
    LOG_DIR="$PROJECT_ROOT/logs"

    if [ -d "$LOG_DIR" ]; then
        echo -e "${YELLOW}Cleaning old log files...${NC}"
        find "$LOG_DIR" -type f -name "*.log" -mtime +30 -delete 2>/dev/null || true
        echo -e "${GREEN}Old logs cleaned!${NC}"
    fi
    echo ""
fi

# Show disk usage
echo "Current disk usage:"
echo "-------------------"
du -sh "$PROJECT_ROOT" 2>/dev/null || true
echo ""
docker system df 2>/dev/null || true
