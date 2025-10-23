# PROMPT_3_FASE_3.md

## PROMPT ULTRA-DETTAGLIATO PER JULES - FASE 3

### PROMPT 1: FASE_3_IMPLEMENTATION
```
PROMPT PER JULES - FASE 3 IMPLEMENTAZIONE ORDER MANAGEMENT & POS SYSTEM

CONTESTO:
Fase 1 e Fase 2 sono completate e funzionanti (Core Backend + Product & Inventory Management). Ora devi implementare la Fase 3: sistema completo Order Management, Tables, Reservations e POS con WebSocket real-time per Kitchen Display System (KDS) e scarico automatico magazzino tramite FEFO.

OBIETTIVO:
Implementare ESATTAMENTE il sistema Order Management & POS seguendo FASE_3_IMPLEMENTATION.md. Focus critico su business logic order workflow, WebSocket real-time per cucina e integrazione FEFO automatica.

TASK SPECIFICI:
1. Implementa TUTTE le nuove entità: Table, Reservation, Order, OrderItem, Payment
2. Crea WebSocket Gateway per comunicazione real-time Kitchen Display System
3. Implementa business logic order workflow: draft → confirmed → preparing → ready → served → completed
4. Integra FEFO automatico: scarico magazzino quando ordine servito
5. Implementa Table management con posizionamento drag & drop e stati real-time
6. Crea POS Service per splitting bill e gestione pagamenti multipli
7. Setup guards venue-based con role permissions per kitchen/waiters
8. Implementa TUTTI i Controller con endpoint API documentati

VINCOLI TECNICI CRITICI:
- Order status transitions DEVONO seguire business rules obbligatorie (solo transizioni valide)
- WebSocket events DEVONO isolare venue (no cross-venue leakage)
- FEFO integration DEVE essere atomica (transazioni database obbligatorie)
- Table status DEVE aggiornare automaticamente based on orders
- Performance: order creation < 300ms, status updates < 100ms, WebSocket events < 50ms
- Real-time: Kitchen Display DEVE ricevere ordini instantaneamente

BUSINESS LOGIC REQUIREMENTS:
- Order Workflow: Draft (editing) → Confirmed (kitchen notified) → Preparing (in cucina) → Ready (pronto) → Served (consegnato, FEFO triggered) → Completed (pagato, tavolo libero)
- Table Management: Solo 1 ordine attivo per tavolo, cambio stato automatico
- WebSocket Events: new_order, order_status_changed, table_status_changed, kitchen_alert
- FEFO Integration: Quando ordine SERVED, trigger automatico stock movements via existing StockService
- Real-time KDS: Cucina vede nuovi ordini instantaneamente, aggiornamenti stato in tempo reale
- Role Permissions: waiters (ordini + tavoli), kitchen (solo view ordini + cambio stato), managers (tutto)

INTEGRATION REQUIREMENTS:
- DEVE utilizzare StockService esistente per FEFO allocation
- DEVE utilizzare autenticazione JWT esistente con venue isolation
- DEVE mantenere audit trail per tutti i cambiamenti
- DEVE rispettare struttura moduli NestJS esistente
- DEVE usare TypeORM entities con relazioni corrette

DIPENDENZE OBBLIGATORIE:
```bash
# WebSocket e Real-time
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
# Scheduling per automation
npm install @nestjs/schedule cron
# PDF per ricevute
npm install puppeteer @types/puppeteer
# Validation avanzata
npm install class-validator-multi-lang
# Dev dependencies
npm install -D @types/socket.io @types/cron
```

STRUTTURA DIRECTORY ESATTA:
```
backend/src/
├── orders/
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.module.ts
│   ├── orders.gateway.ts          # WebSocket Gateway
│   ├── pos.service.ts             # POS business logic
│   └── dto/
│       ├── create-order.dto.ts
│       ├── update-order.dto.ts
│       ├── add-item.dto.ts
│       └── change-status.dto.ts
├── tables/
│   ├── tables.controller.ts
│   ├── tables.service.ts
│   ├── tables.module.ts
│   └── dto/
│       ├── create-table.dto.ts
│       ├── update-table.dto.ts
│       └── reorder-tables.dto.ts
├── reservations/
│   ├── reservations.controller.ts
│   ├── reservations.service.ts
│   ├── reservations.module.ts
│   └── dto/
├── database/entities/
│   ├── table.entity.ts
│   ├── reservation.entity.ts
│   ├── order.entity.ts
│   ├── order-item.entity.ts
│   └── payment.entity.ts
└── database/enums/
    ├── table-status.enum.ts
    ├── order-status.enum.ts
    ├── order-item-status.enum.ts
    └── payment-status.enum.ts
