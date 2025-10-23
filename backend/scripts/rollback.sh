#!/bin/bash

###########################################
# BeerFlow Rollback Script
#
# Rolls back to previous deployment
#
# Usage:
#   ./rollback.sh [backup_name]
#
# Example:
#   ./rollback.sh beerflow_backup_20241023_120000
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
BACKUP_NAME=${1:-""}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Logging
log() {
    echo -e "${GREEN}[ROLLBACK]${NC} $*"
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

###########################################
# Validation
###########################################

validate_backup() {
    if [ -z "${BACKUP_NAME}" ]; then
        if [ -f "${BACKUP_DIR}/latest_backup.txt" ]; then
            BACKUP_NAME=$(cat "${BACKUP_DIR}/latest_backup.txt")
            log "Using latest backup: ${BACKUP_NAME}"
        else
            error "No backup specified and no latest backup found"
            error "Usage: ./rollback.sh [backup_name]"
            error "Available backups:"
            ls -1 "${BACKUP_DIR}/"*_dist.tar.gz 2>/dev/null | sed 's/_dist.tar.gz//' | xargs -n1 basename || echo "  (none)"
            exit 1
        fi
    fi

    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_dist.tar.gz"

    if [ ! -f "${BACKUP_FILE}" ]; then
        error "Backup file not found: ${BACKUP_FILE}"
        error "Available backups:"
        ls -1 "${BACKUP_DIR}/"*_dist.tar.gz 2>/dev/null | sed 's/_dist.tar.gz//' | xargs -n1 basename || echo "  (none)"
        exit 1
    fi

    log "Backup file found: ${BACKUP_FILE}"
}

###########################################
# Confirmation
###########################################

confirm_rollback() {
    warning "You are about to rollback to: ${BACKUP_NAME}"
    warning "This will:"
    warning "  - Stop the current application"
    warning "  - Restore previous build files"
    warning "  - Restore previous environment configuration"
    warning "  - Restart the application"
    echo ""

    read -p "Are you sure you want to continue? (yes/no): " confirmation

    if [ "${confirmation}" != "yes" ]; then
        info "Rollback cancelled"
        exit 0
    fi
}

###########################################
# Stop Application
###########################################

stop_application() {
    log "Stopping current application..."

    if command -v pm2 &> /dev/null; then
        pm2 stop beerflow-api || true
        pm2 delete beerflow-api || true
        log "Stopped PM2 process"
    else
        if [ -f "${PROJECT_ROOT}/beerflow.pid" ]; then
            PID=$(cat "${PROJECT_ROOT}/beerflow.pid")
            if kill -0 "${PID}" 2>/dev/null; then
                kill "${PID}"
                log "Stopped process ${PID}"
                sleep 2
            fi
            rm -f "${PROJECT_ROOT}/beerflow.pid"
        fi
    fi

    log "Application stopped ✓"
}

###########################################
# Restore Backup
###########################################

restore_backup() {
    log "Restoring backup..."

    cd "${PROJECT_ROOT}"

    # Backup current state before rollback (just in case)
    if [ -d "dist" ]; then
        EMERGENCY_BACKUP="emergency_backup_$(date +%Y%m%d_%H%M%S)"
        mv dist "dist_${EMERGENCY_BACKUP}"
        info "Current dist saved as: dist_${EMERGENCY_BACKUP}"
    fi

    # Restore dist directory
    if [ -f "${BACKUP_DIR}/${BACKUP_NAME}_dist.tar.gz" ]; then
        tar -xzf "${BACKUP_DIR}/${BACKUP_NAME}_dist.tar.gz" -C "${PROJECT_ROOT}"
        log "Build files restored ✓"
    fi

    # Restore environment file
    if [ -f "${BACKUP_DIR}/${BACKUP_NAME}.env" ]; then
        cp "${PROJECT_ROOT}/.env" "${PROJECT_ROOT}/.env.backup_$(date +%Y%m%d_%H%M%S)" || true
        cp "${BACKUP_DIR}/${BACKUP_NAME}.env" "${PROJECT_ROOT}/.env"
        log "Environment file restored ✓"
    fi

    log "Backup restored ✓"
}

###########################################
# Database Rollback
###########################################

rollback_database() {
    log "Checking for database rollback..."

    DB_BACKUP="${BACKUP_DIR}/${BACKUP_NAME}_database.sql"

    if [ -f "${DB_BACKUP}" ]; then
        warning "Database backup found: ${DB_BACKUP}"
        read -p "Do you want to restore the database? (yes/no): " restore_db

        if [ "${restore_db}" = "yes" ]; then
            if [ -f "${PROJECT_ROOT}/.env" ]; then
                source "${PROJECT_ROOT}/.env"

                if command -v psql &> /dev/null; then
                    log "Restoring database..."
                    psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" < "${DB_BACKUP}"
                    log "Database restored ✓"
                else
                    error "psql not found - cannot restore database automatically"
                    info "Restore manually with: psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} < ${DB_BACKUP}"
                fi
            else
                error ".env file not found - cannot restore database"
            fi
        else
            info "Database rollback skipped"
        fi
    else
        info "No database backup found - skipping database rollback"
    fi
}

###########################################
# Reinstall Dependencies
###########################################

reinstall_dependencies() {
    log "Reinstalling dependencies..."

    cd "${PROJECT_ROOT}"

    # Check if node_modules backup exists
    if [ -f "${BACKUP_DIR}/${BACKUP_NAME}_node_modules.tar.gz" ]; then
        log "Restoring node_modules from backup..."
        rm -rf node_modules
        tar -xzf "${BACKUP_DIR}/${BACKUP_NAME}_node_modules.tar.gz" -C "${PROJECT_ROOT}"
    else
        log "Running npm install..."
        npm ci --production
    fi

    log "Dependencies installed ✓"
}

###########################################
# Start Application
###########################################

start_application() {
    log "Starting application..."

    cd "${PROJECT_ROOT}"

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

    log "Application started ✓"
}

###########################################
# Verify Rollback
###########################################

verify_rollback() {
    log "Verifying rollback..."

    sleep 5  # Give app time to start

    API_URL=${API_URL:-"http://localhost:3000"}

    # Wait for API
    for i in {1..30}; do
        if curl -s "${API_URL}/health" > /dev/null 2>&1; then
            log "API is responding ✓"
            break
        fi
        info "Waiting for API... (${i}/30)"
        sleep 2
    done

    # Check health
    HEALTH_STATUS=$(curl -s "${API_URL}/health" | jq -r '.status' 2>/dev/null || echo "unknown")

    if [ "${HEALTH_STATUS}" = "ok" ]; then
        log "Health check passed ✓"
    else
        error "Health check failed: ${HEALTH_STATUS}"
        warning "Application may not be running correctly"
        return 1
    fi

    log "Rollback verification passed ✓"
}

###########################################
# Create Rollback Log
###########################################

create_rollback_log() {
    log "Creating rollback log..."

    LOG_FILE="${PROJECT_ROOT}/rollback-$(date +%Y%m%d_%H%M%S).log"

    cat > "${LOG_FILE}" <<EOF
Rollback Information
====================

Timestamp: $(date)
Backup Used: ${BACKUP_NAME}
Rolled Back By: ${USER}
Git Commit (after rollback): $(git rev-parse HEAD 2>/dev/null || echo "N/A")

Rollback successful.
EOF

    log "Rollback log created: ${LOG_FILE}"
}

###########################################
# Main Rollback Flow
###########################################

main() {
    log "========================================"
    log "BeerFlow Rollback Procedure"
    log "========================================"

    validate_backup
    confirm_rollback
    stop_application
    restore_backup
    rollback_database
    reinstall_dependencies
    start_application
    verify_rollback
    create_rollback_log

    log "========================================"
    log "Rollback completed successfully! ✓"
    log "========================================"
    log "Restored from: ${BACKUP_NAME}"
    log "API URL: ${API_URL:-http://localhost:3000}"
}

# Run main function
main "$@"
