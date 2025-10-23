PROMPT PER JULES - FASE 1 IMPLEMENTAZIONE CORE BACKEND

CONTESTO:
Sei il lead developer di BeerFlow, un gestionale per birrerie. Devi implementare la Fase 1: Core Backend Foundation. Hai a disposizione:
- Database PostgreSQL già configurato con schema completo
- Documentazione tecnica dettagliata (FASE_1_IMPLEMENTATION.md)
- Dati demo già caricati e testati

OBIETTIVO:
Implementare ESATTAMENTE il backend NestJS seguendo le specifiche tecniche fornite. Non prendere iniziative creative - segui le istruzioni al 100%.

TASK SPECIFICI:
1. Crea progetto NestJS con la struttura ESATTA specificata in FASE_1_IMPLEMENTATION.md
2. Implementa TUTTI gli entity TypeORM con i campi esatti del database
3. Crea TUTTI i moduli (Venues, Users, Auth) con i metodi specificati
4. Implementa sistema JWT authentication con le strategie indicate
5. Configura Guards e Decorators esattamente come specificato
6. Implementa TUTTI i Controller con gli endpoint API documentati
7. Configura Swagger documentation completa
8. Setup environment configuration con i file .env indicati

VINCOLI TECNICI OBBLIGATORI:
- Usa ESATTAMENTE le dipendenze specificate (versioni incluse)
- Nomina file e classi ESATTAMENTE come indicato
- Implementa TUTTE le validazioni DTO specificate
- Rispetta la struttura directory ESATTA fornita
- Usa gli UUID esatti per i dati demo esistenti
- Configura CORS, validation pipes, e global prefix come specificato

CRITERI DI COMPLETAMENTO:
- `npm run start:dev` deve funzionare senza errori
- Swagger docs accessibili su /api/docs
- Login con admin@beerflow.demo/admin123! deve funzionare
- Tutti gli endpoint devono rispondere correttamente
- Guards di autorizzazione devono funzionare (admin vs waiter)

OUTPUT RICHIESTO:
1. Lista di tutti i file creati con il loro contenuto completo
2. Comandi esatti per installazione dipendenze
3. Steps di verifica che tutto funzioni
4. Screenshot/log dell'applicazione funzionante

NON DEVIARE da queste specifiche. Implementa SOLO quello che è documentato, esattamente come è documentato.
```

### PROMPT 2: FASE_1_TESTING
```
PROMPT PER JULES - FASE 1 TESTING COMPLETO

CONTESTO:
Hai completato l'implementazione del Core Backend (Fase 1). Ora devi implementare la suite di test completa seguendo FASE_1_TESTING.md.

OBIETTIVO:
Implementare TUTTI i test specificati per garantire qualità, sicurezza e performance del backend.

TASK SPECIFICI:
1. Setup test environment con database di test separato
2. Implementa TUTTI i unit test specificati (VenuesService, AuthService, ecc.)
3. Implementa TUTTI i integration test per i controller
4. Implementa performance test con i benchmark specificati
5. Configura Jest con coverage requirements (90% minimum)
6. Setup test database con script automatizzati
7. Implementa load testing per verificare concorrenza

TEST REQUIREMENTS OBBLIGATORI:
- Unit tests: 100% pass rate, copertura >90%
- Integration tests: Validazione end-to-end completa
- Performance tests: Login <200ms, API calls <100ms
- Load tests: 50 richieste concorrenti senza errori
- Security tests: Validazione auth/authz completa

VINCOLI TECNICI:
- Usa ESATTAMENTE i setup di test specificati
- Implementa TUTTI i test case documentati
- Rispetta i benchmark di performance indicati
- Usa i mock specificati per unit tests
- Configura test database con gli script forniti

CRITERI DI COMPLETAMENTO:
- Comando `npm run test:all` passa al 100%
- Coverage report mostra >90% su tutti i moduli
- Performance test rispettano tutti i threshold
- Load test gestiscono concorrenza senza degradazione
- Security test validano auth/authz correttamente

OUTPUT RICHIESTO:
1. Tutti i file di test creati con contenuto completo
2. Jest configuration completa
3. Test database setup scripts
4. Coverage report screenshot
5. Performance test results con metriche
6. Load test results con concurrent handling

Implementa TUTTI i test specificati. Non saltare nessun test case. La qualità è critica.
```

### PROMPT 3: FASE_1_INTEGRATION
```
PROMPT PER JULES - FASE 1 INTEGRATION & DEPLOYMENT

CONTESTO:
Hai completato implementazione e testing della Fase 1. Ora devi preparare il sistema per la produzione e l'integrazione con le fasi successive.

OBIETTIVO:
Integrare tutti i componenti, configurare deployment, setup CI/CD e validare production readiness seguendo FASE_1_INTEGRATION.md.

TASK SPECIFICI:
1. Configura Docker container per il backend
2. Setup Docker Compose per development environment
3. Implementa health check endpoints e monitoring
4. Configura GitHub Actions CI/CD pipeline
5. Setup production deployment scripts
6. Implementa rollback procedures
7. Valida integration completa con script automatizzati

INTEGRAZIONE REQUIREMENTS:
- Docker build deve funzionare senza errori
- Docker Compose deve avviare tutti i servizi
- Health checks devono rispondere correttamente
- CI/CD pipeline deve eseguire tutti i test
- Performance monitoring deve essere funzionante
- Production deployment deve essere zero-downtime

VINCOLI DEPLOYMENT:
- Usa ESATTAMENTE le configurazioni Docker specificate
- Implementa TUTTI gli health check indicati
- Configura CI/CD con i workflow GitHub Actions forniti
- Setup monitoring con le metriche specificate
- Implementa security checks nel pipeline

CRITERI PRODUCTION READINESS:
- Container build e run senza errori
- Health endpoint risponde correttamente
- Metrics e logging sono configurati
- Security scan passa senza vulnerabilità critiche
- Load balancing è configurato
- Backup procedures sono implementate

OUTPUT RICHIESTO:
1. Dockerfile completo e testato
2. Docker Compose configuration funzionante
3. GitHub Actions workflow file completo
4. Health check endpoint implementato
5. Production deployment scripts testati
6. Monitoring dashboard configurato
7. Security scan results puliti
8. Complete integration validation report

VALIDATION FINALE:
- Esegui script `validate-phase1-complete.sh`
- Verifica che TUTTI i criteri di completamento siano soddisfatti
- Documenta che il sistema è pronto per Fase 2
- Fornisci report completo di production readiness

Il sistema deve essere COMPLETAMENTE pronto per produzione prima di procedere alla Fase 2.