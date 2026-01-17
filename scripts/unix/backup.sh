#!/bin/bash
# =============================================================================
# Backup Script - Inventory Manager
# =============================================================================
# Creates backups of database and uploads.
#
# Usage:
#   ./scripts/backup.sh              # Create backup
#   ./scripts/backup.sh --cleanup    # Create backup and clean old ones
#
# Backups are stored in ./backups directory with timestamps.

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="inventory_backup_$TIMESTAMP"

# Retention settings
DAILY_RETENTION=7
WEEKLY_RETENTION=4
MONTHLY_RETENTION=6

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_step() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

echo "=========================================="
echo "  Inventory Manager - Backup"
echo "=========================================="
echo ""
echo "Timestamp: $TIMESTAMP"
echo ""

# -----------------------------------------------------------------------------
# Create backup directory
# -----------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
mkdir -p "$BACKUP_PATH"

# -----------------------------------------------------------------------------
# Backup database
# -----------------------------------------------------------------------------
echo "Backing up database..."
docker-compose exec -T db pg_dump -U postgres inventory > "$BACKUP_PATH/database.sql"

if [ -f "$BACKUP_PATH/database.sql" ]; then
    log_step "Database backup created"
else
    log_error "Database backup failed"
    exit 1
fi

# -----------------------------------------------------------------------------
# Backup uploads (if any)
# -----------------------------------------------------------------------------
if [ -d "$PROJECT_ROOT/uploads" ] && [ "$(ls -A $PROJECT_ROOT/uploads 2>/dev/null)" ]; then
    echo "Backing up uploads..."
    cp -r "$PROJECT_ROOT/uploads" "$BACKUP_PATH/"
    log_step "Uploads backup created"
else
    log_warn "No uploads to backup"
fi

# -----------------------------------------------------------------------------
# Create archive
# -----------------------------------------------------------------------------
echo "Creating archive..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"
log_step "Archive created: $BACKUP_NAME.tar.gz"

# Calculate size
BACKUP_SIZE=$(du -h "$BACKUP_NAME.tar.gz" | cut -f1)
echo "Backup size: $BACKUP_SIZE"

# -----------------------------------------------------------------------------
# Cleanup old backups (optional)
# -----------------------------------------------------------------------------
if [ "$1" == "--cleanup" ]; then
    echo ""
    echo "Cleaning up old backups..."

    # Keep only last N daily backups
    ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -n +$((DAILY_RETENTION + 1)) | while read file; do
        echo "  Removing: $(basename "$file")"
        rm -f "$file"
    done

    log_step "Cleanup complete"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "  Backup Complete!"
echo "=========================================="
echo ""
echo "Backup location: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo "Backup size: $BACKUP_SIZE"
echo ""
echo "To restore from this backup:"
echo "  ./scripts/restore.sh $BACKUP_NAME.tar.gz"
echo ""
