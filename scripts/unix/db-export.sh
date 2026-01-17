#!/bin/bash
# =============================================================================
# Database Export Script - Inventory Manager
# =============================================================================
# Export the database to a SQL file.
#
# Usage:
#   ./scripts/db-export.sh                    # Output to stdout
#   ./scripts/db-export.sh > backup.sql       # Save to file
#   ./scripts/db-export.sh --data-only        # Export data only (no schema)

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

if [ "$1" == "--data-only" ]; then
    docker-compose exec -T db pg_dump -U postgres --data-only inventory
else
    docker-compose exec -T db pg_dump -U postgres inventory
fi
