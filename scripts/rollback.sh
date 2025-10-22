#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}🔄 BeerFlow - Rollback Script${NC}"
echo "================================"

# Configuration
CONTAINER_NAME="beerflow-backend-prod"
BACKUP_CONTAINER_NAME="beerflow-backend-backup"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run as root or with sudo${NC}"
  exit 1
fi

# Check if backup container exists
if ! docker ps -a | grep -q "$BACKUP_CONTAINER_NAME"; then
  echo -e "${RED}❌ No backup container found. Cannot rollback.${NC}"
  exit 1
fi

# Stop current container
echo -e "${YELLOW}⏹️  Stopping current container...${NC}"
if docker ps | grep -q "$CONTAINER_NAME"; then
  docker stop "$CONTAINER_NAME"
fi

# Remove current container
echo -e "${YELLOW}🗑️  Removing current container...${NC}"
if docker ps -a | grep -q "$CONTAINER_NAME"; then
  docker rm "$CONTAINER_NAME"
fi

# Restore backup container
echo -e "${YELLOW}🔄 Restoring backup container...${NC}"
docker rename "$BACKUP_CONTAINER_NAME" "$CONTAINER_NAME"

# Start restored container
echo -e "${YELLOW}🚀 Starting restored container...${NC}"
docker start "$CONTAINER_NAME"

# Wait for health check
echo -e "${YELLOW}🏥 Waiting for health check...${NC}"
sleep 5

HEALTH_CHECK_RETRIES=30
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
  if docker exec "$CONTAINER_NAME" node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
    echo -e "${GREEN}✅ Rollback completed successfully!${NC}"
    echo -e "${GREEN}🍺 BeerFlow backend is now running on port 3000${NC}"
    exit 0
  fi

  if [ $i -eq $HEALTH_CHECK_RETRIES ]; then
    echo -e "${RED}❌ Health check failed after rollback${NC}"
    echo -e "${RED}❌ Manual intervention required${NC}"
    exit 1
  fi

  echo "Attempt $i/$HEALTH_CHECK_RETRIES - Waiting 2s..."
  sleep 2
done