```

ENTITIES IMPLEMENTATION OBBLIGATORIA (USA ESATTAMENTE QUESTI CAMPI):
- Table: id, venue_id, name, seats, position_json, status, area, notes, active
- Order: id, venue_id, table_id, user_id, order_number, status, total_amount, notes, confirmed_at, kitchen_started_at, ready_at, served_at, completed_at
- OrderItem: id, order_id, product_id, allocated_lot_id, quantity, unit_price, total_price, status, notes, kitchen_notes, started_at, completed_at
- Payment: id, order_id, amount, method, status, processed_at, reference

WEBSOCKET EVENTS OBBLIGATORI:
- new_order: emit quando ordine confirmato, room = venue_kitchen_{venue_id}
- order_status_changed: emit su ogni cambio stato, room = venue_{venue_id}
- table_status_changed: emit quando tavolo cambia stato, room = venue_{venue_id}
- kitchen_alert: emit per notifiche cucina urgenti

BUSINESS RULES OBBLIGATORIE:
1. Order Status Transitions: SOLO queste transizioni valide
   - draft → confirmed (waiter confirm)
   - confirmed → preparing (kitchen start)
   - preparing → ready (kitchen complete)
   - ready → served (waiter deliver, TRIGGER FEFO)
   - served → completed (payment processed)
   - ANY → cancelled (solo managers)

2. Table Status Logic:
   - available → occupied (quando ordine created)
   - occupied → cleaning (quando ordine completed)
   - cleaning → available (manual or auto after X minutes)

3. FEFO Integration Atomica:
   ```typescript
   // Quando order status → SERVED, esegui:
   for each orderItem in order.items:
     await stockService.allocateAndMoveStock(
       orderItem.product_id,
       orderItem.quantity,
       'SALE',
       order.id,
       user_id
     )
   ```

API ENDPOINTS OBBLIGATORI:
```
POST   /api/v1/venues/{venueId}/orders                    # Create order
GET    /api/v1/venues/{venueId}/orders                    # List orders
GET    /api/v1/venues/{venueId}/orders/{id}               # Get order details
PATCH  /api/v1/venues/{venueId}/orders/{id}/status        # Change order status
POST   /api/v1/venues/{venueId}/orders/{id}/items         # Add items to order
DELETE /api/v1/venues/{venueId}/orders/{id}/items/{itemId} # Remove item
GET    /api/v1/venues/{venueId}/orders/kitchen-display    # Kitchen Display orders
POST   /api/v1/venues/{venueId}/tables                    # Create table
GET    /api/v1/venues/{venueId}/tables                    # List tables
PATCH  /api/v1/venues/{venueId}/tables/{id}               # Update table
PATCH  /api/v1/venues/{venueId}/tables/layout             # Update positions
PATCH  /api/v1/venues/{venueId}/tables/{id}/status        # Change table status
```

CRITERI DI COMPLETAMENTO:
- Comando `npm run start:dev` funziona senza errori
- Swagger docs aggiornati con tutti gli endpoint Fase 3
- WebSocket server accetta connessioni su /socket.io
- Creazione ordine con items funziona end-to-end
- Cambio status ordine triggera eventi WebSocket
- Status SERVED triggera FEFO allocation automatica
- Kitchen Display query mostra ordini real-time
- Table management con posizioni drag&drop funziona
- Authorization venue-based + role-based funziona
- Performance: order creation < 300ms, status update < 100ms

TEST VALIDATION OBBLIGATORI:
```bash
# Test order creation
curl -X POST http://localhost:3000/api/v1/venues/{venue-id}/orders \
  -H "Authorization: Bearer {token}" \
  -d '{"table_id":"...", "items":[{"product_id":"...", "quantity":2}]}'

