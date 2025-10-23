import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Phase 2 Integration Tests
 *
 * Tests complete product lifecycle integration with Phase 1:
 * - Authentication with JWT
 * - Venue-based data isolation
 * - Product CRUD operations
 * - Lot tracking with FEFO
 * - Atomic stock movements
 * - Health checks for stock operations
 */
describe('Phase 2 - Product & Inventory Integration (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let accessToken: string;
  let venueId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same pipes as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('Phase 1 Integration - Authentication & Venue Setup', () => {
    it('should create venue and authenticate user', async () => {
      // This assumes Phase 1 auth endpoints exist
      // Adjust based on actual Phase 1 implementation

      // 1. Create venue (if endpoint exists) or use existing
      // For now, we'll authenticate with existing test user
      // and extract venue_id from JWT token

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
      accessToken = loginResponse.body.access_token;

      // Decode token to get user info (in real app)
      // For test, we'll get user info from /auth/me endpoint
      const meResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body).toHaveProperty('id');
      expect(meResponse.body).toHaveProperty('venue_id');

      userId = meResponse.body.id;
      venueId = meResponse.body.venue_id;
    });

    it('should reject unauthenticated requests to protected endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(401);
    });
  });

  describe('Product Lifecycle - Complete Flow', () => {
    let categoryId: string;
    let supplierId: string;
    let productId: string;
    let lotId1: string;
    let lotId2: string;

    it('should create product category', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/product-categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Beers',
          description: 'Test beer category',
          color: '#FFD700',
          icon: 'beer',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Beers');
      expect(response.body.venue_id).toBe(venueId);

      categoryId = response.body.id;
    });

    it('should create supplier', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Brewery',
          contact_person: 'John Brewer',
          email: 'john@testbrewery.com',
          phone: '+39 123 456 7890',
          address: 'Via Test 123, Rome',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Brewery');
      expect(response.body.venue_id).toBe(venueId);

      supplierId = response.body.id;
    });

    it('should create product with lot tracking enabled', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          category_id: categoryId,
          supplier_id: supplierId,
          name: 'Test Pilsner 33cl',
          sku: 'BEER-TEST-001',
          description: 'Test pilsner beer',
          product_type: 'beer',
          unit_of_measure: 'bottle',
          cost_price: 1.50,
          sell_price: 3.50,
          minimum_stock: 24,
          optimal_stock: 100,
          track_lots: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Pilsner 33cl');
      expect(response.body.sku).toBe('BEER-TEST-001');
      expect(response.body.track_lots).toBe(true);
      expect(response.body.current_stock).toBe(0);
      expect(response.body.venue_id).toBe(venueId);

      productId = response.body.id;
    });

    it('should create first lot with expiration date', async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30); // Expires in 30 days

      const response = await request(app.getHttpServer())
        .post('/api/v1/lots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          lot_number: 'LOT-2024-001',
          qty_initial: 100,
          cost_price: 1.45,
          expiration_date: expirationDate.toISOString().split('T')[0],
          received_date: new Date().toISOString().split('T')[0],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.lot_number).toBe('LOT-2024-001');
      expect(response.body.qty_initial).toBe(100);
      expect(response.body.qty_current).toBe(100);

      lotId1 = response.body.id;
    });

    it('should create second lot with earlier expiration (for FEFO testing)', async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 15); // Expires in 15 days (sooner)

      const response = await request(app.getHttpServer())
        .post('/api/v1/lots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          lot_number: 'LOT-2024-002',
          qty_initial: 50,
          cost_price: 1.40,
          expiration_date: expirationDate.toISOString().split('T')[0],
          received_date: new Date().toISOString().split('T')[0],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.lot_number).toBe('LOT-2024-002');

      lotId2 = response.body.id;
    });

    it('should record purchase stock movement for first lot', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/stock-movements')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          lot_id: lotId1,
          movement_type: 'purchase',
          quantity: 100,
          unit_cost: 1.45,
          reference: 'PO-2024-001',
          notes: 'Initial purchase',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.quantity).toBe(100);
      expect(response.body.movement_type).toBe('purchase');
      expect(response.body.qty_before).toBe(0);
      expect(response.body.qty_after).toBe(100);
      expect(response.body.venue_id).toBe(venueId);
    });

    it('should record purchase stock movement for second lot', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/stock-movements')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          lot_id: lotId2,
          movement_type: 'purchase',
          quantity: 50,
          unit_cost: 1.40,
          reference: 'PO-2024-002',
        })
        .expect(201);

      expect(response.body.qty_after).toBe(150); // Total stock now 150
    });

    it('should verify product current_stock updated atomically', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.current_stock).toBe(150);
    });

    it('should get stock summary with FEFO lot order', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/stock-movements/stock-summary/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.product_name).toBe('Test Pilsner 33cl');
      expect(response.body.current_stock).toBe(150);
      expect(response.body.track_lots).toBe(true);
      expect(response.body.lots).toHaveLength(2);

      // FEFO: LOT-2024-002 should be first (expires sooner)
      expect(response.body.lots[0].lot_number).toBe('LOT-2024-002');
      expect(response.body.lots[0].qty_current).toBe(50);
      expect(response.body.lots[1].lot_number).toBe('LOT-2024-001');
      expect(response.body.lots[1].qty_current).toBe(100);
    });

    it('should record sale movement using FEFO allocation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/stock-movements')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          movement_type: 'sale',
          quantity: -60, // Negative for outgoing
          reference: 'ORDER-001',
          notes: 'Customer order',
        })
        .expect(201);

      expect(response.body.quantity).toBe(-60);
      expect(response.body.qty_after).toBe(90); // 150 - 60
    });

    it('should verify FEFO allocation consumed lot with nearest expiration first', async () => {
      // After selling 60 units:
      // - LOT-2024-002 (50 units, expires sooner) should be fully consumed
      // - LOT-2024-001 (100 units) should have 90 units left

      const lot2Response = await request(app.getHttpServer())
        .get(`/api/v1/lots/${lotId2}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(lot2Response.body.qty_current).toBe(0); // Fully consumed

      const lot1Response = await request(app.getHttpServer())
        .get(`/api/v1/lots/${lotId1}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(lot1Response.body.qty_current).toBe(90); // 100 - 10
    });

    it('should prevent overselling (negative stock)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock-movements')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          movement_type: 'sale',
          quantity: -200, // More than available (90)
          reference: 'ORDER-002',
        })
        .expect(400);

      // Verify stock unchanged
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.current_stock).toBe(90);
    });

    it('should get movement history for product', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/stock-movements/product/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3); // 2 purchases + 1 sale

      // Verify immutable audit trail
      const movements = response.body;
      movements.forEach((movement: any) => {
        expect(movement).toHaveProperty('qty_before');
        expect(movement).toHaveProperty('qty_after');
        expect(movement).toHaveProperty('movement_date');
        expect(movement.venue_id).toBe(venueId);
      });
    });
  });

  describe('Venue Isolation - Security', () => {
    let otherAccessToken: string;
    let otherVenueId: string;

    it('should authenticate user from different venue', async () => {
      // Assumes a second test user exists in different venue
      // Skip if not available
      try {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'admin2@test.com',
            password: 'password123',
          });

        if (response.status === 200) {
          otherAccessToken = response.body.access_token;

          const meResponse = await request(app.getHttpServer())
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${otherAccessToken}`);

          otherVenueId = meResponse.body.venue_id;
        }
      } catch (error) {
        // Skip test if second user doesn't exist
        return;
      }
    });

    it('should not see products from other venue', async () => {
      if (!otherAccessToken) {
        return; // Skip if no second user
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(200);

      // Should not contain products from first venue
      const productFromOtherVenue = response.body.find(
        (p: any) => p.venue_id === venueId,
      );
      expect(productFromOtherVenue).toBeUndefined();
    });
  });

  describe('Health Checks - Stock Operations', () => {
    it('should return healthy status for general health check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should return healthy status for stock operations', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/stock')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info).toHaveProperty('stock_operations');
    });

    it('should return healthy database check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('Performance - Stock Operations', () => {
    let testProductId: string;
    let testLotId: string;

    beforeAll(async () => {
      // Create product for performance testing
      const productResponse = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Performance Test Product',
          sku: 'PERF-TEST-001',
          product_type: 'beer',
          unit_of_measure: 'bottle',
          cost_price: 1.0,
          sell_price: 2.0,
          track_lots: true,
        });

      testProductId = productResponse.body.id;

      // Create lot
      const lotResponse = await request(app.getHttpServer())
        .post('/api/v1/lots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: testProductId,
          lot_number: 'PERF-LOT-001',
          qty_initial: 1000,
          cost_price: 1.0,
        });

      testLotId = lotResponse.body.id;

      // Add initial stock
      await request(app.getHttpServer())
        .post('/api/v1/stock-movements')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: testProductId,
          lot_id: testLotId,
          movement_type: 'purchase',
          quantity: 1000,
          unit_cost: 1.0,
        });
    });

    it('should complete stock movement in < 200ms', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post('/api/v1/stock-movements')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: testProductId,
          lot_id: testLotId,
          movement_type: 'sale',
          quantity: -10,
          reference: 'PERF-TEST',
        })
        .expect(201);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // Performance requirement
    });

    it('should complete product query in < 100ms', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Performance requirement
    });

    it('should complete FEFO stock summary in < 200ms', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get(`/api/v1/stock-movements/stock-summary/${testProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // Performance requirement
    });
  });

  describe('Data Validation - Business Rules', () => {
    it('should reject duplicate SKU', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Duplicate SKU Product',
          sku: 'BEER-TEST-001', // Already used
          product_type: 'beer',
          unit_of_measure: 'bottle',
          cost_price: 1.0,
          sell_price: 2.0,
        })
        .expect(409); // Conflict
    });

    it('should reject negative cost price', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Invalid Price Product',
          sku: 'INVALID-001',
          product_type: 'beer',
          unit_of_measure: 'bottle',
          cost_price: -1.0, // Invalid
          sell_price: 2.0,
        })
        .expect(400);
    });

    it('should reject invalid product type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Invalid Type Product',
          sku: 'INVALID-002',
          product_type: 'invalid_type',
          unit_of_measure: 'bottle',
          cost_price: 1.0,
          sell_price: 2.0,
        })
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Incomplete Product',
          // Missing sku, product_type, etc.
        })
        .expect(400);
    });
  });
});
