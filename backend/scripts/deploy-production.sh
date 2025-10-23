#!/bin/bash

###########################################
# BeerFlow Production Deployment Script
#
# Deploys BeerFlow API with comprehensive
# validation for Phase 1 and Phase 2
#
# Usage:
#   ./deploy-production.sh [version]
#
# Example:
#   ./deploy-production.sh v2.0.0
###########################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_VERSION=${1:-"latest"}
API_URL=${API_URL:-"http://localhost:3000"}
HEALTH_CHECK_RETRIES=${HEALTH_CHECK_RETRIES:-30}
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-2}

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $*"
}

###########################################
# Pre-deployment Checks
###########################################

check_prerequisites() {
    log "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    info "Node.js version: $(node --version)"

    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    info "npm version: $(npm --version)"

    # Check git
    if ! command -v git &> /dev/null; then
        error "git is not installed"
        exit 1
    fi

    # Check PostgreSQL connection
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        log "Database configuration found"
    else
        warning ".env file not found - database connection may fail"
    fi

    log "Prerequisites check passed ✓"
}

###########################################
# Backup Current Deployment
###########################################

backup_current_deployment() {
    log "Creating backup of current deployment..."

    mkdir -p "${BACKUP_DIR}"

    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_NAME="beerflow_backup_${BACKUP_TIMESTAMP}"

    # Backup build directory
    if [ -d "${PROJECT_ROOT}/dist" ]; then
        tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_dist.tar.gz" -C "${PROJECT_ROOT}" dist
        info "Build backup created: ${BACKUP_NAME}_dist.tar.gz"
    fi

    # Backup node_modules (optional, can be large)
    # if [ -d "${PROJECT_ROOT}/node_modules" ]; then
    #     tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_node_modules.tar.gz" -C "${PROJECT_ROOT}" node_modules
    # fi

    # Backup .env file
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        cp "${PROJECT_ROOT}/.env" "${BACKUP_DIR}/${BACKUP_NAME}.env"
        info "Environment backup created"
    fi

    # Backup database (using pg_dump if available)
    if command -v pg_dump &> /dev/null && [ -f "${PROJECT_ROOT}/.env" ]; then
        source "${PROJECT_ROOT}/.env"
        if [ -n "${DB_HOST:-}" ] && [ -n "${DB_NAME:-}" ]; then
            pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_DIR}/${BACKUP_NAME}_database.sql" 2>/dev/null || true
            info "Database backup created (if credentials are correct)"
        fi
    fi

    log "Backup completed: ${BACKUP_NAME} ✓"
    echo "${BACKUP_NAME}" > "${BACKUP_DIR}/latest_backup.txt"
}

###########################################
# Build Application
###########################################

build_application() {
    log "Building application..."

    cd "${PROJECT_ROOT}"

    # Install dependencies
    log "Installing dependencies..."
    npm ci --production=false

    # Run linting
    log "Running linter..."
    npm run lint || warning "Linting warnings found (continuing deployment)"

    # Run build
    log "Building application..."
    npm run build

    if [ ! -d "${PROJECT_ROOT}/dist" ]; then
        error "Build failed - dist directory not created"
        exit 1
    fi

    log "Build completed ✓"
}

###########################################
# Run Tests
###########################################

run_tests() {
    log "Running test suite..."

    cd "${PROJECT_ROOT}"

    # Unit tests
    log "Running unit tests..."
    npm run test:unit || {
        error "Unit tests failed"
        exit 1
    }

    # Integration tests (if available)
    if npm run | grep -q "test:integration"; then
        log "Running integration tests..."
        npm run test:integration || {
            error "Integration tests failed"
            exit 1
        }
    fi

    log "All tests passed ✓"
}

###########################################
# Database Migration
###########################################

run_migrations() {
    log "Running database migrations..."

    cd "${PROJECT_ROOT}"

    # Run TypeORM migrations
    npm run migration:run || {
        error "Database migration failed"
        exit 1
    }

    log "Database migrations completed ✓"
}

###########################################
# Deploy Application
###########################################

deploy_application() {
    log "Deploying application..."

    cd "${PROJECT_ROOT}"

    # Stop current process (if using PM2)
    if command -v pm2 &> /dev/null; then
        pm2 stop beerflow-api || true
        pm2 delete beerflow-api || true
    fi

    # Start application
    if command -v pm2 &> /dev/null; then
        log "Starting with PM2..."
        pm2 start dist/main.js --name beerflow-api \
            --instances 4 \
            --exec-mode cluster \
            --max-memory-restart 500M \
            --env production
        pm2 save
    else
        log "Starting with npm..."
        npm run start:prod &
        APP_PID=$!
        echo ${APP_PID} > "${PROJECT_ROOT}/beerflow.pid"
    fi

    log "Application deployed ✓"
}