# Test status update with WebSocket event
curl -X PATCH http://localhost:3000/api/v1/venues/{venue-id}/orders/{id}/status \
  -H "Authorization: Bearer {token}" \
  -d '{"status":"served"}' # Deve triggerare FEFO

# Test kitchen display
curl -X GET http://localhost:3000/api/v1/venues/{venue-id}/orders/kitchen-display \
  -H "Authorization: Bearer {token}"

# Test WebSocket connection
# Connetti a ws://localhost:3000/socket.io con auth
# Join room venue_kitchen_{venue_id}
# Verifica ricezione eventi new_order
```

OUTPUT RICHIESTO:
1. Lista completa di tutti i file creati con contenuto completo
2. Comandi installazione dipendenze eseguiti
3. Steps verifica funzionamento WebSocket server
4. Test completo workflow order con FEFO integration
5. Screenshot Kitchen Display funzionante
6. Log eventi WebSocket ricevuti correttamente

NON DEVIARE da business rules specificate. NON permettere status transitions invalide. NON permettere cross-venue data leakage. Implementa ESATTAMENTE la business logic documentata.
```

### PROMPT 2: FASE_3_TESTING
```
PROMPT PER JULES - FASE 3 TESTING BUSINESS LOGIC & REAL-TIME COMPLETO

CONTESTO:
Hai implementato Order Management & POS System (Fase 3). Ora devi creare test suite specializzata per validare business logic critica order workflow, WebSocket real-time communication e integrazione FEFO.

OBIETTIVO:
Implementare TUTTI i test specificati in FASE_3_TESTING.md con focus particolare su order workflow validation, WebSocket events testing e business logic integrity.

TASK SPECIFICI:
1. Setup test environment con WebSocket test client
2. Implementa unit tests per Orders Service con tutti i workflow scenarios
3. Crea integration tests per complete order lifecycle con FEFO validation
4. Implementa WebSocket tests per real-time events e venue isolation
5. Crea performance tests per order operations e concurrent processing
6. Implementa business logic validation per status transitions e edge cases
7. Setup end-to-end tests per complete POS workflow
8. Configura coverage requirements >= 90% con business logic >= 95%

TEST REQUIREMENTS CRITICI:
- Order Workflow: TUTTI gli status transitions testati (valid + invalid)
- WebSocket Events: Real-time communication isolata per venue
- FEFO Integration: Scarico automatico magazzino validato atomicamente
- Concurrency: Order creation/status updates concurrent senza race conditions
- Performance: Order operations sotto threshold definiti
- Business Logic: Edge cases (insufficient stock, invalid transitions, conflicts)
- Authorization: Role-based + venue-based access control validation

UNIT TESTS OBBLIGATORI:
```typescript
// src/orders/orders.service.spec.ts
describe('OrdersService', () => {
  // Business Logic Tests
  it('should create order with valid items and calculate total correctly')
  it('should prevent multiple active orders on same table')
  it('should validate order status transitions (all valid paths)')
  it('should reject invalid status transitions')
  it('should trigger FEFO allocation when order served')
  it('should update table status automatically based on order status')
  it('should handle insufficient stock gracefully')
  it('should calculate preparation time estimates correctly')

  // Edge Cases
  it('should handle concurrent order creation on same table')
  it('should prevent negative quantities and prices')
  it('should handle order cancellation at different states')
  it('should preserve order integrity during failures')
})

