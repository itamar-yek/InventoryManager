#!/bin/bash
# =============================================================================
# Status Script - Inventory Manager
# =============================================================================
# Check the status of all services and perform health checks.
#
# Usage:
#   ./scripts/status.sh

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Inventory Manager - Status"
echo "=========================================="
echo ""

# Docker Compose status
echo "Container Status:"
echo "-----------------"
docker-compose ps
echo ""

# Health checks
echo "Health Checks:"
echo "--------------"

# Database health
echo -n "Database:  "
if docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} PostgreSQL is ready"
else
    echo -e "${RED}[FAIL]${NC} PostgreSQL is not responding"
fi

# Backend health
echo -n "Backend:   "
if docker-compose exec -T backend curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} FastAPI is responding"
else
    echo -e "${RED}[FAIL]${NC} Backend is not responding"
fi

# Frontend health
echo -n "Frontend:  "
if docker-compose exec -T frontend wget -q --spider http://localhost/health 2>/dev/null; then
    echo -e "${GREEN}[OK]${NC} Nginx is responding"
else
    echo -e "${RED}[FAIL]${NC} Frontend is not responding"
fi

echo ""

# Resource usage
echo "Resource Usage:"
echo "---------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep -E "(NAME|inventory)" || echo "Unable to get stats"

echo ""

# Disk usage
echo "Disk Usage:"
echo "-----------"
echo "Docker volumes:"
docker system df -v 2>/dev/null | grep -E "(inventory|VOLUME)" | head -10 || echo "Unable to get disk info"

echo ""

# Get frontend port from .env or default
FRONTEND_PORT=$(grep -E "^FRONTEND_PORT=" .env 2>/dev/null | cut -d= -f2 || echo "80")

echo "Access URLs:"
echo "------------"
echo "  Web UI:   http://localhost:${FRONTEND_PORT}"
echo "  API Docs: http://localhost:${FRONTEND_PORT}/api/docs"
echo "  Health:   http://localhost:${FRONTEND_PORT}/api/health"
echo ""
