#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍺 BeerFlow - Phase 1 Validation Script${NC}"
echo "========================================"
echo ""

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
check_pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASSED++))
  ((TOTAL++))
}

check_fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAILED++))
  ((TOTAL++))
}

check_file() {
  if [ -f "$1" ]; then
    check_pass "File exists: $1"
  else
    check_fail "File missing: $1"
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    check_pass "Directory exists: $1"
  else
    check_fail "Directory missing: $1"
  fi
}

echo -e "${YELLOW}📁 Checking directory structure...${NC}"
check_dir "backend/src"
check_dir "backend/src/database"
check_dir "backend/src/database/entities"
check_dir "backend/src/auth"
check_dir "backend/src/venues"
check_dir "backend/src/users"
check_dir "backend/src/health"
check_dir "backend/src/common"
check_dir "backend/src/test"
echo ""

echo -e "${YELLOW}📄 Checking core files...${NC}"
check_file "backend/src/main.ts"
check_file "backend/src/app.module.ts"
check_file "backend/.env"
check_file "backend/package.json"
check_file "backend/tsconfig.json"
check_file "backend/nest-cli.json"
echo ""

echo -e "${YELLOW}🗄️  Checking database entities...${NC}"
check_file "backend/src/database/entities/base.entity.ts"
check_file "backend/src/database/entities/venue.entity.ts"
check_file "backend/src/database/entities/user.entity.ts"
check_file "backend/src/database/enums/user-role.enum.ts"
check_file "backend/src/database/database.module.ts"
echo ""

echo -e "${YELLOW}🔐 Checking auth module...${NC}"
check_file "backend/src/auth/auth.module.ts"
check_file "backend/src/auth/auth.controller.ts"
check_file "backend/src/auth/auth.service.ts"
check_file "backend/src/auth/strategies/local.strategy.ts"
check_file "backend/src/auth/strategies/jwt.strategy.ts"
check_file "backend/src/auth/guards/jwt-auth.guard.ts"
check_file "backend/src/auth/guards/local-auth.guard.ts"
echo ""

echo -e "${YELLOW}🏢 Checking venues module...${NC}"
check_file "backend/src/venues/venues.module.ts"
check_file "backend/src/venues/venues.controller.ts"
check_file "backend/src/venues/venues.service.ts"
echo ""

echo -e "${YELLOW}👥 Checking users module...${NC}"
check_file "backend/src/users/users.module.ts"
check_file "backend/src/users/users.controller.ts"
check_file "backend/src/users/users.service.ts"
echo ""

echo -e "${YELLOW}🏥 Checking health module...${NC}"
check_file "backend/src/health/health.module.ts"
check_file "backend/src/health/health.controller.ts"
echo ""

echo -e "${YELLOW}🧪 Checking test files...${NC}"
check_file "backend/src/venues/venues.service.spec.ts"
check_file "backend/src/users/users.service.spec.ts"
check_file "backend/src/auth/auth.service.spec.ts"
check_file "backend/src/venues/venues.controller.integration.spec.ts"
check_file "backend/src/users/users.controller.integration.spec.ts"
check_file "backend/src/auth/auth.controller.integration.spec.ts"
check_file "backend/src/auth/auth.performance.spec.ts"
check_file "backend/src/test/test.module.ts"
check_file "backend/src/test/performance.util.ts"
check_file "backend/.env.test"
echo ""

echo -e "${YELLOW}🐳 Checking Docker files...${NC}"
check_file "backend/Dockerfile"
check_file "backend/Dockerfile.dev"
check_file "backend/.dockerignore"
check_file "backend/docker-compose.yml"
check_file "backend/docker-compose.dev.yml"
echo ""

echo -e "${YELLOW}🔧 Checking scripts...${NC}"
check_file "scripts/deploy-production.sh"
check_file "scripts/rollback.sh"
echo ""

echo -e "${YELLOW}⚙️  Checking CI/CD...${NC}"
check_file ".github/workflows/phase1-validation.yml"
echo ""

echo -e "${YELLOW}🔨 Building backend...${NC}"
cd backend
if npm run build > /dev/null 2>&1; then
  check_pass "Backend builds successfully"
else
  check_fail "Backend build failed"
fi
cd ..
echo ""

echo -e "${YELLOW}🧪 Running unit tests...${NC}"
cd backend
if npm run test:unit > /dev/null 2>&1; then
  check_pass "Unit tests pass"
else
  check_fail "Unit tests failed"
fi
cd ..
echo ""

echo -e "${YELLOW}🐳 Validating Docker build...${NC}"
cd backend
if docker build -t beerflow-validation:test . > /dev/null 2>&1; then
  check_pass "Docker image builds successfully"
  docker rmi beerflow-validation:test > /dev/null 2>&1 || true
else
  check_fail "Docker build failed"
fi
cd ..
echo ""

# Final summary
echo "========================================"
echo -e "${BLUE}📊 Validation Summary${NC}"
echo "========================================"
echo -e "Total checks: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 Phase 1 validation PASSED!${NC}"
  echo -e "${GREEN}✅ All requirements met for Phase 1 completion${NC}"
  exit 0
else
  echo -e "${RED}❌ Phase 1 validation FAILED!${NC}"
  echo -e "${RED}Please fix the failed checks above${NC}"
  exit 1
fi