// src/tables/tables.service.spec.ts  
describe('TablesService', () => {
  it('should create table with valid position and area')
  it('should prevent duplicate table names in same area')
  it('should update table layout positions correctly')
  it('should handle table status changes with business rules')
  it('should prevent table deletion with active orders')
})
```

INTEGRATION TESTS OBBLIGATORI:
```typescript
// test/integration/order-workflow.integration.spec.ts
describe('Order Workflow Integration', () => {
  it('should complete full order lifecycle: draft → completed')
  it('should trigger stock movements when order served')
  it('should emit WebSocket events during status changes')
  it('should update table status throughout order lifecycle')
  it('should handle venue isolation correctly')
  it('should enforce role-based permissions')
  it('should validate FEFO allocation accuracy')
  it('should maintain data consistency during concurrent operations')
})
```

WEBSOCKET TESTS OBBLIGATORI:
```typescript
// test/websocket/orders.gateway.spec.ts
describe('Orders WebSocket Gateway', () => {
  it('should emit new_order event to kitchen room when order confirmed')
  it('should emit order_status_changed to venue room on status update')
  it('should emit table_status_changed when table status changes')
  it('should isolate events by venue (no cross-venue leakage)')
  it('should handle client connections and disconnections')
  it('should authenticate WebSocket connections with JWT')
  it('should join clients to correct venue rooms')
  it('should handle connection errors gracefully')
})
```

PERFORMANCE TESTS OBBLIGATORI:
```typescript
// test/performance/order-operations.performance.spec.ts
describe('Order Operations Performance', () => {
  it('should create order in < 300ms average', async () => {
    const times = []
    for (let i = 0; i < 50; i++) {
      const start = Date.now()
      await ordersService.create(venueId, validOrderDto, userId)
      times.push(Date.now() - start)
    }
    const avg = times.reduce((a, b) => a + b) / times.length
    expect(avg).toBeLessThan(300)
  })

  it('should update order status in < 100ms average')
  it('should handle 20 concurrent order creations successfully')
  it('should process kitchen display query in < 150ms')
  it('should propagate WebSocket events in < 50ms')
})
```

E2E TESTS OBBLIGATORI:
```typescript
// test/e2e/pos-workflow.e2e.spec.ts
describe('POS Workflow E2E', () => {
  it('should complete waiter workflow: login → create order → add items → confirm → serve → complete')
  it('should complete kitchen workflow: receive order → start preparing → mark ready')
  it('should handle table management: create → position → occupy → clean → available')
  it('should integrate with existing inventory via FEFO allocation')
  it('should validate real-time updates across multiple clients')
  it('should enforce authorization at every step')
})
```

WEBSOCKET TEST CLIENT SETUP:
```typescript
// test/utils/websocket-test-client.ts
export class WebSocketTestClient {
  private socket: Socket
  
  async connect(authToken: string, venueId: string) {
    this.socket = io('http://localhost:3000', {
      auth: { token: authToken },
      query: { venueId }
    })
    
    return new Promise((resolve) => {
      this.socket.on('connect', resolve)
    })
  }

  async joinKitchen(venueId: string) {
    this.socket.emit('join_kitchen', { venueId })
  }

  onNewOrder(callback: (order: any) => void) {
    this.socket.on('new_order', callback)
  }

