#!/bin/bash

###########################################
# BeerFlow Production Readiness Validation
#
# Comprehensive validation checklist for
# production deployment readiness
#
# Validates:
# - Phase 1: Authentication & Users
# - Phase 2: Product & Inventory
# - Infrastructure: Database, Security
# - Monitoring: Metrics, Health Checks
# - Performance: Benchmarks, Thresholds
#
# Usage:
#   ./production-readiness.sh [api_url]
#
# Example:
#   ./production-readiness.sh http://localhost:3000
###########################################

set -e
set -u
set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
API_URL=${1:-"http://localhost:3000"}
REPORT_FILE="production-readiness-report-$(date +%Y%m%d_%H%M%S).txt"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging
log() {
    echo -e "${GREEN}[✓]${NC} $*"
    echo "[PASS] $*" >> "${REPORT_FILE}"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

error() {
    echo -e "${RED}[✗]${NC} $*"
    echo "[FAIL] $*" >> "${REPORT_FILE}"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

warning() {
    echo -e "${YELLOW}[!]${NC} $*"
    echo "[WARN] $*" >> "${REPORT_FILE}"
    ((WARNING_CHECKS++))
    ((TOTAL_CHECKS++))
}

info() {
    echo -e "${BLUE}[i]${NC} $*"
}

section() {
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$*${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "" | tee -a "${REPORT_FILE}"
    echo "=== $* ===" >> "${REPORT_FILE}"
}

# Check dependencies
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        error "curl is not installed"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        error "jq is not installed (required for JSON parsing)"
        exit 1
    fi
}

###########################################
# Phase 1 Validation
###########################################

validate_phase1() {
    section "Phase 1: Core Backend Foundation"

    # Authentication endpoints
    info "Checking authentication endpoints..."

    # Login should return 401 without credentials
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v1/auth/login" -X POST)
    if [ "${STATUS}" = "400" ] || [ "${STATUS}" = "401" ]; then
        log "Authentication endpoint accessible"
    else
        error "Authentication endpoint unexpected status: ${STATUS}"
    fi

    # Protected routes should require authentication
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v1/users")
    if [ "${STATUS}" = "401" ]; then
        log "Protected routes require authentication"
    else
        error "Protected routes not properly secured (got ${STATUS}, expected 401)"
    fi

    # Venues endpoint
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v1/venues")
    if [ "${STATUS}" = "401" ]; then
        log "Venues endpoint protected"
    else
        warning "Venues endpoint security check failed (status: ${STATUS})"
    fi
}

###########################################
# Phase 2 Validation
###########################################

validate_phase2() {
    section "Phase 2: Product & Inventory Management"

    # Product endpoints
    info "Checking product management endpoints..."

    PHASE2_ENDPOINTS=(
        "/api/v1/product-categories"
        "/api/v1/suppliers"
        "/api/v1/products"
        "/api/v1/lots"
        "/api/v1/stock-movements"
    )

    for endpoint in "${PHASE2_ENDPOINTS[@]}"; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}${endpoint}")
        if [ "${STATUS}" = "401" ]; then
            log "Endpoint ${endpoint} properly protected"
        else
            error "Endpoint ${endpoint} security issue (status: ${STATUS})"
        fi
    done

    # Stock health check
    info "Checking stock operations health..."
    STOCK_HEALTH=$(curl -s "${API_URL}/health/stock")
    STOCK_STATUS=$(echo "${STOCK_HEALTH}" | jq -r '.status')

    if [ "${STOCK_STATUS}" = "ok" ]; then
        DURATION=$(echo "${STOCK_HEALTH}" | jq -r '.info.stock_operations.duration' | sed 's/ms//')
        log "Stock operations health check passed (${DURATION}ms)"

        if [ "${DURATION}" -gt 200 ]; then
            warning "Stock health check latency high (${DURATION}ms > 200ms threshold)"
        fi
    else
        error "Stock operations health check failed"
    fi
}

###########################################
# Database Validation
###########################################

validate_database() {
    section "Database Connectivity & Schema"

    # Database health check
    info "Checking database connection..."
    HEALTH=$(curl -s "${API_URL}/health")
    DB_STATUS=$(echo "${HEALTH}" | jq -r '.info.database.status')

    if [ "${DB_STATUS}" = "up" ]; then
        log "Database connection healthy"
    else
        error "Database connection failed"
    fi

    # Check database details
    DB_DETAILS=$(echo "${HEALTH}" | jq -r '.details.database')
    info "Database details: ${DB_DETAILS}"
}

###########################################
# Security Validation
###########################################

validate_security() {
    section "Security Configuration"

    # JWT authentication
    info "Checking JWT authentication..."

    # Try accessing protected endpoint
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v1/products")
    if [ "${STATUS}" = "401" ]; then
        log "JWT authentication enforced"
    else
        error "JWT authentication not properly configured"
    fi

    # CORS configuration
    info "Checking CORS headers..."
    HEADERS=$(curl -s -I "${API_URL}/health")

    if echo "${HEADERS}" | grep -qi "Access-Control-Allow-Origin"; then
        log "CORS headers configured"
    else
        warning "CORS headers not detected"
    fi

    # Environment variables
    info "Checking for .env file..."
    if [ -f ".env" ]; then
        log ".env file exists"

        # Check for sensitive data exposure
        if grep -q "JWT_SECRET" .env 2>/dev/null; then
            log "JWT_SECRET configured"
        else
            error "JWT_SECRET not found in .env"
        fi

        if grep -q "DB_PASSWORD" .env 2>/dev/null; then
            log "DB_PASSWORD configured"
        else
            warning "DB_PASSWORD not found in .env"
        fi
    else
        error ".env file not found"
    fi
}

###########################################
# Monitoring Validation
###########################################

validate_monitoring() {
    section "Monitoring & Observability"

    # Prometheus metrics
    info "Checking Prometheus metrics..."
    METRICS=$(curl -s "${API_URL}/metrics")

    if [ -n "${METRICS}" ]; then
        log "Prometheus metrics endpoint accessible"

        # Check for critical metrics
        CRITICAL_METRICS=(
            "beerflow_stock_movements_total"
            "beerflow_fefo_allocations_total"
            "beerflow_product_queries_total"
        )

        for metric in "${CRITICAL_METRICS[@]}"; do
            if echo "${METRICS}" | grep -q "${metric}"; then
                log "Metric present: ${metric}"
            else
                error "Critical metric missing: ${metric}"
            fi
        done
    else
        error "Prometheus metrics endpoint not accessible"
    fi

    # Health checks
    info "Checking health endpoints..."

    HEALTH_ENDPOINTS=(
        "/health"
        "/health/ready"
        "/health/live"
        "/health/stock"
    )

    for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}${endpoint}")
        if [ "${STATUS}" = "200" ]; then
            log "Health endpoint ${endpoint} accessible"
        else
            error "Health endpoint ${endpoint} failed (status: ${STATUS})"
        fi
    done
}

