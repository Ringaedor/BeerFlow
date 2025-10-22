#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🍺 BeerFlow - Production Deployment Script${NC}"
echo "================================================"

# Configuration
DOCKER_IMAGE="beerflow-backend"
DOCKER_TAG="${1:-latest}"
CONTAINER_NAME="beerflow-backend-prod"
BACKUP_CONTAINER_NAME="beerflow-backend-backup"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=2

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run as root or with sudo${NC}"
  exit 1
fi

# Validate environment
echo -e "${YELLOW}📋 Validating environment...${NC}"
if [ ! -f ".env.production" ]; then
  echo -e "${RED}❌ .env.production file not found${NC}"
  exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running${NC}"
  exit 1
fi

# Backup current container
if docker ps -a | grep -q "$CONTAINER_NAME"; then
  echo -e "${YELLOW}📦 Creating backup of current container...${NC}"
  docker rename "$CONTAINER_NAME" "$BACKUP_CONTAINER_NAME" || true
  docker stop "$BACKUP_CONTAINER_NAME" || true
fi

# Pull latest image
echo -e "${YELLOW}🔽 Pulling latest Docker image...${NC}"
cd backend
docker build -t "$DOCKER_IMAGE:$DOCKER_TAG" .
cd ..

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
# Add migration command here when available

# Start new container
echo -e "${YELLOW}🚀 Starting new container...${NC}"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  --network beerflow-network \
  "$DOCKER_IMAGE:$DOCKER_TAG"

# Wait for health check
echo -e "${YELLOW}🏥 Waiting for health check...${NC}"
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
  if docker exec "$CONTAINER_NAME" node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
    break
  fi

  if [ $i -eq $HEALTH_CHECK_RETRIES ]; then
    echo -e "${RED}❌ Health check failed after $HEALTH_CHECK_RETRIES attempts${NC}"
    echo -e "${YELLOW}🔄 Rolling back to previous version...${NC}"
    docker stop "$CONTAINER_NAME"
    docker rm "$CONTAINER_NAME"
    docker rename "$BACKUP_CONTAINER_NAME" "$CONTAINER_NAME"
    docker start "$CONTAINER_NAME"
    echo -e "${RED}❌ Deployment failed, rolled back to previous version${NC}"
    exit 1
  fi

  echo "Attempt $i/$HEALTH_CHECK_RETRIES - Waiting ${HEALTH_CHECK_INTERVAL}s..."
  sleep $HEALTH_CHECK_INTERVAL
done

# Remove backup container
if docker ps -a | grep -q "$BACKUP_CONTAINER_NAME"; then
  echo -e "${YELLOW}🗑️  Removing backup container...${NC}"
  docker rm "$BACKUP_CONTAINER_NAME" || true
fi

# Clean up old images
echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
docker image prune -f

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🍺 BeerFlow backend is now running on port 3000${NC}"
echo ""
echo "Container logs: docker logs -f $CONTAINER_NAME"
echo "Container status: docker ps | grep $CONTAINER_NAME"