  onOrderStatusChanged(callback: (data: any) => void) {
    this.socket.on('order_status_changed', callback)
  }
}
```

BUSINESS LOGIC VALIDATION TESTS:
```typescript
describe('Business Logic Validation', () => {
  it('should maintain stock consistency after order served', async () => {
    // Create order with specific product/quantity
    // Serve order (triggers FEFO)
    // Validate stock movements match order items
    // Verify lot allocations follow FEFO rules
    // Check audit trail completeness
  })

  it('should prevent overselling with concurrent orders', async () => {
    // Create multiple concurrent orders for same product
    // One should succeed, others should fail gracefully
    // Stock should remain consistent
  })

  it('should handle table conflicts gracefully', async () => {
    // Try to create multiple orders on same table
    // First should succeed, second should fail with conflict
    // Table status should be correct
  })
})
```

TEST DATABASE SETUP:
```bash
# scripts/setup-test-database-phase3.sh
#!/bin/bash
createdb beerflow_test_phase3
PGPASSWORD=mattia psql -h localhost -U postgres -d beerflow_test_phase3 < database/schema.sql
PGPASSWORD=mattia psql -h localhost -U postgres -d beerflow_test_phase3 < database/seeds/test-data-phase3.sql
```

JEST CONFIGURATION AGGIORNATA:
```json
// jest.config.js update
{
  "testTimeout": 10000,
  "setupFilesAfterEnv": ["<rootDir>/test/setup-phase3.ts"],
  "testPathIgnorePatterns": ["/node_modules/", "/dist/"],
  "collectCoverageFrom": [
    "src/orders/**/*.ts",
    "src/tables/**/*.ts", 
    "src/reservations/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.e2e-spec.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    },
    "src/orders/orders.service.ts": {
      "branches": 95,
      "functions": 95, 
      "lines": 95,
      "statements": 95
    }
  }
}
```

PERFORMANCE BENCHMARKS REQUIREMENTS:
- Order Creation: < 300ms average, > 95% success rate
- Order Status Updates: < 100ms average, > 98% success rate
- Kitchen Display Queries: < 150ms average, 100% success rate
- WebSocket Event Propagation: < 50ms, 100% delivery rate
- Concurrent Order Processing: 20 orders < 5s, > 90% success rate
- FEFO Allocation: < 200ms per allocation, 100% accuracy

COVERAGE REQUIREMENTS:
- Orders Service: 95% (business logic critica)
- Tables Service: 90% 
- Orders Gateway (WebSocket): 85%
- Controllers: 85%
- Order Workflow Functions: 100% (tutti i path testati)

CRITERI DI COMPLETAMENTO:
- Comando `npm run test:phase3:all` passa al 100%
- Coverage report >= 90% overall, >= 95% business logic
- Performance benchmarks tutti rispettati
- WebSocket tests verificano venue isolation
- Business logic validation copre tutti gli edge cases
- E2E tests validano complete user workflows
- Concurrent operations gestite senza race conditions

NPM SCRIPTS DA AGGIUNGERE:
```json
{
  "test:phase3:unit": "jest --testPathPattern=\"(orders|tables|reservations).*\\.spec\\.ts$\"",
  "test:phase3:integration": "jest --testPathPattern=\".*\\.integration\\.spec\\.ts$\"",
  "test:phase3:e2e": "jest --testPathPattern=\".*\\.e2e-spec\\.ts$\"",
  "test:phase3:websocket": "jest --testPathPattern=\".*\\.gateway\\.spec\\.ts$\"", 
  "test:phase3:performance": "jest --testPathPattern=\".*\\.performance\\.spec\\.ts$\"",
  "test:phase3:all": "npm run test:phase3:unit && npm run test:phase3:integration && npm run test:phase3:e2e && npm run test:phase3:websocket && npm run test:phase3:performance"
}
```

Implementa TUTTI i test specificati. Business logic order workflow DEVE essere 100% validata. WebSocket events DEVONO essere testati con venue isolation. Performance DEVE rispettare tutti i benchmark.
```

