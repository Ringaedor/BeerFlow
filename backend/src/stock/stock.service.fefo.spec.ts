import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StockService } from './stock.service';
import { Product } from '../database/entities/product.entity';
import { Lot } from '../database/entities/lot.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { TestDataFactory } from '../test/factories/test-data.factory';

/**
 * FEFO Algorithm - Comprehensive Test Suite
 *
 * Tests ALL scenarios for First-Expired, First-Out allocation:
 * - Single lot scenarios
 * - Multi-lot scenarios
 * - Same expiration date (FIFO fallback)
 * - No expiration dates
 * - Mixed scenarios
 * - Edge cases (exact depletion, insufficient stock)
 */
describe('StockService - FEFO Algorithm (Comprehensive)', () => {
  let service: StockService;
  let productRepository: any;
  let lotRepository: any;
  let mockQueryBuilder: any;

  const mockVenueId = 'venue-test-id';
  const mockProductId = 'product-test-id';

  beforeEach(async () => {
    TestDataFactory.reset();

    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    productRepository = {
      findOne: jest.fn(),
    };

    lotRepository = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: getRepositoryToken(Product),
          useValue: productRepository,
        },
        {
          provide: getRepositoryToken(Lot),
          useValue: lotRepository,
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  describe('Single Lot Scenarios', () => {
    it('should allocate full quantity from single lot when sufficient', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });
      const lot = TestDataFactory.createLotWithExpiry(mockProductId, 30, 100);

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue([lot]);

      const result = await service.allocateFEFO(
        mockProductId,
        50,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(50);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].quantity).toBe(50);
      expect(result.allocations[0].lot_id).toBe(lot.id);
    });

    it('should allocate exact quantity when depleting single lot', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });
      const lot = TestDataFactory.createLotWithExpiry(mockProductId, 30, 100);

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue([lot]);

      const result = await service.allocateFEFO(
        mockProductId,
        100,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(100);
      expect(result.allocations[0].quantity).toBe(100);
    });

    it('should fail when single lot insufficient', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });
      const lot = TestDataFactory.createLotWithExpiry(mockProductId, 30, 50);

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue([lot]);

      const result = await service.allocateFEFO(
        mockProductId,
        100,
        mockVenueId,
      );

      expect(result.success).toBe(false);
      expect(result.total_allocated).toBe(50);
      expect(result.message).toContain('Insufficient stock');
    });
  });

  describe('Multi-Lot Scenarios - Different Expiration Dates', () => {
    it('should allocate from nearest expiration first', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      const lots = [
        TestDataFactory.createLotWithExpiry(mockProductId, 10, 30, {
          lot_number: 'NEAR',
        }),
        TestDataFactory.createLotWithExpiry(mockProductId, 60, 50, {
          lot_number: 'FAR',
        }),
        TestDataFactory.createLotWithExpiry(mockProductId, 30, 40, {
          lot_number: 'MEDIUM',
        }),
      ];

      productRepository.findOne.mockResolvedValue(product);
      // Simulate FEFO sorting
      mockQueryBuilder.getMany.mockResolvedValue([lots[0], lots[2], lots[1]]);

      const result = await service.allocateFEFO(
        mockProductId,
        50,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(50);
      expect(result.allocations).toHaveLength(2);
      // First 30 from nearest expiration
      expect(result.allocations[0].lot_number).toBe('NEAR');
      expect(result.allocations[0].quantity).toBe(30);
      // Next 20 from medium expiration
      expect(result.allocations[1].lot_number).toBe('MEDIUM');
      expect(result.allocations[1].quantity).toBe(20);
    });

    it('should allocate from multiple lots in FEFO order', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      const lots = [
        TestDataFactory.createLotWithExpiry(mockProductId, 5, 20, {
          lot_number: 'LOT-1',
        }),
        TestDataFactory.createLotWithExpiry(mockProductId, 15, 30, {
          lot_number: 'LOT-2',
        }),
        TestDataFactory.createLotWithExpiry(mockProductId, 45, 40, {
          lot_number: 'LOT-3',
        }),
      ];

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue(lots); // Already sorted

      const result = await service.allocateFEFO(
        mockProductId,
        70,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(70);
      expect(result.allocations).toHaveLength(3);
      expect(result.allocations[0].lot_number).toBe('LOT-1');
      expect(result.allocations[0].quantity).toBe(20);
      expect(result.allocations[1].lot_number).toBe('LOT-2');
      expect(result.allocations[1].quantity).toBe(30);
      expect(result.allocations[2].lot_number).toBe('LOT-3');
      expect(result.allocations[2].quantity).toBe(20);
    });

    it('should deplete all lots exactly when requesting total stock', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      const lots = [
        TestDataFactory.createLotWithExpiry(mockProductId, 10, 30),
        TestDataFactory.createLotWithExpiry(mockProductId, 20, 40),
        TestDataFactory.createLotWithExpiry(mockProductId, 30, 30),
      ];

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue(lots);

      const result = await service.allocateFEFO(
        mockProductId,
        100,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(100);
      expect(result.allocations).toHaveLength(3);
      expect(result.allocations.reduce((sum, a) => sum + a.quantity, 0)).toBe(
        100,
      );
    });
  });

  describe('Same Expiration Date - FIFO Fallback', () => {
    it('should use FIFO when expiration dates are identical', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      const baseDate = new Date();
      const expiryDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const olderCreation = new Date(
        baseDate.getTime() - 2 * 24 * 60 * 60 * 1000,
      );
      const newerCreation = new Date(
        baseDate.getTime() - 1 * 24 * 60 * 60 * 1000,
      );

      const lots = [
        TestDataFactory.createLot(mockProductId, {
          lot_number: 'OLDER',
          qty_current: 50,
          expiration_date: expiryDate,
          created_at: olderCreation,
        }),
        TestDataFactory.createLot(mockProductId, {
          lot_number: 'NEWER',
          qty_current: 50,
          expiration_date: expiryDate,
          created_at: newerCreation,
        }),
      ];

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue(lots); // Sorted by creation

      const result = await service.allocateFEFO(
        mockProductId,
        60,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.allocations[0].lot_number).toBe('OLDER');
      expect(result.allocations[0].quantity).toBe(50);
      expect(result.allocations[1].lot_number).toBe('NEWER');
      expect(result.allocations[1].quantity).toBe(10);
    });

    it('should handle 3+ lots with same expiration using FIFO', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const lots = [
        TestDataFactory.createLot(mockProductId, {
          lot_number: 'FIRST',
          qty_current: 20,
          expiration_date: expiryDate,
          created_at: new Date('2024-01-01'),
        }),
        TestDataFactory.createLot(mockProductId, {
          lot_number: 'SECOND',
          qty_current: 25,
          expiration_date: expiryDate,
          created_at: new Date('2024-01-02'),
        }),
        TestDataFactory.createLot(mockProductId, {
          lot_number: 'THIRD',
          qty_current: 30,
          expiration_date: expiryDate,
          created_at: new Date('2024-01-03'),
        }),
      ];

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue(lots);

      const result = await service.allocateFEFO(
        mockProductId,
        50,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.allocations[0].lot_number).toBe('FIRST');
      expect(result.allocations[0].quantity).toBe(20);
      expect(result.allocations[1].lot_number).toBe('SECOND');
      expect(result.allocations[1].quantity).toBe(25);
      expect(result.allocations[2].lot_number).toBe('THIRD');
      expect(result.allocations[2].quantity).toBe(5);
    });
  });

  describe('No Expiration Date - NULLS LAST', () => {
    it('should prioritize lots with expiration over those without', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      const lots = [
        TestDataFactory.createLotWithExpiry(mockProductId, 30, 40, {
          lot_number: 'WITH-EXPIRY',
        }),
        TestDataFactory.createLotNoExpiry(mockProductId, 60, {
          lot_number: 'NO-EXPIRY',
        }),
      ];

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue(lots); // Already sorted

      const result = await service.allocateFEFO(
        mockProductId,
        50,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.allocations[0].lot_number).toBe('WITH-EXPIRY');
      expect(result.allocations[0].quantity).toBe(40);
      expect(result.allocations[1].lot_number).toBe('NO-EXPIRY');
      expect(result.allocations[1].quantity).toBe(10);
    });

    it('should use FIFO for multiple lots without expiration', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      const lots = [
        TestDataFactory.createLotNoExpiry(mockProductId, 30, {
          lot_number: 'NO-EXP-OLD',
          created_at: new Date('2024-01-01'),
        }),
        TestDataFactory.createLotNoExpiry(mockProductId, 30, {
          lot_number: 'NO-EXP-NEW',
          created_at: new Date('2024-01-15'),
        }),
      ];

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue(lots);

      const result = await service.allocateFEFO(
        mockProductId,
        40,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.allocations[0].lot_number).toBe('NO-EXP-OLD');
      expect(result.allocations[0].quantity).toBe(30);
      expect(result.allocations[1].lot_number).toBe('NO-EXP-NEW');
      expect(result.allocations[1].quantity).toBe(10);
    });
  });

  describe('Mixed Scenarios', () => {
    it('should handle complex mix: different expiry + same expiry + no expiry', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      const baseDate = new Date();
      const near = new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000);
      const far = new Date(baseDate.getTime() + 60 * 24 * 60 * 60 * 1000);

      const lots = [
        // Nearest expiration - should go first
        TestDataFactory.createLot(mockProductId, {
          lot_number: 'NEAR',
          qty_current: 20,
          expiration_date: near,
          created_at: new Date('2024-01-01'),
        }),
        // Far expiration, older - should go second
        TestDataFactory.createLot(mockProductId, {
          lot_number: 'FAR-OLD',
          qty_current: 30,
          expiration_date: far,
          created_at: new Date('2024-01-05'),
        }),
        // Far expiration, newer - should go third
        TestDataFactory.createLot(mockProductId, {
          lot_number: 'FAR-NEW',
          qty_current: 25,
          expiration_date: far,
          created_at: new Date('2024-01-10'),
        }),
        // No expiration - should go last
        TestDataFactory.createLotNoExpiry(mockProductId, 40, {
          lot_number: 'NO-EXP',
          created_at: new Date('2024-01-01'),
        }),
      ];

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue(lots);

      const result = await service.allocateFEFO(
        mockProductId,
        85,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.allocations).toHaveLength(4);
      expect(result.allocations[0].lot_number).toBe('NEAR'); // 20
      expect(result.allocations[1].lot_number).toBe('FAR-OLD'); // 30
      expect(result.allocations[2].lot_number).toBe('FAR-NEW'); // 25
      expect(result.allocations[3].lot_number).toBe('NO-EXP'); // 10
      expect(result.total_allocated).toBe(85);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero quantity request', async () => {
      await expect(
        service.allocateFEFO(mockProductId, 0, mockVenueId),
      ).rejects.toThrow('Quantity must be positive');
    });

    it('should handle negative quantity request', async () => {
      await expect(
        service.allocateFEFO(mockProductId, -10, mockVenueId),
      ).rejects.toThrow('Quantity must be positive');
    });

    it('should handle empty lots list', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.allocateFEFO(
        mockProductId,
        10,
        mockVenueId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('No available lots');
    });

    it('should handle non-tracked product (no lots)', async () => {
      const product = TestDataFactory.createProduct(mockVenueId, {
        id: mockProductId,
        track_lots: false,
        current_stock: 100,
      });

      productRepository.findOne.mockResolvedValue(product);

      const result = await service.allocateFEFO(
        mockProductId,
        50,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(50);
      expect(result.allocations).toHaveLength(0);
      expect(result.message).toContain('non-tracked');
    });

    it('should handle non-tracked product with insufficient stock', async () => {
      const product = TestDataFactory.createProduct(mockVenueId, {
        id: mockProductId,
        track_lots: false,
        current_stock: 30,
      });

      productRepository.findOne.mockResolvedValue(product);

      const result = await service.allocateFEFO(
        mockProductId,
        50,
        mockVenueId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient stock');
    });

    it('should handle product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(
        service.allocateFEFO(mockProductId, 10, mockVenueId),
      ).rejects.toThrow('Product not found');
    });

    it('should handle very large quantity allocation', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      const lots = [
        TestDataFactory.createLotWithExpiry(mockProductId, 30, 1000),
        TestDataFactory.createLotWithExpiry(mockProductId, 60, 2000),
      ];

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue(lots);

      const result = await service.allocateFEFO(
        mockProductId,
        2500,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(2500);
      expect(result.allocations[0].quantity).toBe(1000);
      expect(result.allocations[1].quantity).toBe(1500);
    });

    it('should handle fractional quantities (decimals)', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
      });

      const lot = TestDataFactory.createLotWithExpiry(mockProductId, 30, 10.5);

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue([lot]);

      const result = await service.allocateFEFO(
        mockProductId,
        5.25,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(5.25);
      expect(result.allocations[0].quantity).toBe(5.25);
    });
  });

  describe('Realistic FEFO Scenarios', () => {
    it('should handle typical brewery scenario with multiple beer kegs', async () => {
      const product = TestDataFactory.createProductWithLots(mockVenueId, {
        id: mockProductId,
        name: 'Pilsner Keg',
      });

      const lots = TestDataFactory.createFEFOTestLots(mockProductId);

      productRepository.findOne.mockResolvedValue(product);
      mockQueryBuilder.getMany.mockResolvedValue(lots);

      const result = await service.allocateFEFO(
        mockProductId,
        100,
        mockVenueId,
      );

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(100);
      // Should start from LOT-001-SOON (expires in 10 days)
      expect(result.allocations[0].lot_number).toBe('LOT-001-SOON');
    });
  });
});
