#!/bin/bash
# Agent Progress Monitor
# Run this script to check the status of all running agents
# Note: This script is specific to Claude Code development sessions

echo "========================================"
echo "  INVENTORY MANAGER - AGENT MONITOR"
echo "========================================"
echo ""

# Get project root relative to script location
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Task directory is typically in /tmp/claude based on project path
# This may vary based on the Claude Code session
TASK_DIR="/tmp/claude${PROJECT_ROOT//\//-}/tasks"

# Also check common alternative locations
if [ ! -d "$TASK_DIR" ]; then
    TASK_DIR="/tmp/claude-tasks"
fi

if [ -d "$TASK_DIR" ]; then
    echo "Active Agent Tasks:"
    echo "-------------------"
    for file in "$TASK_DIR"/*.output 2>/dev/null; do
        if [ -f "$file" ]; then
            agent_id=$(basename "$file" .output)
            echo ""
            echo "Agent: $agent_id"
            echo "Last 20 lines:"
            echo "---"
            tail -20 "$file" 2>/dev/null || echo "No output yet"
            echo "---"
        fi
    done
else
    echo "No task directory found at: $TASK_DIR"
    echo "This script is designed for use during Claude Code development sessions."
fi

echo ""
echo "========================================"
echo "Project Files Created:"
echo "========================================"
cd "$PROJECT_ROOT"
find . -type f \( -name "*.py" -o -name "*.tsx" -o -name "*.ts" -o -name "*.yml" -o -name "*.json" \) 2>/dev/null | grep -v node_modules | grep -v __pycache__ | head -50

echo ""
echo "========================================"
