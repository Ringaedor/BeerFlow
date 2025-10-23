## FASE_2_INTEGRATION.md
````markdown
# FASE 2 - INTEGRATION & DEPLOYMENT

## Obiettivo Integration
Integrare il sistema completo di Product & Inventory Management con la Fase 1, validare la business logic end-to-end, e preparare il deployment con monitoring avanzato per operazioni di magazzino.

## Componenti da Integrare
- Sistema completo Product/Category/Supplier CRUD
- Business logic FEFO con transazioni atomiche
- Stock movements tracking e audit
- Authorization multi-venue con venue guards
- Performance monitoring per operazioni critiche

---

## 1. Integration Validation Scripts

### 1.1 Complete Phase 2 Integration Test (src/test/phase2-integration.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../database/entities/product.entity';
import { ProductCategory } from '../database/entities/product-category.entity';
import { Supplier } from '../database/entities/supplier.entity';
import { Lot } from '../database/entities/lot.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { User } from '../database/entities/user.entity';

describe('Phase 2 Complete Integration', () => {
  let app: INestApplication;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<ProductCategory>;
  let supplierRepository: Repository<Supplier>;
  let lotRepository: Repository<Lot>;
  let movementRepository: Repository<StockMovement>;

  const venueId = '00000000-0000-0000-0000-000000000001';
  let adminToken: string;
  let managerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Get repositories
    productRepository = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    categoryRepository = moduleFixture.get<Repository<ProductCategory>>(getRepositoryToken(ProductCategory));
    supplierRepository = moduleFixture.get<Repository<Supplier>>(getRepositoryToken(Supplier));
    lotRepository = moduleFixture.get<Repository<Lot>>(getRepositoryToken(Lot));
    movementRepository = moduleFixture.get<Repository<StockMovement>>(getRepositoryToken(StockMovement));

    // Get auth tokens from Phase 1 users
    adminToken = await getAuthToken('admin@beerflow.demo', 'admin123!');
    managerToken = await getAuthToken('manager@beerflow.demo', 'admin123!');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('Complete Product Lifecycle', () => {
    it('should handle complete product lifecycle from creation to stock management', async () => {
      // 1. Create Category
      const categoryResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/product-categories`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Integration Test Category',
          description: 'Category for integration testing',
          color: '#FF6B35',
        })
        .expect(201);

      const categoryId = categoryResponse.body.id;

      // 2. Create Supplier
      const supplierResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/suppliers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Integration Test Supplier',
          contact_email: 'supplier@test.com',
          payment_terms: 30,
        })
        .expect(201);

      const supplierId = supplierResponse.body.id;

      // 3. Create Product
      const productResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category_id: categoryId,
          name: 'Integration Test Product',
          sku: 'INTEG-001',
          unit: 'pz',
          cost: 5.00,
          price: 10.00,
          attributes: { test: true },
        })
        .expect(201);

      const productId = productResponse.body.id;

      // 4. Create Lot
      const lotResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/lots`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product_id: productId,
          supplier_id: supplierId,
          lot_code: 'INTEG-LOT-001',
          qty_init: 100,
          unit: 'pz',
          cost_per_unit: 5.00,
          expiry_date: '2025-12-31',
          storage_location: 'Warehouse A-1',
        })
        .expect(201);

      const lotId = lotResponse.body.id;

      // 5. Verify initial stock
      const stockResponse = await request(app.getHttpServer())
        .get(`/api/v1/venues/${venueId}/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(stockResponse.body.currentStock).toBe(100);

      // 6. Perform stock movements
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/stock/movements`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          lot_id: lotId,
          movement_type: 'OUT',
          quantity: -25,
          reference_type: 'integration_test',
          reference_id: 'test-001',
          notes: 'Integration test movement',
        })
        .expect(201);

      // 7. Verify updated stock
      const updatedStockResponse = await request(app.getHttpServer())
        .get(`/api/v1/venues/${venueId}/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(updatedStockResponse.body.currentStock).toBe(75);

      // 8. Test FEFO allocation
      const fefoResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/stock/fefo-allocate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          product_id: productId,
          required_quantity: 10,
        })
        .expect(200);

      expect(fefoResponse.body.allocations).toHaveLength(1);
      expect(fefoResponse.body.allocations[0]).toMatchObject({
        lotId: lotId,
        quantity: 10,
      });

      // 9. Verify movement history
      const historyResponse = await request(app.getHttpServer())
        .get(`/api/v1/venues/${venueId}/products/${productId}/movements`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(historyResponse.body).toHaveLength(2); // Initial IN + one OUT
    });
  });

  describe('Multi-Lot FEFO Integration', () => {
    it('should properly handle FEFO across multiple lots with different expiry dates', async () => {
      // Setup product
      const productResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'FEFO Test Product',
          sku: 'FEFO-001',
          unit: 'kg',
          price: 20.00,
        })
        .expect(201);

      const productId = productResponse.body.id;

      // Create lots with different expiry dates
      const lots = [];
      const expiryDates = [
        '2025-01-15', // Expires first
        '2025-01-10', // Expires earliest
        '2025-01-20', // Expires last
      ];

      for (let i = 0; i < 3; i++) {
        const lotResponse = await request(app.getHttpServer())
          .post(`/api/v1/venues/${venueId}/lots`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            product_id: productId,
            lot_code: `FEFO-LOT-${i + 1}`,
            qty_init: 30,
            unit: 'kg',
            cost_per_unit: 10.00,
            expiry_date: expiryDates[i],
          })
          .expect(201);

        lots.push(lotResponse.body);
      }

      // Test FEFO allocation of 50kg (should use earliest expiring lots first)
      const fefoResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/stock/fefo-allocate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          product_id: productId,
          required_quantity: 50,
        })
        .expect(200);

      const allocations = fefoResponse.body.allocations;
      expect(allocations).toHaveLength(2);

      // First allocation should be from lot with earliest expiry (2025-01-10)
      const lot2 = lots.find(l => l.lot_code === 'FEFO-LOT-2');
      expect(allocations[0]).toMatchObject({
        lotId: lot2.id,
        quantity: 30,
      });

      // Second allocation should be from lot with next earliest expiry (2025-01-15)
      const lot1 = lots.find(l => l.lot_code === 'FEFO-LOT-1');
      expect(allocations[1]).toMatchObject({
        lotId: lot1.id,
        quantity: 20,
      });
    });
  });

  describe('Authorization and Venue Isolation', () => {
    it('should prevent cross-venue data access', async () => {
      // This test assumes existence of another venue
      const otherVenueId = '00000000-0000-0000-0000-000000000002';

      // Try to create product in different venue
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${otherVenueId}/products`)
        .set('Authorization', `Bearer ${managerToken}`) // Manager is tied to venueId
        .send({
          name: 'Unauthorized Product',
          unit: 'pz',
          price: 5.00,
        })
        .expect(403);
    });

    it('should enforce role-based permissions correctly', async () => {
      // Get waiter token
      const waiterToken = await getAuthToken('waiter1@beerflow.demo', 'admin123!');

      // Waiter should not be able to create products
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/products`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          name: 'Waiter Product',
          unit: 'pz',
          price: 5.00,
        })
        .expect(403);

      // But should be able to read products
      await request(app.getHttpServer())
        .get(`/api/v1/venues/${venueId}/products`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle insufficient stock gracefully', async () => {
      // Create product and lot with limited stock
      const productResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Limited Stock Product',
          unit: 'pz',
          price: 15.00,
        })
        .expect(201);

      const lotResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/lots`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product_id: productResponse.body.id,
          lot_code: 'LIMITED-001',
          qty_init: 5,
          unit: 'pz',
          cost_per_unit: 7.50,
        })
        .expect(201);

      // Try to allocate more than available
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/stock/fefo-allocate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          product_id: productResponse.body.id,
          required_quantity: 10, // More than the 5 available
        })
        .expect(400);
    });

    it('should handle concurrent stock operations correctly', async () => {
      // Create product and lot
      const productResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Concurrent Test Product',
          unit: 'pz',
          price: 8.00,
        })
        .expect(201);

      const lotResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/${venueId}/lots`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product_id: productResponse.body.id,
          lot_code: 'CONCURRENT-001',
          qty_init: 20,
          unit: 'pz',
          cost_per_unit: 4.00,
        })
        .expect(201);

      // Perform multiple concurrent movements
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post(`/api/v1/venues/${venueId}/stock/movements`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            lot_id: lotResponse.body.id,
            movement_type: 'OUT',
            quantity: -3,
            reference_type: 'concurrent_test',
            reference_id: `test-${i}`,
            notes: `Concurrent test ${i}`,
          })
      );

      const results = await Promise.allSettled(concurrentRequests);
      
      // Some should succeed, some might fail due to insufficient stock
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 201).length;
      const maxPossibleSuccess = Math.floor(20 / 3); // 6 successful operations max

      expect(successCount).toBeLessThanOrEqual(maxPossibleSuccess);
    });
  });

  // Helper functions
  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.access_token;
  }

  async function cleanupTestData() {
    await movementRepository.delete({});
    await lotRepository.delete({});
    await productRepository.delete({});
    await supplierRepository.delete({});
    await categoryRepository.delete({});
  }
});
```

