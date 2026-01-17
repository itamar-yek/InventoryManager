#!/bin/bash
# Comprehensive Test Runner for Inventory Manager
# This script runs all tests and generates a report

set -e

# Get project root relative to script location
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPORT_FILE="$PROJECT_ROOT/TEST_REPORT.md"

echo "# Test Report - $(date)" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

TOTAL_PASSED=0
TOTAL_FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_section() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to run backend tests
run_backend_tests() {
    log_section "Running Backend Tests"
    echo "## Backend Tests" >> "$REPORT_FILE"

    cd "$PROJECT_ROOT/backend"

    if [ -f "requirements.txt" ]; then
        echo "Installing dependencies..."
        pip install -r requirements.txt -q 2>/dev/null || true
    fi

    if [ -d "tests" ]; then
        echo "Running pytest..."
        if python -m pytest tests/ -v --tb=short 2>&1 | tee -a "$REPORT_FILE"; then
            log_success "Backend tests passed"
            echo "- Status: PASSED" >> "$REPORT_FILE"
            ((TOTAL_PASSED++))
        else
            log_error "Backend tests failed"
            echo "- Status: FAILED" >> "$REPORT_FILE"
            ((TOTAL_FAILED++))
        fi
    else
        echo "- Status: No tests directory yet" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
}

# Function to run frontend tests
run_frontend_tests() {
    log_section "Running Frontend Tests"
    echo "## Frontend Tests" >> "$REPORT_FILE"

    cd "$PROJECT_ROOT/frontend"

    if [ -f "package.json" ]; then
        echo "Installing dependencies..."
        npm install --silent 2>/dev/null || true

        echo "Running vitest..."
        if npm test -- --run 2>&1 | tee -a "$REPORT_FILE"; then
            log_success "Frontend tests passed"
            echo "- Status: PASSED" >> "$REPORT_FILE"
            ((TOTAL_PASSED++))
        else
            log_error "Frontend tests failed"
            echo "- Status: FAILED" >> "$REPORT_FILE"
            ((TOTAL_FAILED++))
        fi
    else
        echo "- Status: No package.json yet" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
}

# Function to validate Docker configuration
validate_docker() {
    log_section "Validating Docker Configuration"
    echo "## Docker Validation" >> "$REPORT_FILE"

    cd "$PROJECT_ROOT"

    if [ -f "docker-compose.yml" ]; then
        echo "Validating docker-compose.yml..."
        if docker-compose config -q 2>/dev/null; then
            log_success "Docker Compose configuration valid"
            echo "- docker-compose.yml: Valid" >> "$REPORT_FILE"
            ((TOTAL_PASSED++))
        else
            log_error "Docker Compose configuration invalid"
            echo "- docker-compose.yml: Invalid" >> "$REPORT_FILE"
            ((TOTAL_FAILED++))
        fi
    else
        echo "- docker-compose.yml: Not created yet" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
}

# Function to check code structure
check_structure() {
    log_section "Checking Project Structure"
    echo "## Project Structure" >> "$REPORT_FILE"

    cd "$PROJECT_ROOT"

    # Check required directories
    REQUIRED_DIRS=("backend/app/models" "backend/app/api" "frontend/src/components" "frontend/src/pages" "docker")

    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            log_success "Directory exists: $dir"
            echo "- $dir: OK" >> "$REPORT_FILE"
        else
            log_error "Missing directory: $dir"
            echo "- $dir: Missing" >> "$REPORT_FILE"
        fi
    done
    echo "" >> "$REPORT_FILE"
}

# Function to run linting
run_linting() {
    log_section "Running Linters"
    echo "## Code Quality" >> "$REPORT_FILE"

    # Backend linting
    cd "$PROJECT_ROOT/backend"
    if command -v ruff &> /dev/null; then
        echo "Running ruff on backend..."
        if ruff check app/ 2>/dev/null; then
            echo "- Backend (ruff): No issues" >> "$REPORT_FILE"
        else
            echo "- Backend (ruff): Issues found" >> "$REPORT_FILE"
        fi
    fi

    # Frontend linting
    cd "$PROJECT_ROOT/frontend"
    if [ -f "package.json" ] && grep -q "eslint" package.json 2>/dev/null; then
        echo "Running eslint on frontend..."
        if npm run lint --silent 2>/dev/null; then
            echo "- Frontend (eslint): No issues" >> "$REPORT_FILE"
        else
            echo "- Frontend (eslint): Issues found" >> "$REPORT_FILE"
        fi
    fi
    echo "" >> "$REPORT_FILE"
}

# Generate summary
generate_summary() {
    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "## Summary" >> "$REPORT_FILE"
    echo "- Total Checks Passed: $TOTAL_PASSED" >> "$REPORT_FILE"
    echo "- Total Checks Failed: $TOTAL_FAILED" >> "$REPORT_FILE"
    echo "- Generated: $(date)" >> "$REPORT_FILE"

    log_section "TEST SUMMARY"
    echo -e "Passed: ${GREEN}$TOTAL_PASSED${NC}"
    echo -e "Failed: ${RED}$TOTAL_FAILED${NC}"
    echo ""
    echo "Full report: $REPORT_FILE"
}

# Main execution
main() {
    echo "Starting comprehensive test suite..."
    echo ""

    check_structure
    run_backend_tests
    run_frontend_tests
    validate_docker
    run_linting
    generate_summary

    # Exit with error if any tests failed
    if [ $TOTAL_FAILED -gt 0 ]; then
        exit 1
    fi
}

main "$@"