###########################################
# Performance Validation
###########################################

validate_performance() {
    section "Performance Requirements"

    # API response time
    info "Testing API performance..."

    START=$(date +%s%3N)
    curl -s "${API_URL}/health" > /dev/null
    END=$(date +%s%3N)
    DURATION=$((END - START))

    if [ "${DURATION}" -lt 100 ]; then
        log "Health check performance excellent (${DURATION}ms < 100ms)"
    elif [ "${DURATION}" -lt 200 ]; then
        log "Health check performance good (${DURATION}ms < 200ms)"
    else
        warning "Health check performance slow (${DURATION}ms >= 200ms)"
    fi

    # Stock health check performance
    START=$(date +%s%3N)
    curl -s "${API_URL}/health/stock" > /dev/null
    END=$(date +%s%3N)
    STOCK_DURATION=$((END - START))

    if [ "${STOCK_DURATION}" -lt 200 ]; then
        log "Stock health check performance good (${STOCK_DURATION}ms < 200ms)"
    else
        warning "Stock health check performance slow (${STOCK_DURATION}ms >= 200ms)"
    fi

    # Metrics endpoint performance
    START=$(date +%s%3N)
    curl -s "${API_URL}/metrics" > /dev/null
    END=$(date +%s%3N)
    METRICS_DURATION=$((END - START))

    info "Metrics endpoint latency: ${METRICS_DURATION}ms"
}