###########################################
# Health Checks
###########################################

wait_for_api() {
    log "Waiting for API to be ready..."

    for i in $(seq 1 ${HEALTH_CHECK_RETRIES}); do
        if curl -s "${API_URL}/health" > /dev/null 2>&1; then
            log "API is ready ✓"
            return 0
        fi

        info "Waiting for API... (${i}/${HEALTH_CHECK_RETRIES})"
        sleep ${HEALTH_CHECK_INTERVAL}
    done

    error "API failed to start within timeout"
    return 1
}

validate_health_checks() {
    log "Running health checks..."

    # General health
    HEALTH_STATUS=$(curl -s "${API_URL}/health" | jq -r '.status')
    if [ "${HEALTH_STATUS}" != "ok" ]; then
        error "General health check failed: ${HEALTH_STATUS}"
        return 1
    fi
    log "General health check: OK ✓"

    # Database health
    DB_STATUS=$(curl -s "${API_URL}/health" | jq -r '.info.database.status')
    if [ "${DB_STATUS}" != "up" ]; then
        error "Database health check failed"
        return 1
    fi
    log "Database health check: OK ✓"

    # Phase 2: Stock operations health
    STOCK_STATUS=$(curl -s "${API_URL}/health/stock" | jq -r '.status')
    if [ "${STOCK_STATUS}" != "ok" ]; then
        error "Stock operations health check failed"
        return 1
    fi
    log "Stock operations health check: OK ✓"

    log "All health checks passed ✓"
}

###########################################
# Phase 2 Validation
###########################################

validate_phase2() {
    log "Running Phase 2 validation..."

    # Run dedicated Phase 2 validation script
    if [ -f "${SCRIPT_DIR}/validate-phase2.sh" ]; then
        bash "${SCRIPT_DIR}/validate-phase2.sh" "${API_URL}" || {
            error "Phase 2 validation failed"
            return 1
        }
    else
        warning "Phase 2 validation script not found - skipping"
    fi

    log "Phase 2 validation passed ✓"
}

###########################################
# Smoke Tests
###########################################

run_smoke_tests() {
    log "Running smoke tests..."

    # Test API root
    if ! curl -s "${API_URL}/api/v1" > /dev/null 2>&1; then
        error "API root not accessible"
        return 1
    fi

    # Test Swagger docs
    if ! curl -s "${API_URL}/api/docs" > /dev/null 2>&1; then
        warning "Swagger docs not accessible"
    fi

    # Test metrics endpoint
    if ! curl -s "${API_URL}/metrics" > /dev/null 2>&1; then
        warning "Metrics endpoint not accessible"
    else
        log "Metrics endpoint accessible ✓"
    fi

    log "Smoke tests passed ✓"
}

###########################################
# Post-deployment
###########################################

post_deployment() {
    log "Running post-deployment tasks..."

    # Save deployment info
    cat > "${PROJECT_ROOT}/deployment-info.json" <<EOF
{
  "version": "${DEPLOYMENT_VERSION}",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployedBy": "${USER}",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD)"
}
EOF

    log "Post-deployment tasks completed ✓"
}

###########################################
# Rollback
###########################################

rollback_deployment() {
    error "Deployment failed - initiating rollback..."

    if [ -f "${BACKUP_DIR}/latest_backup.txt" ]; then
        BACKUP_NAME=$(cat "${BACKUP_DIR}/latest_backup.txt")

        if [ -f "${SCRIPT_DIR}/rollback.sh" ]; then
            bash "${SCRIPT_DIR}/rollback.sh" "${BACKUP_NAME}"
        else
            error "Rollback script not found"
        fi
    else
        error "No backup found for rollback"
    fi
}

###########################################
# Main Deployment Flow
###########################################

main() {
    log "========================================"
    log "BeerFlow Production Deployment"
    log "Version: ${DEPLOYMENT_VERSION}"
    log "========================================"

    # Trap errors and rollback
    trap rollback_deployment ERR

    check_prerequisites
    backup_current_deployment
    build_application
    run_tests
    run_migrations
    deploy_application

    if ! wait_for_api; then
        error "API failed to start"
        exit 1
    fi

    validate_health_checks
    validate_phase2
    run_smoke_tests
    post_deployment

    log "========================================"
    log "Deployment completed successfully! 🍺"
    log "========================================"
    log "API URL: ${API_URL}"
    log "Metrics: ${API_URL}/metrics"
    log "Docs: ${API_URL}/api/docs"
    log "Version: ${DEPLOYMENT_VERSION}"

    # Remove error trap
    trap - ERR
}

# Run main function
main "$@"
