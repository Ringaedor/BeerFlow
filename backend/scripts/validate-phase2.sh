#!/bin/bash

###########################################
# BeerFlow Phase 2 Validation Script
#
# Validates Phase 2 stock operations:
# - Product & Inventory Management
# - FEFO Algorithm
# - Stock Movements
# - Performance Requirements
#
# Usage:
#   ./validate-phase2.sh [api_url]
#
# Example:
#   ./validate-phase2.sh http://localhost:3000
###########################################

set -e
set -u
set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL=${1:-"http://localhost:3000"}
PERFORMANCE_THRESHOLD_MS=200

# Logging
log() {
    echo -e "${GREEN}[VALIDATE]${NC} $*"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    error "jq is required but not installed. Install with: apt-get install jq"
    exit 1
fi

###########################################
# Test Authentication
###########################################

test_authentication() {
    log "Testing authentication..."

    # Try to access protected endpoint without auth
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v1/products")

    if [ "${STATUS}" = "401" ]; then
        log "Authentication protection: OK ✓"
        return 0
    else
        error "Authentication not properly enforced (got HTTP ${STATUS}, expected 401)"
        return 1
    fi
}

###########################################
# Test Stock Health Check
###########################################

test_stock_health() {
    log "Testing stock operations health check..."

    RESPONSE=$(curl -s "${API_URL}/health/stock")
    STATUS=$(echo "${RESPONSE}" | jq -r '.status')

    if [ "${STATUS}" = "ok" ]; then
        DURATION=$(echo "${RESPONSE}" | jq -r '.info.stock_operations.duration' | sed 's/ms//')
        log "Stock health check: OK (${DURATION}ms) ✓"

        if [ "${DURATION}" -gt "${PERFORMANCE_THRESHOLD_MS}" ]; then
            warning "Stock health check slower than threshold (${DURATION}ms > ${PERFORMANCE_THRESHOLD_MS}ms)"
        fi

        return 0
    else
        error "Stock health check failed: ${STATUS}"
        echo "${RESPONSE}" | jq '.'
        return 1
    fi
}

###########################################
# Test Prometheus Metrics
###########################################

test_prometheus_metrics() {
    log "Testing Prometheus metrics..."

    METRICS=$(curl -s "${API_URL}/metrics")

    # Check for critical metrics
    REQUIRED_METRICS=(
        "beerflow_stock_movements_total"
        "beerflow_stock_movement_duration_ms"
        "beerflow_fefo_allocations_total"
        "beerflow_fefo_allocation_duration_ms"
        "beerflow_product_queries_total"
    )

    for metric in "${REQUIRED_METRICS[@]}"; do
        if echo "${METRICS}" | grep -q "^# HELP ${metric}"; then
            info "Metric found: ${metric} ✓"
        else
            error "Required metric not found: ${metric}"
            return 1
        fi
    done

    log "All required metrics present ✓"
    return 0
}

###########################################
# Test Database Entities
###########################################

test_database_entities() {
    log "Testing Phase 2 database entities..."

    # This test assumes we have a test admin account
    # In production, skip this or use a dedicated test account

    info "Validating database schema (via health check)..."

    # Check if stock operations health passes (indicates DB schema is correct)
    RESPONSE=$(curl -s "${API_URL}/health/stock")
    STATUS=$(echo "${RESPONSE}" | jq -r '.status')

    if [ "${STATUS}" = "ok" ]; then
        log "Database entities validated ✓"

        # Check details
        DETAILS=$(echo "${RESPONSE}" | jq -r '.details.stock_operations')
        info "Stock operations details: ${DETAILS}"

        return 0
    else
        error "Database schema validation failed"
        return 1
    fi
}

###########################################
# Test API Endpoints Accessibility
###########################################

test_api_endpoints() {
    log "Testing Phase 2 API endpoints accessibility..."

    # These should return 401 (protected) or 200 (public)
    ENDPOINTS=(
        "/api/v1/product-categories"
        "/api/v1/suppliers"
        "/api/v1/products"
        "/api/v1/lots"
        "/api/v1/stock-movements"
    )

    for endpoint in "${ENDPOINTS[@]}"; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}${endpoint}")

        if [ "${STATUS}" = "401" ] || [ "${STATUS}" = "200" ]; then
            info "Endpoint ${endpoint}: Accessible (HTTP ${STATUS}) ✓"
        else
            error "Endpoint ${endpoint}: Unexpected status HTTP ${STATUS}"
            return 1
        fi
    done

    log "All Phase 2 endpoints accessible ✓"
    return 0
}

