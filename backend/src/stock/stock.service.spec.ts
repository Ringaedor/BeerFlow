import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StockService } from './stock.service';
import { Product } from '../database/entities/product.entity';
import { Lot } from '../database/entities/lot.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { ProductType } from '../database/enums/product-type.enum';
import { UnitOfMeasure } from '../database/enums/unit-of-measure.enum';

describe('StockService - FEFO Algorithm', () => {
  let service: StockService;
  let productRepository: any;
  let lotRepository: any;
  let movementRepository: any;
  let dataSource: any;

  const mockVenueId = 'test-venue-id';
  const mockProductId = 'test-product-id';

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    productRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    lotRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    movementRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
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
          useValue: movementRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('allocateFEFO', () => {
    it('should allocate from lot with nearest expiration date first', async () => {
      const mockProduct: Partial<Product> = {
        id: mockProductId,
        venue_id: mockVenueId,
        name: 'Test Beer',
        sku: 'BEER-001',
        product_type: ProductType.BEER,
        unit_of_measure: UnitOfMeasure.BOTTLE,
        current_stock: 100,
        track_lots: true,
        active: true,
      };

      const today = new Date();
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

      const mockLots: Partial<Lot>[] = [
        {
          id: 'lot-1',
          lot_number: 'LOT-001',
          qty_current: 30,
          expiration_date: in60Days, // Expires later
          created_at: today,
        },
        {
          id: 'lot-2',
          lot_number: 'LOT-002',
          qty_current: 40,
          expiration_date: in30Days, // Expires sooner - should be allocated first
          created_at: today,
        },
        {
          id: 'lot-3',
          lot_number: 'LOT-003',
          qty_current: 30,
          expiration_date: in60Days, // Same expiration as lot-1
          created_at: new Date(today.getTime() + 1000), // Created later
        },
      ];

      productRepository.findOne.mockResolvedValue(mockProduct);
      lotRepository.createQueryBuilder().getMany.mockResolvedValue([
        mockLots[1], // LOT-002 (expires in 30 days)
        mockLots[0], // LOT-001 (expires in 60 days, created first)
        mockLots[2], // LOT-003 (expires in 60 days, created later)
      ]);

      const result = await service.allocateFEFO(mockProductId, 50, mockVenueId);

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(50);
      expect(result.allocations).toHaveLength(2);

      // First allocation should be from LOT-002 (nearest expiration)
      expect(result.allocations[0].lot_number).toBe('LOT-002');
      expect(result.allocations[0].quantity).toBe(40);

      // Second allocation should be from LOT-001 (next nearest, FIFO for same date)
      expect(result.allocations[1].lot_number).toBe('LOT-001');
      expect(result.allocations[1].quantity).toBe(10);
    });

    it('should use FIFO when expiration dates are the same', async () => {
      const mockProduct: Partial<Product> = {
        id: mockProductId,
        venue_id: mockVenueId,
        track_lots: true,
        current_stock: 100,
        active: true,
      };

      const today = new Date();
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const olderDate = new Date(today.getTime() - 1000);

      const mockLots: Partial<Lot>[] = [
        {
          id: 'lot-1',
          lot_number: 'LOT-001',
          qty_current: 50,
          expiration_date: in30Days,
          created_at: today, // Created later
        },
        {
          id: 'lot-2',
          lot_number: 'LOT-002',
          qty_current: 50,
          expiration_date: in30Days,
          created_at: olderDate, // Created earlier - should be allocated first
        },
      ];

      productRepository.findOne.mockResolvedValue(mockProduct);
      lotRepository.createQueryBuilder().getMany.mockResolvedValue([
        mockLots[1], // LOT-002 (older)
        mockLots[0], // LOT-001 (newer)
      ]);

      const result = await service.allocateFEFO(mockProductId, 60, mockVenueId);

      expect(result.success).toBe(true);
      expect(result.allocations[0].lot_number).toBe('LOT-002');
      expect(result.allocations[0].quantity).toBe(50);
      expect(result.allocations[1].lot_number).toBe('LOT-001');
      expect(result.allocations[1].quantity).toBe(10);
    });

    it('should handle lots without expiration dates (NULLS LAST)', async () => {
      const mockProduct: Partial<Product> = {
        id: mockProductId,
        venue_id: mockVenueId,
        track_lots: true,
        current_stock: 100,
        active: true,
      };

      const today = new Date();
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const mockLots: Partial<Lot>[] = [
        {
          id: 'lot-1',
          lot_number: 'LOT-001',
          qty_current: 50,
          expiration_date: null, // No expiration - should be last
          created_at: today,
        },
        {
          id: 'lot-2',
          lot_number: 'LOT-002',
          qty_current: 50,
          expiration_date: in30Days, // Has expiration - should be first
          created_at: today,
        },
      ];

      productRepository.findOne.mockResolvedValue(mockProduct);
      lotRepository.createQueryBuilder().getMany.mockResolvedValue([
        mockLots[1], // LOT-002 (has expiration)
        mockLots[0], // LOT-001 (no expiration)
      ]);

      const result = await service.allocateFEFO(mockProductId, 60, mockVenueId);

      expect(result.success).toBe(true);
      // Should allocate from LOT-002 first
      expect(result.allocations[0].lot_number).toBe('LOT-002');
      expect(result.allocations[0].quantity).toBe(50);
      // Then from LOT-001
      expect(result.allocations[1].lot_number).toBe('LOT-001');
      expect(result.allocations[1].quantity).toBe(10);
    });

    it('should fail when insufficient stock', async () => {
      const mockProduct: Partial<Product> = {
        id: mockProductId,
        venue_id: mockVenueId,
        track_lots: true,
        current_stock: 50,
        active: true,
      };

      const mockLots: Partial<Lot>[] = [
        {
          id: 'lot-1',
          lot_number: 'LOT-001',
          qty_current: 30,
          expiration_date: new Date(),
          created_at: new Date(),
        },
      ];

      productRepository.findOne.mockResolvedValue(mockProduct);
      lotRepository.createQueryBuilder().getMany.mockResolvedValue(mockLots);

      const result = await service.allocateFEFO(mockProductId, 100, mockVenueId);

      expect(result.success).toBe(false);
      expect(result.total_allocated).toBe(30);
      expect(result.message).toContain('Insufficient stock');
    });

    it('should handle non-tracked products', async () => {
      const mockProduct: Partial<Product> = {
        id: mockProductId,
        venue_id: mockVenueId,
        track_lots: false, // NOT tracked
        current_stock: 100,
        active: true,
      };

      productRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.allocateFEFO(mockProductId, 50, mockVenueId);

      expect(result.success).toBe(true);
      expect(result.total_allocated).toBe(50);
      expect(result.allocations).toHaveLength(0);
      expect(result.message).toContain('non-tracked');
    });

    it('should reject negative or zero quantity', async () => {
      await expect(
        service.allocateFEFO(mockProductId, 0, mockVenueId),
      ).rejects.toThrow('Quantity must be positive');

      await expect(
        service.allocateFEFO(mockProductId, -10, mockVenueId),
      ).rejects.toThrow('Quantity must be positive');
    });
  });

  describe('getStockSummary', () => {
    it('should return stock summary with lot breakdown', async () => {
      const mockProduct: Partial<Product> = {
        id: mockProductId,
        venue_id: mockVenueId,
        name: 'Test Beer',
        sku: 'BEER-001',
        current_stock: 100,
        minimum_stock: 20,
        track_lots: true,
        active: true,
      };

      const mockLots: Partial<Lot>[] = [
        {
          id: 'lot-1',
          lot_number: 'LOT-001',
          qty_current: 60,
          expiration_date: new Date('2025-12-31'),
          cost_price: 1.5,
        },
        {
          id: 'lot-2',
          lot_number: 'LOT-002',
          qty_current: 40,
          expiration_date: new Date('2025-06-30'),
          cost_price: 1.4,
        },
      ];

      productRepository.findOne.mockResolvedValue(mockProduct);
      lotRepository.find.mockResolvedValue(mockLots);

      const result = await service.getStockSummary(mockProductId, mockVenueId);

      expect(result.product_name).toBe('Test Beer');
      expect(result.current_stock).toBe(100);
      expect(result.minimum_stock).toBe(20);
      expect(result.below_minimum).toBe(false);
      expect(result.lots).toHaveLength(2);
      expect(result.lots[0].lot_number).toBe('LOT-001');
    });

    it('should indicate when stock is below minimum', async () => {
      const mockProduct: Partial<Product> = {
        id: mockProductId,
        venue_id: mockVenueId,
        name: 'Test Beer',
        sku: 'BEER-001',
        current_stock: 10, // Below minimum
        minimum_stock: 20,
        track_lots: true,
        active: true,
      };

      productRepository.findOne.mockResolvedValue(mockProduct);
      lotRepository.find.mockResolvedValue([]);

      const result = await service.getStockSummary(mockProductId, mockVenueId);

      expect(result.below_minimum).toBe(true);
    });
  });
});
