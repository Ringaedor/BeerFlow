import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StockService } from './stock.service';
import { Product } from '../database/entities/product.entity';
import { Lot } from '../database/entities/lot.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { Venue } from '../database/entities/venue.entity';
import { User } from '../database/entities/user.entity';
import { StockMovementType } from '../database/enums/stock-movement-type.enum';
import { TestDataFactory } from '../test/factories/test-data.factory';
import { getTestDatabaseConfig } from '../config/database-test.config';
import {
  createRaceCondition,
  executeConcurrently,
} from '../test/utils/concurrency.util';

/**
 * Stock Service Integration Tests
 *
 * Tests complete workflows with real database transactions:
 * - Product lifecycle (create -> add stock -> consume -> deplete)
 * - FEFO allocation with database
 * - Atomic transaction rollback on errors
 * - Concurrent operations and race conditions
 * - Stock consistency validation
 */
describe('StockService - Integration Tests (with DB)', () => {
  let module: TestingModule;
  let stockService: StockService;
  let dataSource: DataSource;
  let venue: Venue;
  let user: User;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getTestDatabaseConfig()),
        TypeOrmModule.forFeature([
          Product,
          Lot,
          StockMovement,
          Venue,
          User,
        ]),
      ],
      providers: [StockService],
    }).compile();

    stockService = module.get<StockService>(StockService);
    dataSource = module.get<DataSource>(DataSource);

    // Create test venue and user
    const venueRepo = dataSource.getRepository(Venue);
    const userRepo = dataSource.getRepository(User);

    venue = await venueRepo.save(TestDataFactory.createVenue());
    user = await userRepo.save(TestDataFactory.createUser(venue.id));
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await dataSource.getRepository(StockMovement).delete({});
    await dataSource.getRepository(Lot).delete({});
    await dataSource.getRepository(Product).delete({});
    TestDataFactory.reset();
  });

  describe('Product Lifecycle - Complete Workflow', () => {
    it('should handle complete product lifecycle: create -> purchase -> sale', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      // 1. Create product with lot tracking
      let product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id, {
          sku: 'TEST-LIFECYCLE-001',
        }),
      );

      expect(product.current_stock).toBe(0);

      // 2. Create lot (simulates receiving stock)
      const lot = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 30, 100),
      );

      // 3. Execute purchase movement (atomic)
      const purchaseMovement = await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot.id,
          movement_type: StockMovementType.PURCHASE,
          quantity: 100,
          unit_cost: 1.5,
          reference: 'PO-001',
        },
        user.id,
      );

      expect(purchaseMovement).toBeDefined();
      expect(purchaseMovement.quantity).toBe(100);
      expect(purchaseMovement.qty_before).toBe(0);
      expect(purchaseMovement.qty_after).toBe(100);

      // Verify product stock updated
      product = await productRepo.findOne({ where: { id: product.id } });
      expect(Number(product.current_stock)).toBe(100);

      // 4. Execute sale movement (atomic, negative quantity)
      const saleMovement = await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot.id,
          movement_type: StockMovementType.SALE,
          quantity: -30,
          reference: 'ORDER-001',
        },
        user.id,
      );

      expect(saleMovement.quantity).toBe(-30);
      expect(saleMovement.qty_before).toBe(100);
      expect(saleMovement.qty_after).toBe(70);

      // Verify final stock
      product = await productRepo.findOne({ where: { id: product.id } });
      expect(Number(product.current_stock)).toBe(70);

      // Verify lot quantity updated
      const updatedLot = await lotRepo.findOne({ where: { id: lot.id } });
      expect(Number(updatedLot.qty_current)).toBe(70);
    });

    it('should handle multiple lots with FEFO consumption', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      // Create product
      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );

      // Create 3 lots with different expiration dates
      const lot1 = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 10, 30, {
          lot_number: 'LOT-NEAR',
        }),
      );
      const lot2 = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 30, 40, {
          lot_number: 'LOT-MEDIUM',
        }),
      );
      const lot3 = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 60, 50, {
          lot_number: 'LOT-FAR',
        }),
      );

      // Add stock to each lot
      await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot1.id,
          movement_type: StockMovementType.PURCHASE,
          quantity: 30,
        },
        user.id,
      );
      await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot2.id,
          movement_type: StockMovementType.PURCHASE,
          quantity: 40,
        },
        user.id,
      );
      await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot3.id,
          movement_type: StockMovementType.PURCHASE,
          quantity: 50,
        },
        user.id,
      );

      // Execute FEFO-based sale (should consume from lot1 first)
      const movements = await stockService.executeFEFOMovement(
        product.id,
        50,
        venue.id,
        user.id,
        StockMovementType.SALE,
        'ORDER-FEFO-001',
      );

      expect(movements).toHaveLength(2); // Should use 2 lots

      // Verify lot1 depleted and lot2 partially consumed
      const updatedLot1 = await lotRepo.findOne({ where: { id: lot1.id } });
      const updatedLot2 = await lotRepo.findOne({ where: { id: lot2.id } });
      const updatedLot3 = await lotRepo.findOne({ where: { id: lot3.id } });

      expect(Number(updatedLot1.qty_current)).toBe(0); // Fully depleted
      expect(Number(updatedLot2.qty_current)).toBe(20); // Partially consumed
      expect(Number(updatedLot3.qty_current)).toBe(50); // Untouched
    });
  });

  describe('Atomic Transactions - Rollback on Error', () => {
    it('should rollback transaction on negative stock attempt', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);
      const movementRepo = dataSource.getRepository(StockMovement);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );
      const lot = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 30, 50),
      );

      // Add 50 units
      await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot.id,
          movement_type: StockMovementType.PURCHASE,
          quantity: 50,
        },
        user.id,
      );

      // Try to remove 100 units (should fail)
      await expect(
        stockService.executeStockMovement(
          {
            venue_id: venue.id,
            product_id: product.id,
            lot_id: lot.id,
            movement_type: StockMovementType.SALE,
            quantity: -100,
          },
          user.id,
        ),
      ).rejects.toThrow('negative');

      // Verify stock unchanged
      const updatedProduct = await productRepo.findOne({
        where: { id: product.id },
      });
      const updatedLot = await lotRepo.findOne({ where: { id: lot.id } });

      expect(Number(updatedProduct.current_stock)).toBe(50);
      expect(Number(updatedLot.qty_current)).toBe(50);

      // Verify no failed movement recorded
      const movements = await movementRepo.find({
        where: { product_id: product.id },
      });
      expect(movements).toHaveLength(1); // Only successful purchase
    });

    it('should maintain stock consistency across complex operations', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);
      const movementRepo = dataSource.getRepository(StockMovement);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );
      const lot = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 30, 100),
      );

      // Complex sequence: purchase -> sale -> adjustment -> waste
      await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot.id,
          movement_type: StockMovementType.PURCHASE,
          quantity: 100,
        },
        user.id,
      );

      await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot.id,
          movement_type: StockMovementType.SALE,
          quantity: -30,
        },
        user.id,
      );

      await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot.id,
          movement_type: StockMovementType.ADJUSTMENT,
          quantity: 5,
        },
        user.id,
      );

      await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot.id,
          movement_type: StockMovementType.WASTE,
          quantity: -10,
        },
        user.id,
      );

      // Verify stock consistency
      const movements = await movementRepo.find({
        where: { product_id: product.id },
        order: { created_at: 'ASC' },
      });

      expect(movements).toHaveLength(4);

      // Calculate expected stock from movements
      const calculatedStock = movements.reduce(
        (sum, m) => sum + Number(m.quantity),
        0,
      );

      const finalProduct = await productRepo.findOne({
        where: { id: product.id },
      });
      const finalLot = await lotRepo.findOne({ where: { id: lot.id } });

      expect(Number(finalProduct.current_stock)).toBe(calculatedStock);
      expect(Number(finalLot.qty_current)).toBe(calculatedStock);
      expect(calculatedStock).toBe(65); // 100 - 30 + 5 - 10
    });
  });

  describe('Concurrency Tests - Race Conditions', () => {
    it('should prevent overselling with concurrent stock movements', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );
      const lot = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 30, 100),
      );

      // Add 100 units
      await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot.id,
          movement_type: StockMovementType.PURCHASE,
          quantity: 100,
        },
        user.id,
      );

      // Attempt to sell 30 units 5 times concurrently (total 150, only 100 available)
      const concurrentSales = async () => {
        return stockService.executeStockMovement(
          {
            venue_id: venue.id,
            product_id: product.id,
            lot_id: lot.id,
            movement_type: StockMovementType.SALE,
            quantity: -30,
          },
          user.id,
        );
      };

      const result = await createRaceCondition(concurrentSales, 5);

      // Some should succeed, some should fail
      expect(result.successCount).toBeLessThan(5);
      expect(result.failureCount).toBeGreaterThan(0);

      // Verify stock never went negative
      const finalProduct = await productRepo.findOne({
        where: { id: product.id },
      });

      expect(Number(finalProduct.current_stock)).toBeGreaterThanOrEqual(0);
      expect(Number(finalProduct.current_stock)).toBeLessThanOrEqual(100);

      // Verify stock consistency
      const movements = await dataSource.getRepository(StockMovement).find({
        where: {
          product_id: product.id,
          movement_type: StockMovementType.SALE,
        },
      });

      const totalSold = movements.reduce(
        (sum, m) => sum + Math.abs(Number(m.quantity)),
        0,
      );
      expect(Number(finalProduct.current_stock)).toBe(100 - totalSold);
    });

    it('should handle concurrent purchases without data corruption', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );
      const lot = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 30, 0),
      );

      // Execute 10 concurrent purchases of 10 units each
      const concurrentPurchases = Array(10)
        .fill(null)
        .map(() => async () =>
          stockService.executeStockMovement(
            {
              venue_id: venue.id,
              product_id: product.id,
              lot_id: lot.id,
              movement_type: StockMovementType.PURCHASE,
              quantity: 10,
            },
            user.id,
          ),
        );

      const result = await executeConcurrently(concurrentPurchases);

      // All should succeed
      expect(result.successCount).toBe(10);
      expect(result.failureCount).toBe(0);

      // Verify final stock is exactly 100
      const finalProduct = await productRepo.findOne({
        where: { id: product.id },
      });
      expect(Number(finalProduct.current_stock)).toBe(100);

      // Verify movements recorded correctly
      const movements = await dataSource.getRepository(StockMovement).find({
        where: { product_id: product.id },
      });

      expect(movements).toHaveLength(10);
      movements.forEach((m) => {
        expect(Number(m.quantity)).toBe(10);
      });
    });
  });

  describe('Stock Summary - Real Data', () => {
    it('should return accurate stock summary with multiple lots', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id, {
          name: 'Test Beer',
          sku: 'BEER-001',
          minimum_stock: 20,
        }),
      );

      const lots = await lotRepo.save([
        TestDataFactory.createLotWithExpiry(product.id, 10, 30, {
          lot_number: 'LOT-1',
        }),
        TestDataFactory.createLotWithExpiry(product.id, 30, 40, {
          lot_number: 'LOT-2',
        }),
        TestDataFactory.createLotWithExpiry(product.id, 60, 50, {
          lot_number: 'LOT-3',
        }),
      ]);

      // Add stock
      for (const lot of lots) {
        await stockService.executeStockMovement(
          {
            venue_id: venue.id,
            product_id: product.id,
            lot_id: lot.id,
            movement_type: StockMovementType.PURCHASE,
            quantity: Number(lot.qty_initial),
          },
          user.id,
        );
      }

      const summary = await stockService.getStockSummary(product.id, venue.id);

      expect(summary.product_name).toBe('Test Beer');
      expect(summary.sku).toBe('BEER-001');
      expect(summary.current_stock).toBe(120);
      expect(summary.minimum_stock).toBe(20);
      expect(summary.below_minimum).toBe(false);
      expect(summary.lots).toHaveLength(3);

      // Verify lots sorted by FEFO
      expect(summary.lots[0].lot_number).toBe('LOT-1'); // Expires soonest
    });
  });
});