### PROMPT 3: FASE_3_INTEGRATION
```
PROMPT PER JULES - FASE 3 INTEGRATION & PRODUCTION READINESS

CONTESTO:
Fase 3 implementation e testing completati. Ora devi integrare completamente con Fase 1 e 2, setup monitoring avanzato per order operations e WebSocket real-time, e validare production readiness completa.

OBIETTIVO:
Integrare completamente Fase 3 con Fasi precedenti, configurare monitoring specializzato per business logic order management e real-time communication, preparare deployment production-ready seguendo FASE_3_INTEGRATION.md.

TASK SPECIFICI:
1. Esegui integration tests end-to-end complete order lifecycle con stock integration
2. Setup performance monitoring per order operations e WebSocket events
3. Configura health checks specializzati per order system e real-time features
4. Crea deployment scripts con validation automatica Fase 3
5. Implementa rollback procedures testate per order system
6. Setup monitoring Prometheus/Grafana per metriche business order management
7. Valida production readiness completa sistema end-to-end
8. Configura WebSocket clustering per alta disponibilità

INTEGRATION REQUIREMENTS:
- End-to-end workflow: Table → Order → Items → Status Changes → FEFO → Completion funzionante
- WebSocket performance: real-time events < 50ms, venue isolation 100%
- Stock integration: FEFO allocation automatica accuracy 100%
- Authorization: venue isolation + role permissions integrato cross-fases
- Error handling: graceful degradation per WebSocket failures e order conflicts

MONITORING SETUP AVANZATO:
```typescript
// src/common/interceptors/order-metrics.interceptor.ts
@Injectable()
export class OrderMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const startTime = Date.now()
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime
        const endpoint = `${request.method} ${request.route?.path}`
        
        // Track order-specific metrics
        if (endpoint.includes('/orders')) {
          this.trackOrderOperation(endpoint, duration, request)
        }
        
        // Alert on slow operations
        if (duration > 500) {
          console.warn(`Slow order operation: ${endpoint} - ${duration}ms`)
        }
      })
    )
  }

  private trackOrderOperation(endpoint: string, duration: number, request: any) {
    // Send to monitoring service (Prometheus/DataDog)
    const metrics = {
      endpoint,
      duration,
      venueId: request.params.venueId,
      userId: request.user?.id,
      timestamp: new Date()
    }
    
    // Track specific business metrics
    if (endpoint.includes('status')) {
      this.trackStatusChangeMetrics(request.body.status, duration)
    }
  }
}
```

WEBSOCKET MONITORING:
```typescript
// src/orders/orders.gateway.ts (add monitoring)
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/orders'
})
export class OrdersGateway {
  @SubscribeMessage('join_venue')
  async handleJoinVenue(client: Socket, data: { venueId: string }) {
    await client.join(`venue_${data.venueId}`)
    
    // Track connection metrics
    this.metricsService.trackWebSocketConnection({
      venueId: data.venueId,
      userId: client.handshake.auth.userId,
      timestamp: new Date()
    })
  }

  emitOrderStatusUpdate(order: Order) {
    const startTime = Date.now()
    
    this.server.to(`venue_${order.venue_id}`).emit('order_status_changed', {
      orderId: order.id,
      status: order.status,
      timestamp: new Date()
    })
    
    // Track event propagation time
    const propagationTime = Date.now() - startTime
    this.metricsService.trackWebSocketEvent('order_status_changed', propagationTime)
  }
}
```

HEALTH CHECKS SPECIALIZZATI:
```typescript
// src/health/order-health.indicator.ts
@Injectable()
export class OrderHealthIndicator extends HealthIndicator {
  constructor(
    private ordersService: OrdersService,
    private ordersGateway: OrdersGateway
  ) {
    super()
  }

  async isOrderSystemHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test order creation performance
      const start = Date.now()
      await this.ordersService.testOrderCreation()
      const orderCreationTime = Date.now() - start

      // Test WebSocket connectivity
      const wsConnections = this.ordersGateway.getConnectedClients()
      
      // Test FEFO integration
      const fefoTestResult = await this.testFEFOIntegration()

      const isHealthy = orderCreationTime < 300 && wsConnections >= 0 && fefoTestResult

      return this.getStatus(key, isHealthy, {
        orderCreationTime,
        webSocketConnections: wsConnections,
        fefoIntegration: fefoTestResult
      })
    } catch (error) {
      return this.getStatus(key, false, { error: error.message })
    }
  }
}
```

DEPLOYMENT VALIDATION SCRIPTS:
```bash
#!/bin/bash
# scripts/validate-phase3-deployment.sh

echo "🔍 Validating Phase 3 Deployment..."

# Test API endpoints
echo "Testing order endpoints..."
ORDER_ID=$(curl -s -X POST http://localhost:3000/api/v1/venues/$VENUE_ID/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table_id":"'$TABLE_ID'","items":[{"product_id":"'$PRODUCT_ID'","quantity":1}]}' \
  | jq -r '.id')

if [ "$ORDER_ID" = "null" ]; then
  echo "❌ Order creation failed"
  exit 1
fi

echo "✅ Order created: $ORDER_ID"