###########################################
# Documentation Validation
###########################################

validate_documentation() {
    section "Documentation & API Specs"

    # Swagger/OpenAPI
    info "Checking Swagger documentation..."

    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/docs")
    if [ "${STATUS}" = "200" ]; then
        log "Swagger documentation accessible"
    else
        error "Swagger documentation not accessible (status: ${STATUS})"
    fi

    # Check Swagger JSON
    SWAGGER=$(curl -s "${API_URL}/api/docs-json")
    if [ -n "${SWAGGER}" ]; then
        PATHS=$(echo "${SWAGGER}" | jq '.paths | length')
        log "API paths documented: ${PATHS}"

        if [ "${PATHS}" -lt 20 ]; then
            warning "Low number of documented paths (${PATHS})"
        fi
    else
        error "Swagger JSON not available"
    fi

    # README files
    info "Checking documentation files..."

    if [ -f "README.md" ]; then
        log "README.md exists"
    else
        warning "README.md not found"
    fi

    if [ -f "PHASE_2.md" ]; then
        log "PHASE_2.md documentation exists"
    else
        warning "PHASE_2.md not found"
    fi

    if [ -f "monitoring/README.md" ]; then
        log "Monitoring documentation exists"
    else
        warning "Monitoring README not found"
    fi
}

###########################################
# Build & Dependencies
###########################################

validate_build() {
    section "Build & Dependencies"

    # Check dist directory
    if [ -d "dist" ]; then
        log "Build directory exists"

        DIST_FILES=$(find dist -type f | wc -l)
        info "Compiled files: ${DIST_FILES}"
    else
        error "Build directory not found - run 'npm run build'"
    fi

    # Check node_modules
    if [ -d "node_modules" ]; then
        log "Dependencies installed"
    else
        warning "node_modules not found - run 'npm install'"
    fi

    # Check package.json scripts
    info "Checking npm scripts..."

    REQUIRED_SCRIPTS=(
        "start"
        "start:prod"
        "build"
        "test"
    )

    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if npm run | grep -q "${script}"; then
            log "Script exists: ${script}"
        else
            error "Required script missing: ${script}"
        fi
    done
}

###########################################
# Environment Configuration
###########################################

validate_environment() {
    section "Environment Configuration"

    if [ ! -f ".env" ]; then
        error ".env file not found"
        return
    fi

    # Check required environment variables
    REQUIRED_VARS=(
        "NODE_ENV"
        "PORT"
        "DB_HOST"
        "DB_PORT"
        "DB_NAME"
        "DB_USER"
        "JWT_SECRET"
    )

    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            log "Environment variable set: ${var}"
        else
            error "Required environment variable missing: ${var}"
        fi
    done

    # Check NODE_ENV
    NODE_ENV=$(grep "^NODE_ENV=" .env | cut -d'=' -f2)
    if [ "${NODE_ENV}" = "production" ]; then
        log "NODE_ENV set to production"
    else
        warning "NODE_ENV is '${NODE_ENV}' (should be 'production' for prod deployment)"
    fi
}

###########################################
# Test Coverage
###########################################

validate_tests() {
    section "Test Coverage"

    info "Checking test files..."

    # Unit tests
    UNIT_TESTS=$(find src -name "*.spec.ts" -type f | wc -l)
    info "Unit test files: ${UNIT_TESTS}"

    if [ "${UNIT_TESTS}" -gt 20 ]; then
        log "Good unit test coverage (${UNIT_TESTS} test files)"
    else
        warning "Low unit test coverage (${UNIT_TESTS} test files)"
    fi

    # E2E tests
    E2E_TESTS=$(find test -name "*.e2e-spec.ts" -type f 2>/dev/null | wc -l)
    info "E2E test files: ${E2E_TESTS}"

    if [ "${E2E_TESTS}" -gt 0 ]; then
        log "E2E tests present (${E2E_TESTS} files)"
    else
        warning "No E2E test files found"
    fi

    # Test scripts
    if npm run | grep -q "test:unit"; then
        log "Unit test script configured"
    else
        warning "test:unit script not found"
    fi

    if npm run | grep -q "test:e2e"; then
        log "E2E test script configured"
    else
        warning "test:e2e script not found"
    fi
}

