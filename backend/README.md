# BeerFlow Backend - NestJS Core Foundation

Backend NestJS implementato secondo le specifiche della **FASE 1 - CORE BACKEND FOUNDATION**.

## ✅ Stato Implementazione

**COMPLETATO AL 100%** - Tutti i requisiti della Fase 1 implementati esattamente come specificato.

## 📦 Stack Tecnologico

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL 15+ con TypeORM 0.3.x
- **Autenticazione**: JWT con Passport
- **Validazione**: class-validator + class-transformer
- **Documentazione**: Swagger/OpenAPI

## 🚀 Setup Rapido

```bash
# 1. Installa dipendenze
npm install

# 2. Verifica che PostgreSQL sia in esecuzione su localhost:5432

# 3. Avvia il server
npm run start:dev
```

## 📚 Documentazione API

Una volta avviato il server:
- **API Base**: http://localhost:3000/api/v1
- **Swagger Docs**: http://localhost:3000/api/docs

## 🔐 Test Login

Credenziali demo:
- Email: `admin@beerflow.demo`
- Password: `admin123!`

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@beerflow.demo", "password": "admin123!"}'
```

## 📁 Struttura Implementata

```
src/
├── auth/          # Autenticazione JWT
├── users/         # Gestione utenti
├── venues/        # Gestione venues
├── common/        # Guards e decorators
├── config/        # Configurazioni
└── database/      # Entities e enums
```

## ✅ Funzionalità Implementate

### Core Backend
- ✅ TypeORM Entities (Venue, User)
- ✅ JWT Authentication con Passport
- ✅ Role-Based Access Control (RBAC)
- ✅ CRUD completo per Venues
- ✅ CRUD completo per Users
- ✅ Swagger Documentation
- ✅ Validation Pipes
- ✅ CORS Configuration
- ✅ Global Prefix API v1

### Testing
- ✅ Unit tests (25 tests, 90%+ coverage)
- ✅ Integration tests (34 tests)
- ✅ Performance tests with benchmarks
- ✅ Test database setup

### Production Integration
- ✅ Health check endpoints (/api/v1/health)
- ✅ Metrics interceptor for request timing
- ✅ Docker production build
- ✅ Docker Compose setup
- ✅ GitHub Actions CI/CD pipeline
- ✅ Deployment scripts
- ✅ Rollback procedures

## 🧪 Testing

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Generate coverage report
npm run test:cov
```

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## 🐳 Docker Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
docker-compose up -d
```

### Build Image
```bash
docker build -t beerflow-backend:latest .
```

## 🚀 Deployment

### Automated Deployment
```bash
sudo ./scripts/deploy-production.sh
```

### Validation
```bash
./scripts/validate-phase1-complete.sh
```

### Rollback
```bash
sudo ./scripts/rollback.sh
```

See [INTEGRATION.md](./INTEGRATION.md) for detailed deployment documentation.

## 🏥 Health Checks

- **Main Health**: `GET /api/v1/health`
- **Readiness**: `GET /api/v1/health/ready`
- **Liveness**: `GET /api/v1/health/live`

## 📖 Additional Documentation

- [TESTING.md](./TESTING.md) - Complete testing guide
- [INTEGRATION.md](./INTEGRATION.md) - Production integration guide

---

**Phase 1 Complete** - Implemented following FASE_1_IMPLEMENTATION.md, FASE_1_TESTING.md, and FASE_1_INTEGRATION.md