# Test status update with FEFO trigger
echo "Testing order status update..."
curl -s -X PATCH http://localhost:3000/api/v1/venues/$VENUE_ID/orders/$ORDER_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"served"}' > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ Order status update successful"
else
  echo "❌ Order status update failed"
  exit 1
fi

# Test WebSocket connectivity
echo "Testing WebSocket connection..."
node scripts/test-websocket-connection.js $TOKEN $VENUE_ID

if [ $? -eq 0 ]; then
  echo "✅ WebSocket connection successful"
else
  echo "❌ WebSocket connection failed"
  exit 1
fi

# Test kitchen display
echo "Testing kitchen display..."
KITCHEN_ORDERS=$(curl -s -X GET http://localhost:3000/api/v1/venues/$VENUE_ID/orders/kitchen-display \
  -H "Authorization: Bearer $TOKEN" | jq '. | length')

echo "✅ Kitchen display showing $KITCHEN_ORDERS orders"

# Validate FEFO integration
echo "Testing FEFO integration..."
# Check if stock movement was created for the served order
MOVEMENT_COUNT=$(curl -s -X GET http://localhost:3000/api/v1/venues/$VENUE_ID/stock-movements?reference=$ORDER_ID \
  -H "Authorization: Bearer $TOKEN" | jq '. | length')

if [ "$MOVEMENT_COUNT" -gt "0" ]; then
  echo "✅ FEFO integration working - $MOVEMENT_COUNT stock movements created"
else
  echo "❌ FEFO integration failed - no stock movements"
  exit 1
fi

echo "🎉 Phase 3 deployment validation completed successfully!"
```

PROMETHEUS METRICS:
```typescript
// src/metrics/order-metrics.service.ts
@Injectable()
export class OrderMetricsService {
  private readonly orderCreationDuration = new prometheus.Histogram({
    name: 'beerflow_order_creation_duration_seconds',
    help: 'Duration of order creation operations',
    labelNames: ['venue_id', 'status']
  })

  private readonly orderStatusTransitions = new prometheus.Counter({
    name: 'beerflow_order_status_transitions_total',
    help: 'Total number of order status transitions',
    labelNames: ['venue_id', 'from_status', 'to_status']
  })

  private readonly websocketEvents = new prometheus.Counter({
    name: 'beerflow_websocket_events_total',
    help: 'Total WebSocket events emitted',
    labelNames: ['event_type', 'venue_id']
  })

  private readonly activeWebsocketConnections = new prometheus.Gauge({
    name: 'beerflow_websocket_connections_active',
    help: 'Number of active WebSocket connections',
    labelNames: ['venue_id']
  })

  trackOrderCreation(venueId: string, duration: number, status: 'success' | 'error') {
    this.orderCreationDuration
      .labels(venueId, status)
      .observe(duration / 1000)
  }

  trackStatusTransition(venueId: string, fromStatus: string, toStatus: string) {
    this.orderStatusTransitions
      .labels(venueId, fromStatus, toStatus)
      .inc()
  }

  trackWebSocketEvent(eventType: string, venueId: string) {
    this.websocketEvents
      .labels(eventType, venueId)
      .inc()
  }
}
```

GRAFANA DASHBOARD CONFIG:
```json
{
  "dashboard": {
    "title": "BeerFlow Order Management",
    "panels": [
      {
        "title": "Order Creation Performance",
        "type": "graph",
        "targets": [{
          "expr": "histogram_quantile(0.95, beerflow_order_creation_duration_seconds_bucket)",
          "legendFormat": "95th percentile"
        }]
      },
      {
        "title": "Order Status Transitions",
        "type": "graph", 
        "targets": [{
          "expr": "rate(beerflow_order_status_transitions_total[5m])",
          "legendFormat": "{{from_status}} -> {{to_status}}"
        }]
      },
      {
        "title": "WebSocket Events",
        "type": "singlestat",
        "targets": [{
          "expr": "rate(beerflow_websocket_events_total[5m])",
          "legendFormat": "Events/sec"
        }]
      },
      {
        "title": "Active WebSocket Connections",
        "type": "graph",
        "targets": [{
          "expr": "beerflow_websocket_connections_active",
          "legendFormat": "{{venue_id}}"
        }]
      }
    ]
  }
}
```

WEBSOCKET CLUSTERING SETUP:
```typescript
// src/orders/orders.gateway.ts (Redis adapter)
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL })
    const subClient = pubClient.duplicate()

    await Promise.all([pubClient.connect(), subClient.connect()])

    this.adapterConstructor = createAdapter(pubClient, subClient)
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options)
    server.adapter(this.adapterConstructor)
    return server
  }
}
```

PRODUCTION READINESS CHECKLIST:
```markdown
## Phase 3 Production Readiness

