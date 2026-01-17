#!/bin/bash
# =============================================================================
# Restore Script - Inventory Manager
# =============================================================================
# Restores database and uploads from a backup archive.
#
# Usage:
#   ./scripts/restore.sh backup_file.tar.gz

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

BACKUP_DIR="$PROJECT_ROOT/backups"

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

# -----------------------------------------------------------------------------
# Validate input
# -----------------------------------------------------------------------------
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists (allow both full path and relative to backups dir)
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_PATH="$BACKUP_FILE"
elif [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
else
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=========================================="
echo "  Inventory Manager - Restore"
echo "=========================================="
echo ""
echo "Backup file: $BACKUP_PATH"
echo ""

# -----------------------------------------------------------------------------
# Confirmation
# -----------------------------------------------------------------------------
log_warn "WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# -----------------------------------------------------------------------------
# Extract backup
# -----------------------------------------------------------------------------
echo ""
echo "Extracting backup..."
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_PATH" -C "$TEMP_DIR"
BACKUP_NAME=$(ls "$TEMP_DIR")
EXTRACTED_PATH="$TEMP_DIR/$BACKUP_NAME"
log_step "Backup extracted"

# -----------------------------------------------------------------------------
# Restore database
# -----------------------------------------------------------------------------
if [ -f "$EXTRACTED_PATH/database.sql" ]; then
    echo "Restoring database..."

    # Drop and recreate database
    docker-compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS inventory;"
    docker-compose exec -T db psql -U postgres -c "CREATE DATABASE inventory;"

    # Restore from backup
    docker-compose exec -T db psql -U postgres -d inventory < "$EXTRACTED_PATH/database.sql"

    log_step "Database restored"
else
    log_error "database.sql not found in backup"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# -----------------------------------------------------------------------------
# Restore uploads
# -----------------------------------------------------------------------------
if [ -d "$EXTRACTED_PATH/uploads" ]; then
    echo "Restoring uploads..."
    rm -rf "$PROJECT_ROOT/uploads"
    cp -r "$EXTRACTED_PATH/uploads" "$PROJECT_ROOT/"
    log_step "Uploads restored"
else
    log_warn "No uploads in backup"
fi

# -----------------------------------------------------------------------------
# Cleanup
# -----------------------------------------------------------------------------
rm -rf "$TEMP_DIR"

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "=========================================="
echo "  Restore Complete!"
echo "=========================================="
echo ""
echo "The database and uploads have been restored from:"
echo "  $BACKUP_PATH"
echo ""
echo "Please verify the application is working correctly."
echo ""
