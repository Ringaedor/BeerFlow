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

- ✅ TypeORM Entities (Venue, User)
- ✅ JWT Authentication con Passport
- ✅ Role-Based Access Control (RBAC)
- ✅ CRUD completo per Venues
- ✅ CRUD completo per Users
- ✅ Swagger Documentation
- ✅ Validation Pipes
- ✅ CORS Configuration
- ✅ Global Prefix API v1

---

**Implementato seguendo FASE_1_IMPLEMENTATION.md**