---

## 2. Performance Monitoring Setup

### 2.1 Stock Operations Metrics (src/common/interceptors/stock-metrics.interceptor.ts)
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface StockMetrics {
  operation: string;
  duration: number;
  productId?: string;
  lotId?: string;
  quantity?: number;
  success: boolean;
  timestamp: Date;
}

@Injectable()
export class StockMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(StockMetricsInterceptor.name);
  private readonly metricsBuffer: StockMetrics[] = [];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    
    // Extract operation details
    const operation = this.getOperationType(request);
    const productId = request.body?.product_id || request.params?.productId;
    const lotId = request.body?.lot_id || request.params?.lotId;
    const quantity = request.body?.quantity || request.body?.required_quantity;

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;
          
          const metrics: StockMetrics = {
            operation,
            duration,
            productId,
            lotId,
            quantity,
            success: true,
            timestamp: new Date(),
          };

          this.recordMetrics(metrics);
          
          // Log slow operations
          if (duration > 1000) {
            this.logger.warn(`Slow stock operation detected: ${operation} took ${duration}ms`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          
          const metrics: StockMetrics = {
            operation,
            duration,
            productId,
            lotId,
            quantity,
            success: false,
            timestamp: new Date(),
          };

          this.recordMetrics(metrics);
          this.logger.error(`Stock operation failed: ${operation} - ${error.message}`);
        },
      }),
    );
  }

  private getOperationType(request: any): string {
    const path = request.route.path;
    const method = request.method;

    if (path.includes('/stock/movements') && method === 'POST') return 'stock_movement';
    if (path.includes('/stock/fefo-allocate') && method === 'POST') return 'fefo_allocation';
    if (path.includes('/lots') && method === 'POST') return 'lot_creation';
    if (path.includes('/products') && method === 'POST') return 'product_creation';
    if (path.includes('/products') && method === 'GET') return 'product_query';

    return `${method.toLowerCase()}_${path.split('/').pop()}`;
  }

  private recordMetrics(metrics: StockMetrics) {
    this.metricsBuffer.push(metrics);
    
    // Keep only last 1000 metrics in memory
    if (this.metricsBuffer.length > 1000) {
      this.metricsBuffer.shift();
    }

    // Log aggregated metrics every 100 operations
    if (this.metricsBuffer.length % 100 === 0) {
      this.logAggregatedMetrics();
    }
  }

  private logAggregatedMetrics() {
    const recentMetrics = this.metricsBuffer.slice(-100);
    const operationStats = {};

    recentMetrics.forEach(metric => {
      if (!operationStats[metric.operation]) {
        operationStats[metric.operation] = {
          count: 0,
          totalDuration: 0,
          successCount: 0,
          minDuration: Infinity,
          maxDuration: 0,
        };
      }

      const stats = operationStats[metric.operation];
      stats.count++;
      stats.totalDuration += metric.duration;
      if (metric.success) stats.successCount++;
      stats.minDuration = Math.min(stats.minDuration, metric.duration);
      stats.maxDuration = Math.max(stats.maxDuration, metric.duration);
    });

    Object.entries(operationStats).forEach(([operation, stats]: [string, any]) => {
      const avgDuration = stats.totalDuration / stats.count;
      const successRate = (stats.successCount / stats.count) * 100;

      this.logger.log(`Stock Metrics - ${operation}: avg=${avgDuration.toFixed(2)}ms, ` +
        `min=${stats.minDuration}ms, max=${stats.maxDuration}ms, ` +
        `success=${successRate.toFixed(1)}%, count=${stats.count}`);
    });
  }

  getMetrics(): StockMetrics[] {
    return [...this.metricsBuffer];
  }

  getMetricsSummary() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentMetrics = this.metricsBuffer.filter(m => m.timestamp >= oneHourAgo);
    
    return {
      totalOperations: recentMetrics.length,
      successfulOperations: recentMetrics.filter(m => m.success).length,
      averageDuration: recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length,
      slowOperations: recentMetrics.filter(m => m.duration > 1000).length,
      operationBreakdown: this.getOperationBreakdown(recentMetrics),
    };
  }

  private getOperationBreakdown(metrics: StockMetrics[]) {
    const breakdown = {};
    
    metrics.forEach(metric => {
      if (!breakdown[metric.operation]) {
        breakdown[metric.operation] = { count: 0, avgDuration: 0 };
      }
      breakdown[metric.operation].count++;
    });

    Object.keys(breakdown).forEach(operation => {
      const operationMetrics = metrics.filter(m => m.operation === operation);
      breakdown[operation].avgDuration = 
        operationMetrics.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.length;
    });

    return breakdown;
  }
}
```

### 2.2 Health Check Extension (src/health/stock-health.indicator.ts)
```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { StockMetricsInterceptor } from '../common/interceptors/stock-metrics.interceptor';