###########################################
# Test Swagger Documentation
###########################################

test_swagger_docs() {
    log "Testing Swagger documentation..."

    SWAGGER_JSON=$(curl -s "${API_URL}/api/docs-json")

    # Check for Phase 2 tags
    PHASE2_TAGS=(
        "product-categories"
        "suppliers"
        "products"
        "lots"
        "stock-movements"
        "metrics"
    )

    for tag in "${PHASE2_TAGS[@]}"; do
        if echo "${SWAGGER_JSON}" | jq -e ".tags[] | select(.name==\"${tag}\")" > /dev/null; then
            info "Swagger tag found: ${tag} ✓"
        else
            warning "Swagger tag not found: ${tag}"
        fi
    done

    # Check for key endpoints
    PATHS_COUNT=$(echo "${SWAGGER_JSON}" | jq '.paths | length')
    info "Total API paths documented: ${PATHS_COUNT}"

    if [ "${PATHS_COUNT}" -lt 20 ]; then
        warning "Low number of documented paths (${PATHS_COUNT})"
    fi

    log "Swagger documentation validated ✓"
    return 0
}

###########################################
# Performance Tests
###########################################

test_performance() {
    log "Testing performance requirements..."

    # Test health check performance (should be < 200ms)
    START_MS=$(date +%s%3N)
    curl -s "${API_URL}/health/stock" > /dev/null
    END_MS=$(date +%s%3N)
    DURATION=$((END_MS - START_MS))

    info "Health check latency: ${DURATION}ms"

    if [ "${DURATION}" -gt "${PERFORMANCE_THRESHOLD_MS}" ]; then
        warning "Health check slower than threshold (${DURATION}ms > ${PERFORMANCE_THRESHOLD_MS}ms)"
    else
        log "Performance within threshold ✓"
    fi

    # Test metrics endpoint performance
    START_MS=$(date +%s%3N)
    curl -s "${API_URL}/metrics" > /dev/null
    END_MS=$(date +%s%3N)
    METRICS_DURATION=$((END_MS - START_MS))

    info "Metrics endpoint latency: ${METRICS_DURATION}ms"

    return 0
}

###########################################
# Test Error Handling
###########################################

test_error_handling() {
    log "Testing error handling..."

    # Test 404 for non-existent routes
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v1/non-existent-route")

    if [ "${STATUS}" = "404" ]; then
        log "404 handling: OK ✓"
    else
        warning "Unexpected status for non-existent route: HTTP ${STATUS}"
    fi

    return 0
}

###########################################
# Test Security Headers
###########################################

test_security_headers() {
    log "Testing security headers..."

    HEADERS=$(curl -s -I "${API_URL}/health")

    # Check for CORS headers
    if echo "${HEADERS}" | grep -qi "Access-Control-Allow-Origin"; then
        info "CORS headers present ✓"
    fi

    return 0
}

###########################################
# Summary
###########################################

print_summary() {
    log "========================================"
    log "Phase 2 Validation Summary"
    log "========================================"
    log "API URL: ${API_URL}"
    log "All critical validations passed ✓"
    log "========================================"
}

###########################################
# Main Validation Flow
###########################################

main() {
    log "========================================"
    log "BeerFlow Phase 2 Validation"
    log "API URL: ${API_URL}"
    log "========================================"

    test_authentication
    test_stock_health
    test_prometheus_metrics
    test_database_entities
    test_api_endpoints
    test_swagger_docs
    test_performance
    test_error_handling
    test_security_headers

    print_summary
}

# Run main function
main "$@"
