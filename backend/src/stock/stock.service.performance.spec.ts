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

/**
 * Stock Service Performance Tests
 *
 * Validates performance benchmarks:
 * - Stock movement creation: < 100ms average
 * - FEFO allocation: < 200ms average
 * - 100 sequential movements: < 5s
 * - 50 FEFO allocations: < 10s
 */
describe('StockService - Performance Tests', () => {
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
    await dataSource.getRepository(StockMovement).delete({});
    await dataSource.getRepository(Lot).delete({});
    await dataSource.getRepository(Product).delete({});
    TestDataFactory.reset();
  });

  describe('Stock Movement Performance', () => {
    it('should create stock movement in < 100ms average', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );
      const lot = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 30, 1000),
      );

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await stockService.executeStockMovement(
          {
            venue_id: venue.id,
            product_id: product.id,
            lot_id: lot.id,
            movement_type: StockMovementType.PURCHASE,
            quantity: 10,
            unit_cost: 1.5,
          },
          user.id,
        );

        const duration = Date.now() - startTime;
        times.push(duration);
      }

      const averageTime =
        times.reduce((sum, t) => sum + t, 0) / iterations;
      const maxTime = Math.max(...times);

      console.log(
        `Stock Movement Performance: avg=${averageTime}ms, max=${maxTime}ms`,
      );

      expect(averageTime).toBeLessThan(100); // < 100ms average
      expect(maxTime).toBeLessThan(500); // < 500ms max
    });

    it('should execute 100 sequential movements in < 5 seconds', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );
      const lot = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 30, 10000),
      );

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await stockService.executeStockMovement(
          {
            venue_id: venue.id,
            product_id: product.id,
            lot_id: lot.id,
            movement_type: StockMovementType.PURCHASE,
            quantity: 10,
          },
          user.id,
        );
      }

      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / 100;

      console.log(
        `100 Movements: total=${totalTime}ms, avg=${averageTime}ms`,
      );

      expect(totalTime).toBeLessThan(5000); // < 5 seconds
      expect(averageTime).toBeLessThan(50); // < 50ms average
    });
  });

  describe('FEFO Allocation Performance', () => {
    it('should execute FEFO allocation in < 200ms average', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );

      // Create 10 lots with different expiration dates
      const lots = [];
      for (let i = 0; i < 10; i++) {
        const lot = await lotRepo.save(
          TestDataFactory.createLotWithExpiry(product.id, (i + 1) * 10, 100, {
            lot_number: `LOT-${i + 1}`,
          }),
        );
        lots.push(lot);

        // Add stock to each lot
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
      }

      const iterations = 20;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await stockService.allocateFEFO(product.id, 150, venue.id);

        const duration = Date.now() - startTime;
        times.push(duration);
      }

      const averageTime =
        times.reduce((sum, t) => sum + t, 0) / iterations;
      const maxTime = Math.max(...times);

      console.log(`FEFO Allocation: avg=${averageTime}ms, max=${maxTime}ms`);

      expect(averageTime).toBeLessThan(200); // < 200ms average
      expect(maxTime).toBeLessThan(500); // < 500ms max
    });

    it('should execute 50 FEFO allocations in < 10 seconds', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );

      // Create 5 lots
      for (let i = 0; i < 5; i++) {
        const lot = await lotRepo.save(
          TestDataFactory.createLotWithExpiry(product.id, (i + 1) * 15, 1000),
        );

        await stockService.executeStockMovement(
          {
            venue_id: venue.id,
            product_id: product.id,
            lot_id: lot.id,
            movement_type: StockMovementType.PURCHASE,
            quantity: 1000,
          },
          user.id,
        );
      }

      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        await stockService.allocateFEFO(product.id, 50, venue.id);
      }

      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / 50;

      console.log(`50 FEFO Allocations: total=${totalTime}ms, avg=${averageTime}ms`);

      expect(totalTime).toBeLessThan(10000); // < 10 seconds
      expect(averageTime).toBeLessThan(200); // < 200ms average
    });

    it('should handle FEFO with large number of lots efficiently', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );

      // Create 50 lots (stress test)
      for (let i = 0; i < 50; i++) {
        const lot = await lotRepo.save(
          TestDataFactory.createLotWithExpiry(product.id, i + 1, 50),
        );

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
      }

      const startTime = Date.now();

      const result = await stockService.allocateFEFO(
        product.id,
        1000,
        venue.id,
      );

      const duration = Date.now() - startTime;

      console.log(`FEFO with 50 lots: ${duration}ms`);

      expect(duration).toBeLessThan(500); // Should still be fast
      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(1000);
    });
  });

  describe('Stock Summary Performance', () => {
    it('should retrieve stock summary quickly', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );

      // Create 20 lots
      for (let i = 0; i < 20; i++) {
        const lot = await lotRepo.save(
          TestDataFactory.createLotWithExpiry(product.id, i + 1, 100),
        );

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
      }

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await stockService.getStockSummary(product.id, venue.id);

        const duration = Date.now() - startTime;
        times.push(duration);
      }

      const averageTime =
        times.reduce((sum, t) => sum + t, 0) / iterations;

      console.log(`Stock Summary: avg=${averageTime}ms`);

      expect(averageTime).toBeLessThan(50); // < 50ms average
    });
  });

  describe('Complex Workflow Performance', () => {
    it('should handle complete product lifecycle efficiently', async () => {
      const productRepo = dataSource.getRepository(Product);
      const lotRepo = dataSource.getRepository(Lot);

      const product = await productRepo.save(
        TestDataFactory.createProductWithLots(venue.id),
      );

      const startTime = Date.now();

      // Create lot
      const lot = await lotRepo.save(
        TestDataFactory.createLotWithExpiry(product.id, 30, 1000),
      );

      // Purchase
      await stockService.executeStockMovement(
        {
          venue_id: venue.id,
          product_id: product.id,
          lot_id: lot.id,
          movement_type: StockMovementType.PURCHASE,
          quantity: 1000,
        },
        user.id,
      );

      // 10 sales
      for (let i = 0; i < 10; i++) {
        await stockService.executeStockMovement(
          {
            venue_id: venue.id,
            product_id: product.id,
            lot_id: lot.id,
            movement_type: StockMovementType.SALE,
            quantity: -50,
          },
          user.id,
        );
      }

      // Get summary
      await stockService.getStockSummary(product.id, venue.id);

      const totalTime = Date.now() - startTime;

      console.log(`Complete Lifecycle: ${totalTime}ms`);

      expect(totalTime).toBeLessThan(1000); // < 1 second for complete workflow
    });
  });
});
