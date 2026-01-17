#!/bin/bash
# =============================================================================
# Database Shell Script - Inventory Manager
# =============================================================================
# Access the PostgreSQL database shell or run queries.
#
# Usage:
#   ./scripts/db-shell.sh                    # Interactive psql shell
#   ./scripts/db-shell.sh -c "SELECT 1;"     # Run a query
#   ./scripts/db-shell.sh -f script.sql      # Run a SQL file

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

if [ "$1" == "-c" ]; then
    # Run a command
    docker-compose exec -T db psql -U postgres -d inventory -c "$2"
elif [ "$1" == "-f" ]; then
    # Run a file
    if [ -f "$2" ]; then
        docker-compose exec -T db psql -U postgres -d inventory < "$2"
    else
        echo "File not found: $2"
        exit 1
    fi
else
    # Interactive shell
    echo "Connecting to database..."
    echo "Type \\q to exit, \\dt to list tables"
    echo ""
    docker-compose exec db psql -U postgres -d inventory
fi
