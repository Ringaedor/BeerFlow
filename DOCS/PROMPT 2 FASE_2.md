## PROMPT ULTRA-DETTAGLIATI PER JULES - FASE 2

### PROMPT 1: FASE_2_IMPLEMENTATION
````
PROMPT PER JULES - FASE 2 IMPLEMENTAZIONE PRODUCT & INVENTORY MANAGEMENT

CONTESTO:
Fase 1 è completata e funzionante. Ora devi implementare la Fase 2: sistema completo di gestione prodotti e inventario con business logic avanzata FEFO (First-Expired, First-Out) e tracking atomico dei movimenti.

OBIETTIVO:
Implementare ESATTAMENTE il sistema Product & Inventory Management seguendo FASE_2_IMPLEMENTATION.md. Focus critico su business logic FEFO e transazioni atomiche.

TASK SPECIFICI:
1. Implementa TUTTE le nuove entità: ProductCategory, Supplier, Product, Lot, StockMovement
2. Crea business logic FEFO nel StockService con algoritmo di allocazione automatica
3. Implementa transazioni atomiche per tutti i movimenti di magazzino
4. Crea sistema di tracking immutabile per audit trail completo
5. Implementa validazioni avanzate per prevenire stock negativo
6. Setup guards per venue-based authorization
7. Crea API endpoints con validazione DTO completa

VINCOLI TECNICI CRITICI:
- Stock movements DEVONO essere atomici (transazioni database obbligatorie)
- FEFO algorithm DEVE rispettare ordine scadenza + data creazione
- Quantità negative DEVONO essere impossibili
- Venue isolation DEVE essere garantito a livello guard
- Performance: stock operations < 200ms, FEFO allocation < 500ms
- Tutte le operazioni DEVONO avere audit trail immutabile

BUSINESS LOGIC REQUIREMENTS:
- FEFO: "First-Expired, First-Out" - lotti con scadenza più prossima venduti per primi
- Atomic operations: movimento + aggiornamento quantità lot in singola transazione
- Stock consistency: qty_current sempre uguale a somma movimenti
- Venue scoping: utenti possono accedere solo ai dati della loro venue
- Role permissions: admin/manager possono modificare, waiter solo leggere

CRITERI DI COMPLETAMENTO:
- Tutti gli endpoint Phase 2 funzionanti e documentati
- FEFO allocation funziona correttamente con test di verifica
- Stock movements atomici verificati con test concorrenza
- Authorization venue-based funzionante
- Negative stock prevention verificato
- Performance requirements rispettati

NON DEVIARE da algoritmi FEFO specificati. NON permettere inconsistenze stock. Implementa ESATTAMENTE la business logic documentata.
````

### PROMPT 2: FASE_2_TESTING
````
PROMPT PER JULES - FASE 2 TESTING BUSINESS LOGIC COMPLETO

CONTESTO:
Hai implementato il sistema Product & Inventory Management. Ora devi creare test suite specializzata per validare business logic critica, specialmente FEFO algorithm e operazioni concorrenti.

OBIETTIVO:
Implementare TUTTI i test specificati in FASE_2_TESTING.md con focus particolare su business logic validation e concurrency testing.

TASK SPECIFICI:
1. Crea factories per generazione dati test consistenti
2. Implementa unit tests per FEFO algorithm con tutti gli edge cases
3. Crea integration tests per workflow completi product lifecycle
4. Implementa concurrency tests per validare transazioni atomiche
5. Crea performance tests per operazioni critiche stock
6. Implementa business logic validation tests per data consistency
7. Setup test coverage requirements specifici per Phase 2

TEST REQUIREMENTS CRITICI:
- FEFO Algorithm: TUTTI gli scenari testati (single lot, multi-lot, same expiry, no expiry)
- Concurrency: Test race conditions su stock movements concorrenti
- Performance: 100 movimenti sequenziali < 5s, 50 FEFO allocations < 10s
- Data Integrity: Stock consistency SEMPRE mantenuta
- Business Logic: Edge cases (exact depletion, insufficient stock, etc.)
- Authorization: Venue isolation e role permissions

SCENARI TEST OBBLIGATORI:
1. FEFO con lotti multiple scadenze diverse
2. Concurrent stock movements con prevenzione overselling
3. Stock consistency dopo operazioni complesse
4. Authorization cross-venue prevention
5. Performance sotto load con database transazionale
6. Error handling per insufficient stock e validation failures

COVERAGE REQUIREMENTS:
- Stock Service: 95% (business logic critica)
- Products Service: 90%
- Controllers: 85%
- FEFO Algorithm: 100% (tutti i path testati)

PERFORMANCE BENCHMARKS:
- Stock movement creation: < 100ms average
- FEFO allocation: < 200ms average
- Product queries: < 50ms average
- 50 concurrent movements: NO race conditions

Implementa TUTTI i test case specificati. Business logic DEVE essere 100% validata prima di integration.
````

### PROMPT 3: FASE_2_INTEGRATION
PROMPT PER JULES - FASE 2 INTEGRATION & PRODUCTION READINESS

CONTESTO:
Phase 2 implementation e testing completati. Ora devi integrare tutto con Phase 1, setup monitoring avanzato per operazioni stock e preparare deployment production-ready.
OBIETTIVO:
Integrare completamente Phase 2 con Phase 1, configurare monitoring specializzato per business logic critica e validare production readiness seguendo FASE_2_INTEGRATION.md.

TASK SPECIFICI:

Esegui integration tests end-to-end complete product lifecycle
Setup performance monitoring per operazioni stock critiche
Configura health checks specializzati per stock operations
Crea deployment scripts con validation automatica
Implementa rollback procedures testate
Setup monitoring Prometheus/Grafana per metriche business
Valida production readiness completa

INTEGRATION REQUIREMENTS:

End-to-end workflow: Category → Product → Lot → Movement funzionante
Performance monitoring: tracking automatico operazioni lente
Health checks: validazione stock operations performance
Authorization: venue isolation + role permissions integrato
Error handling: graceful degradation per failure scenarios

MONITORING SETUP:

StockMetricsInterceptor: tracking performance automatico
Health indicators: stock operations performance
Prometheus metrics: business KPIs
Grafana dashboards: operational monitoring
Alerting: slow operations e failure detection

DEPLOYMENT VALIDATION:

Tutti gli endpoint Phase 2 validati automaticamente
Performance benchmarks verificati
Business logic integrity tests
Authorization tests cross-venue
Rollback procedure testata

PRODUCTION READINESS CHECKLIST:

 Integration tests 100% pass rate
 Performance benchmarks rispettati
 Monitoring configurato e funzionante
 Health checks response correttamente
 Deployment script eseguito con successo
 Rollback procedure testata
 Documentation aggiornata
 Security audit completato

CRITERI COMPLETAMENTO:
Sistema deve essere COMPLETAMENTE pronto per produzione con monitoring operativo, performance verificate e business logic validata end-to-end.
Esegui TUTTI gli step di integration e validation. Il sistema deve essere production-ready al 100% prima di procedere a Phase 3.

Questi prompt guidano Jules attraverso l'implementazione completa della Fase 2 con particolare attenzione alla business logic critica, testing approfondito e production readiness.