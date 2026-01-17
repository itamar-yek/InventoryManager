#!/bin/bash
# =============================================================================
# Health Check Script - Inventory Manager
# =============================================================================
# Perform health checks on all services. Useful for monitoring.
# Returns exit code 0 if all services healthy, 1 otherwise.
#
# Usage:
#   ./scripts/health-check.sh           # Check all services
#   ./scripts/health-check.sh --quiet   # Quiet mode (exit code only)

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

QUIET=false
if [ "$1" == "--quiet" ] || [ "$1" == "-q" ]; then
    QUIET=true
fi

HEALTHY=true

# Check database
if docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
    [ "$QUIET" = false ] && echo "DB: OK"
else
    [ "$QUIET" = false ] && echo "DB: FAIL"
    HEALTHY=false
fi

# Check backend
if docker-compose exec -T backend curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
    [ "$QUIET" = false ] && echo "Backend: OK"
else
    [ "$QUIET" = false ] && echo "Backend: FAIL"
    HEALTHY=false
fi

# Check frontend
if docker-compose exec -T frontend wget -q --spider http://localhost/health 2>/dev/null; then
    [ "$QUIET" = false ] && echo "Frontend: OK"
else
    [ "$QUIET" = false ] && echo "Frontend: FAIL"
    HEALTHY=false
fi

if [ "$HEALTHY" = true ]; then
    [ "$QUIET" = false ] && echo ""
    [ "$QUIET" = false ] && echo "All services healthy!"
    exit 0
else
    [ "$QUIET" = false ] && echo ""
    [ "$QUIET" = false ] && echo "Some services are unhealthy!"
    exit 1
fi