###########################################
# Deployment Scripts
###########################################

validate_deployment_scripts() {
    section "Deployment Automation"

    DEPLOYMENT_SCRIPTS=(
        "scripts/deploy-production.sh"
        "scripts/validate-phase2.sh"
        "scripts/rollback.sh"
    )

    for script in "${DEPLOYMENT_SCRIPTS[@]}"; do
        if [ -f "${script}" ]; then
            if [ -x "${script}" ]; then
                log "Deployment script ready: ${script}"
            else
                warning "Deployment script not executable: ${script}"
            fi
        else
            error "Deployment script missing: ${script}"
        fi
    done

    # Check monitoring stack
    if [ -f "monitoring/docker-compose.monitoring.yml" ]; then
        log "Monitoring stack configuration exists"
    else
        warning "Monitoring stack not configured"
    fi
}

###########################################
# Generate Report
###########################################

generate_report() {
    section "Production Readiness Summary"

    echo "" | tee -a "${REPORT_FILE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "${REPORT_FILE}"
    echo "Production Readiness Report" | tee -a "${REPORT_FILE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "${REPORT_FILE}"
    echo "" | tee -a "${REPORT_FILE}"
    echo "Timestamp: $(date)" | tee -a "${REPORT_FILE}"
    echo "API URL: ${API_URL}" | tee -a "${REPORT_FILE}"
    echo "" | tee -a "${REPORT_FILE}"
    echo "Total Checks: ${TOTAL_CHECKS}" | tee -a "${REPORT_FILE}"
    echo -e "${GREEN}Passed: ${PASSED_CHECKS}${NC}" | tee -a "${REPORT_FILE}"
    echo -e "${YELLOW}Warnings: ${WARNING_CHECKS}${NC}" | tee -a "${REPORT_FILE}"
    echo -e "${RED}Failed: ${FAILED_CHECKS}${NC}" | tee -a "${REPORT_FILE}"
    echo "" | tee -a "${REPORT_FILE}"

    # Calculate percentage
    PASS_PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

    if [ "${FAILED_CHECKS}" -eq 0 ]; then
        echo -e "${GREEN}✓ READY FOR PRODUCTION${NC}" | tee -a "${REPORT_FILE}"
        echo "" | tee -a "${REPORT_FILE}"
        echo "All critical checks passed (${PASS_PERCENTAGE}%)" | tee -a "${REPORT_FILE}"

        if [ "${WARNING_CHECKS}" -gt 0 ]; then
            echo -e "${YELLOW}Note: ${WARNING_CHECKS} warnings found - review recommended${NC}" | tee -a "${REPORT_FILE}"
        fi
    else
        echo -e "${RED}✗ NOT READY FOR PRODUCTION${NC}" | tee -a "${REPORT_FILE}"
        echo "" | tee -a "${REPORT_FILE}"
        echo "${FAILED_CHECKS} critical checks failed" | tee -a "${REPORT_FILE}"
        echo "Fix the issues above before deploying to production" | tee -a "${REPORT_FILE}"
    fi

    echo "" | tee -a "${REPORT_FILE}"
    echo "Report saved to: ${REPORT_FILE}" | tee -a "${REPORT_FILE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "${REPORT_FILE}"
}

###########################################
# Main Function
###########################################

main() {
    # Initialize report
    echo "BeerFlow Production Readiness Report" > "${REPORT_FILE}"
    echo "Generated: $(date)" >> "${REPORT_FILE}"
    echo "API URL: ${API_URL}" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"

    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════╗"
    echo "║  BeerFlow Production Readiness Check    ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"

    check_dependencies

    validate_environment
    validate_build
    validate_phase1
    validate_phase2
    validate_database
    validate_security
    validate_monitoring
    validate_performance
    validate_documentation
    validate_tests
    validate_deployment_scripts

    generate_report

    # Exit code based on failures
    if [ "${FAILED_CHECKS}" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"
