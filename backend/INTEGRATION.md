# BeerFlow Backend - Production Integration Guide

## Table of Contents
- [Overview](#overview)
- [Health Checks](#health-checks)
- [Metrics & Monitoring](#metrics--monitoring)
- [Docker Deployment](#docker-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment Procedures](#deployment-procedures)
- [Rollback Procedures](#rollback-procedures)
- [Validation](#validation)

## Overview

This document describes the production integration setup for BeerFlow Phase 1, including:
- Health check endpoints
- Request metrics and monitoring
- Docker containerization
- CI/CD pipeline with GitHub Actions
- Deployment and rollback procedures

## Health Checks

### Endpoints

The application provides three health check endpoints:

#### 1. Main Health Check
```
GET /api/v1/health
```

Checks:
- Database connectivity
- Memory heap usage (< 150MB)
- Memory RSS usage (< 150MB)
- Disk storage (< 90% full)

#### 2. Readiness Probe
```
GET /api/v1/health/ready
```

Checks if the application is ready to receive traffic:
- Database connectivity

Use this for Kubernetes readiness probes.

#### 3. Liveness Probe
```
GET /api/v1/health/live
```

Checks if the application is alive:
- Memory heap usage (< 200MB)

Use this for Kubernetes liveness probes.

### Example Response

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  }
}
```

## Metrics & Monitoring

### Request Metrics

The `MetricsInterceptor` automatically logs all HTTP requests with timing information:

```
[MetricsInterceptor] GET /api/v1/venues - 45ms
[MetricsInterceptor] POST /api/v1/auth/login - 156ms
```

Slow requests (> 1000ms) are logged as warnings:

```
[MetricsInterceptor] WARN: Slow request detected: GET /api/v1/users - 1234ms
```

### Performance Benchmarks

Phase 1 requirements:
- Login endpoint: < 200ms average, < 500ms max
- Protected API routes: < 100ms average, < 300ms max

Monitor these metrics in production and alert if thresholds are exceeded.

## Docker Deployment

### Production Build

Build the production Docker image:

```bash
cd backend
docker build -t beerflow-backend:latest .
```

The Dockerfile uses a multi-stage build:
1. **Builder stage**: Compiles TypeScript
2. **Production stage**: Runs compiled code with production dependencies only

### Development Build

For local development with hot-reload:

```bash
cd backend
docker-compose -f docker-compose.dev.yml up
```

This mounts your source code and automatically reloads on changes.

### Docker Compose

#### Production Stack

```bash
docker-compose up -d
```

Services:
- PostgreSQL 15 (port 5432)
- Redis 7 (port 6379)
- Backend API (port 3000)

#### Development Stack

```bash
docker-compose -f docker-compose.dev.yml up
```

Additional features:
- Source code mounting
- Debug port exposed (9229)
- Hot reload enabled

## CI/CD Pipeline

### GitHub Actions Workflow

Location: `.github/workflows/phase1-validation.yml`

The CI/CD pipeline runs on:
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`

### Pipeline Jobs

#### 1. Test Job
- Runs unit tests
- Runs integration tests (with PostgreSQL service)
- Runs performance tests
- Generates coverage report
- Uploads coverage to Codecov

#### 2. Build Job
- Builds Docker image
- Tests Docker health check
- Validates image functionality

#### 3. Security Job
- Runs `npm audit`
- Performs CodeQL analysis
- Checks for vulnerabilities

#### 4. Lint Job
- Runs ESLint
- Checks code formatting

#### 5. Validate Job
- Final validation check
- Runs after all other jobs pass

### Pipeline Requirements

All tests must pass:
- Unit test coverage: > 90%
- Integration tests: 100% pass rate
- Performance tests: Meet benchmarks
- Security scan: No high/critical vulnerabilities
- Lint: Zero errors

## Deployment Procedures

### Automated Deployment

Use the deployment script:

```bash
sudo ./scripts/deploy-production.sh [tag]
```

The script performs:
1. Environment validation
2. Container backup
3. Image build/pull
4. Database migrations (when available)
5. New container start
6. Health check validation
7. Automatic rollback on failure
8. Cleanup

### Manual Deployment

1. **Build the image:**
   ```bash
   cd backend
   docker build -t beerflow-backend:v1.0.0 .
   ```

2. **Stop old container:**
   ```bash
   docker stop beerflow-backend-prod
   docker rename beerflow-backend-prod beerflow-backend-backup
   ```

3. **Start new container:**
   ```bash
   docker run -d \
     --name beerflow-backend-prod \
     --restart unless-stopped \
     -p 3000:3000 \
     --env-file .env.production \
     beerflow-backend:v1.0.0
   ```

4. **Verify health:**
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

5. **Remove backup (if successful):**
   ```bash
   docker rm beerflow-backend-backup
   ```

### Zero-Downtime Deployment

For production systems:

1. Use a load balancer
2. Deploy to one instance at a time
3. Verify health before moving to next instance
4. Keep old version running until new version is verified

## Rollback Procedures

### Automated Rollback

If deployment fails, the deployment script automatically rolls back.

Manual rollback:

```bash
sudo ./scripts/rollback.sh
```

The script:
1. Stops current container
2. Restores backup container
3. Starts backup container
4. Verifies health

### Manual Rollback

1. **Stop current container:**
   ```bash
   docker stop beerflow-backend-prod
   docker rm beerflow-backend-prod
   ```

2. **Restore backup:**
   ```bash
   docker rename beerflow-backend-backup beerflow-backend-prod
   docker start beerflow-backend-prod
   ```

3. **Verify health:**
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

## Validation

### Phase 1 Validation Script

Run the complete validation:

```bash
./scripts/validate-phase1-complete.sh
```

The script checks:
- ✅ Directory structure
- ✅ Core files present
- ✅ Database entities
- ✅ Auth module
- ✅ Venues module
- ✅ Users module
- ✅ Health module
- ✅ Test files
- ✅ Docker files
- ✅ Scripts
- ✅ CI/CD workflow
- ✅ Backend build
- ✅ Unit tests
- ✅ Docker build

### Manual Validation Checklist

#### Backend Functionality
- [ ] Backend builds without errors
- [ ] All unit tests pass (> 90% coverage)
- [ ] All integration tests pass
- [ ] Performance tests meet benchmarks
- [ ] Swagger documentation accessible

#### Docker
- [ ] Production Dockerfile builds
- [ ] Development Dockerfile builds
- [ ] Docker Compose starts all services
- [ ] Health checks pass in container

#### CI/CD
- [ ] GitHub Actions workflow runs
- [ ] All pipeline jobs pass
- [ ] Coverage reports generated

#### Security
- [ ] No high/critical npm vulnerabilities
- [ ] CodeQL analysis passes
- [ ] Environment variables properly secured
- [ ] Non-root user in Docker image

#### Documentation
- [ ] README.md complete
- [ ] TESTING.md complete
- [ ] INTEGRATION.md complete
- [ ] API documented in Swagger

## Production Checklist

Before deploying to production:

### Configuration
- [ ] Set strong JWT secret
- [ ] Configure production database credentials
- [ ] Set correct CORS origin
- [ ] Configure monitoring/logging service
- [ ] Set up SSL/TLS certificates

### Infrastructure
- [ ] PostgreSQL 15+ running
- [ ] Redis running (if needed)
- [ ] Backup system configured
- [ ] Monitoring dashboards set up
- [ ] Log aggregation configured

### Security
- [ ] Database password rotated
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Security headers configured

### Monitoring
- [ ] Health check monitoring
- [ ] Performance metrics tracking
- [ ] Error tracking (e.g., Sentry)
- [ ] Log monitoring
- [ ] Alert rules configured

### Documentation
- [ ] Deployment runbook prepared
- [ ] Incident response plan documented
- [ ] Rollback procedures tested
- [ ] Contact information updated

## Support & Troubleshooting

### Common Issues

#### Health Check Fails
```bash
# Check container logs
docker logs beerflow-backend-prod

# Check database connectivity
docker exec beerflow-backend-prod npm run db:check
```

#### Performance Issues
```bash
# Check container resource usage
docker stats beerflow-backend-prod

# Check application logs for slow requests
docker logs beerflow-backend-prod | grep "Slow request"
```

#### Database Connection Issues
```bash
# Test database connectivity
docker exec beerflow-backend-prod psql -h $DATABASE_HOST -U $DATABASE_USERNAME -d $DATABASE_NAME

# Check environment variables
docker exec beerflow-backend-prod env | grep DATABASE
```

### Log Locations

- Application logs: `docker logs beerflow-backend-prod`
- PostgreSQL logs: `docker logs beerflow-postgres`
- Redis logs: `docker logs beerflow-redis`

### Emergency Contacts

- DevOps Team: [contact info]
- Database Admin: [contact info]
- Security Team: [contact info]

## Next Steps: Phase 2

Phase 1 is complete when:
- ✅ All validation checks pass
- ✅ Backend deployed to staging
- ✅ Integration tests pass in staging
- ✅ Performance benchmarks met
- ✅ Security scan clean
- ✅ Documentation complete

Proceed to Phase 2:
- Implement Products module
- Implement Orders module
- Implement Tables module
- Add real-time features with WebSockets