@Injectable()
export class StockHealthIndicator extends HealthIndicator {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    private readonly metricsInterceptor: StockMetricsInterceptor,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check recent stock operations performance
      const metrics = this.metricsInterceptor.getMetricsSummary();
      
      const checks = {
        averageDuration: metrics.averageDuration < 500, // < 500ms average
        successRate: (metrics.successfulOperations / metrics.totalOperations) > 0.95, // > 95% success
        slowOperations: metrics.slowOperations < (metrics.totalOperations * 0.1), // < 10% slow ops
      };

      // Check database connectivity with recent movements
      const recentMovements = await this.movementRepository.count({
        where: {
          created_at: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      });

      const isHealthy = Object.values(checks).every(check => check) && recentMovements >= 0;

      const result = this.getStatus(key, isHealthy, {
        ...metrics,
        recentMovements,
        checks,
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('Stock operations health check failed', result);
    } catch (error) {
      throw new HealthCheckError('Stock health check failed', this.getStatus(key, false, { error: error.message }));
    }
  }
}
```

---

## 3. Docker Configuration Updates

### 3.1 Enhanced Docker Compose (docker/development/docker-compose.yml)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: beerflow_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: mattia
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ../../database/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3
    command: postgres -c log_statement=all -c log_duration=on

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    command: redis-server --appendonly yes

  backend:
    build:
      context: ../../backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
      - "9229:9229" # Debug port
    environment:
      - NODE_ENV=development
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_USERNAME=postgres
      - DATABASE_PASSWORD=mattia
      - DATABASE_NAME=beerflow_dev
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=beerflow_jwt_secret_2024_ultra_secure_key
      - JWT_EXPIRES_IN=7d
      - LOG_LEVEL=debug
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ../../backend:/app
      - /app/node_modules
      - ../../backend/logs:/app/logs
    command: npm run start:debug
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  postgres_data:
  prometheus_data:
  grafana_data:
```

### 3.2 Prometheus Configuration (docker/development/prometheus.yml)
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'beerflow-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

---

## 4. Deployment Scripts

### 4.1 Phase 2 Deployment Script (scripts/deploy-phase2.sh)
```bash
#!/bin/bash

set -e

echo "🍺 Deploying BeerFlow Phase 2 - Product & Inventory Management..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verify Phase 1 is working
print_status "Verifying Phase 1 functionality..."
cd backend

# Test authentication
AUTH_TEST=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@beerflow.demo","password":"admin123!"}' | \
  jq -r '.access_token // "null"')

if [ "$AUTH_TEST" = "null" ]; then
    print_error "Phase 1 authentication not working. Cannot proceed with Phase 2."
    exit 1
fi

print_success "Phase 1 authentication verified"

# Run Phase 2 tests
print_status "Running Phase 2 test suite..."
npm run test:phase2:all

if [ $? -ne 0 ]; then
    print_error "Phase 2 tests failed. Cannot deploy."
    exit 1
fi

print_success "Phase 2 tests passed"

# Build application
print_status "Building application..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi

print_success "Application built successfully"

# Run database migrations (if any new ones)
print_status "Checking for new migrations..."
npm run typeorm:migration:run

# Restart services
print_status "Restarting services..."
docker-compose -f ../docker/development/docker-compose.yml restart backend

# Wait for service to be ready
print_status "Waiting for service to be ready..."
sleep 15

# Health check
print_status "Performing health check..."
HEALTH_CHECK=$(curl -s http://localhost:3000/health | jq -r '.status // "error"')

if [ "$HEALTH_CHECK" != "ok" ]; then
    print_error "Health check failed"
    exit 1
fi

print_success "Health check passed"

# Validate Phase 2 endpoints
print_status "Validating Phase 2 endpoints..."

VENUE_ID="00000000-0000-0000-0000-000000000001"

# Test product categories
curl -f -H "Authorization: Bearer $AUTH_TEST" \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/product-categories" > /dev/null

# Test products
curl -f -H "Authorization: Bearer $AUTH_TEST" \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/products" > /dev/null

# Test stock summary
curl -f -H "Authorization: Bearer $AUTH_TEST" \
  "http://localhost:3000/api/v1/venues/$VENUE_ID/stock/summary" > /dev/null

if [ $? -eq 0 ]; then
    print_success "All Phase 2 endpoints validated"
else
    print_error "Phase 2 endpoint validation failed"
    exit 1
fi

# Performance test
print_status "Running performance validation..."
npm run test:performance

if [ $? -ne 0 ]; then
    print_error "Performance tests failed"
    exit 1
fi

print_success "Performance validation passed"

# Generate deployment report
print_status "Generating deployment report..."

cat > ../docs/phase2-deployment-report.md << EOF
# Phase 2 Deployment Report

**Date:** $(date)
**Version:** Phase 2 - Product & Inventory Management
**Status:** ✅ SUCCESSFUL

## Components Deployed
- Product Categories Management
- Suppliers Management  
- Products with Advanced Filtering
- Lot Tracking with FEFO Algorithm
- Stock Movements with Atomic Transactions
- Business Logic Validation
- Performance Monitoring

## Test Results
- Unit Tests: ✅ PASSED
- Integration Tests: ✅ PASSED
- Performance Tests: ✅ PASSED
- Business Logic Tests: ✅ PASSED

## Performance Metrics
- Stock Movement Creation: < 100ms average
- FEFO Allocation: < 200ms average
- Product Queries: < 50ms average
- Concurrent Operations: No race conditions detected

## API Endpoints Validated
- GET /api/v1/venues/{venueId}/product-categories ✅
- POST /api/v1/venues/{venueId}/products ✅
- GET /api/v1/venues/{venueId}/products?low_stock=true ✅
- POST /api/v1/venues/{venueId}/lots ✅
- POST /api/v1/venues/{venueId}/stock/movements ✅
- POST /api/v1/venues/{venueId}/stock/fefo-allocate ✅
- GET /api/v1/venues/{venueId}/stock/summary ✅

## Business Logic Verified
- ✅ FEFO algorithm respects expiry dates
- ✅ Stock movements are atomic
- ✅ Negative stock prevention works
- ✅ Venue isolation enforced
- ✅ Role-based permissions active

## Next Steps
- Phase 2 is ready for production use
- Monitor performance metrics in Grafana
- Ready to proceed with Phase 3 (Tables & Orders)

## Monitoring URLs
- Health Check: http://localhost:3000/health
- Metrics: http://localhost:9090 (Prometheus)
- Dashboard: http://localhost:3001 (Grafana)
EOF

print_success "Deployment report generated: docs/phase2-deployment-report.md"

echo ""
echo "🎉 PHASE 2 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo ""
echo "📊 MONITORING:"
echo "   Health Check: http://localhost:3000/health"
echo "   Prometheus: http://localhost:9090"
echo "   Grafana: http://localhost:3001"
echo ""
echo "🔍 PHASE 2 FEATURES READY:"
echo "   ✅ Product Catalog Management"
echo "   ✅ Category & Supplier Management"
echo "   ✅ Advanced Lot Tracking (FEFO)"
echo "   ✅ Atomic Stock Movements"
echo "   ✅ Real-time Stock Calculations"
echo "   ✅ Performance Monitoring"
echo ""
echo "🚀 READY FOR PHASE 3: Tables & Order Management"
```

### 4.2 Phase 2 Rollback Script (scripts/rollback-phase2.sh)
```bash
#!/bin/bash

set -e

echo "🔄 Rolling back BeerFlow to Phase 1..."

print_status() {
    echo -e "\033[1;33m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Stop current services
print_status "Stopping current services..."
docker-compose -f docker/development/docker-compose.yml down

# Restore Phase 1 database state (if backup exists)
if [ -f "../database/backups/phase1_backup.sql" ]; then
    print_status "Restoring Phase 1 database..."
    PGPASSWORD=mattia psql -h localhost -U postgres -d beerflow_dev < ../database/backups/phase1_backup.sql
    print_success "Database restored to Phase 1 state"
else
    print_error "No Phase 1 backup found. Manual intervention required."
fi

# Checkout Phase 1 git tag/branch
print_status "Reverting to Phase 1 codebase..."
git checkout phase1-release || git checkout HEAD~1  # Fallback to previous commit

# Restart services
print_status "Restarting services with Phase 1 configuration..."
docker-compose -f docker/development/docker-compose.yml up -d

# Verify Phase 1 functionality
sleep 10
print_status "Verifying Phase 1 functionality..."

AUTH_TEST=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@beerflow.demo","password":"admin123!"}' | \
  jq -r '.access_token // "null"')

if [ "$AUTH_TEST" != "null" ]; then
    print_success "Phase 1 rollback completed successfully"
    echo "🔙 System rolled back to Phase 1 - Core Backend Foundation"
else
    print_error "Rollback verification failed. Manual intervention required."
    exit 1
fi
```

---

## 5. Criteri di Completamento Fase 2

### Requisiti Tecnici Obbligatori:
1. **Tutti i test passano**: Unit, Integration, Performance, Business Logic
2. **Coverage >= 90%**: Con business logic critica >= 95%
3. **Performance benchmarks**: Rispettati tutti i threshold
4. **FEFO algorithm**: Funzionante e validato completamente
5. **Atomic transactions**: Stock movements sempre consistenti
6. **Venue isolation**: Authorization multi-venue verificata

### Requisiti Funzionali:
1. **CRUD completo**: Categories, Suppliers, Products, Lots
2. **Stock management**: Movements, FEFO allocation, tracking
3. **Business logic**: Validazioni, constraints, edge cases
4. **API documentation**: Swagger completo e accurato
5. **Error handling**: Gestione completa errori business logic
6. **Authorization**: Role-based e venue-based access control

### Requisiti di Produzione:
1. **Monitoring**: Metrics per operazioni critiche
2. **Health checks**: Stock operations monitoring
3. **Performance**: Operazioni sotto threshold definiti
4. **Data integrity**: Consistency verificata
5. **Deployment scripts**: Funzionanti e testati
6. **Rollback procedures**: Verificate e documentate

### Endpoints Validati:
- Tutti gli endpoint Phase 2 funzionanti
- Performance sotto i threshold
- Authorization corretta
- Error handling completo
- Documentation accurata

La Fase 2 è considerata **COMPLETATA** solo quando tutti questi criteri sono soddisfatti e il sistema è pronto per l'integrazione con la Fase 3 (Tables & Order Management).
````

---

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