### ✅ Functional Requirements
- [ ] All order endpoints functional and documented
- [ ] WebSocket real-time communication working
- [ ] Kitchen Display System operational  
- [ ] Table management with drag&drop positions
- [ ] FEFO automatic allocation on order served
- [ ] Order workflow validation (all status transitions)
- [ ] Venue isolation maintained across all features
- [ ] Role-based permissions enforced

### ✅ Performance Requirements  
- [ ] Order creation < 300ms average
- [ ] Order status updates < 100ms average
- [ ] WebSocket events < 50ms propagation
- [ ] Kitchen display queries < 150ms
- [ ] Concurrent order processing tested
- [ ] Load testing passed (20+ concurrent orders)

### ✅ Integration Requirements
- [ ] Seamless integration with Phase 1 (Auth) and Phase 2 (Stock)
- [ ] FEFO allocation accuracy 100%
- [ ] Stock consistency maintained
- [ ] Audit trails complete
- [ ] Business logic validation 100%

### ✅ Monitoring & Observability
- [ ] Health checks responding correctly
- [ ] Prometheus metrics configured
- [ ] Grafana dashboards deployed
- [ ] Alerting rules configured
- [ ] Log aggregation setup
- [ ] Performance monitoring active

### ✅ Security & Compliance
- [ ] JWT authentication integrated
- [ ] Venue-based authorization enforced
- [ ] Role permissions validated
- [ ] Input validation comprehensive
- [ ] SQL injection prevention verified
- [ ] WebSocket authentication secured

### ✅ Deployment & Operations
- [ ] Docker containers building successfully
- [ ] Health endpoints responding
- [ ] Rolling deployment tested
- [ ] Rollback procedures validated
- [ ] Environment configurations secure
- [ ] WebSocket clustering configured
```

FINAL VALIDATION COMMAND:
```bash
npm run test:phase3:all && 
npm run test:integration:phase3 && 
npm run test:e2e:order-workflow &&
./scripts/validate-phase3-deployment.sh &&
./scripts/performance-test-phase3.sh
```

CRITERI COMPLETAMENTO:
- Sistema deve essere COMPLETAMENTE pronto per produzione
- Monitoring operativo con metriche business
- Performance verificate sotto load
- Business logic validata end-to-end  
- WebSocket real-time funzionante e scalabile
- Integration con fasi precedenti perfetta
- Security e compliance verificate
- Deployment zero-downtime configurato

Esegui TUTTI gli step di integration e validation. Il sistema deve essere production-ready al 100% con monitoring completo, performance ottimizzate e business logic validata. WebSocket clustering deve essere configurato per alta disponibilità.
```

---

## CONCLUSIONI FASE 3

Questi prompt guidano Jules attraverso l'implementazione completa del sistema Order Management & POS con particolare attenzione a:

1. **Business Logic Critica**: Workflow ordini, status transitions, FEFO integration
2. **Real-time Communication**: WebSocket per Kitchen Display System
3. **Performance**: Order operations ottimizzate sotto threshold
4. **Integration**: Seamless con Stock Management esistente
5. **Production Readiness**: Monitoring, clustering, deployment automation

Il sistema risultante sarà completamente operativo per gestire il flusso ordini di una birreria con aggiornamenti real-time per la cucina e scarico automatico del magazzino.
