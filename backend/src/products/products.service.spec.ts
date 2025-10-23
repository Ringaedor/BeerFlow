import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from '../database/entities/product.entity';
import { TestDataFactory } from '../test/factories/test-data.factory';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('ProductsService - Business Logic', () => {
  let service: ProductsService;
  let productRepository: any;
  let mockQueryBuilder: any;

  const mockVenueId = 'venue-test-id';

  beforeEach(async () => {
    TestDataFactory.reset();

    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    productRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((product) => Promise.resolve(product)),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: productRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('SKU Uniqueness Enforcement', () => {
    it('should prevent duplicate SKU on create', async () => {
      const existingProduct = TestDataFactory.createProduct(mockVenueId, {
        sku: 'BEER-001',
      });

      productRepository.findOne.mockResolvedValue(existingProduct);

      await expect(
        service.create(
          {
            name: 'New Product',
            sku: 'BEER-001',
            product_type: 'beer' as any,
            unit_of_measure: 'bottle' as any,
          },
          mockVenueId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should prevent duplicate SKU on update', async () => {
      const product = TestDataFactory.createProduct(mockVenueId, {
        id: 'product-1',
        sku: 'BEER-001',
      });

      const otherProduct = TestDataFactory.createProduct(mockVenueId, {
        id: 'product-2',
        sku: 'BEER-002',
      });

      productRepository.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(otherProduct);

      await expect(
        service.update('product-1', { sku: 'BEER-002' }, mockVenueId),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same SKU when updating same product', async () => {
      const product = TestDataFactory.createProduct(mockVenueId, {
        id: 'product-1',
        sku: 'BEER-001',
      });

      productRepository.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(null);

      const result = await service.update(
        'product-1',
        { name: 'Updated Name' },
        mockVenueId,
      );

      expect(result).toBeDefined();
    });
  });

  describe('Direct Stock Update Prevention', () => {
    it('should reject direct current_stock updates', async () => {
      const product = TestDataFactory.createProduct(mockVenueId, {
        id: 'product-1',
      });

      productRepository.findOne.mockResolvedValue(product);

      await expect(
        service.update('product-1', { current_stock: 100 } as any, mockVenueId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('product-1', { current_stock: 100 } as any, mockVenueId),
      ).rejects.toThrow('stock movements');
    });
  });

  describe('Low Stock Detection', () => {
    it('should identify products below minimum stock', async () => {
      const lowStockProducts = [
        TestDataFactory.createProduct(mockVenueId, {
          sku: 'BEER-001',
          current_stock: 5,
          minimum_stock: 10,
        }),
        TestDataFactory.createProduct(mockVenueId, {
          sku: 'BEER-002',
          current_stock: 2,
          minimum_stock: 10,
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValue(lowStockProducts);

      const result = await service.getLowStockProducts(mockVenueId);

      expect(result).toHaveLength(2);
      expect(result[0].sku).toBe('BEER-001');
      expect(result[1].sku).toBe('BEER-002');
    });
  });

  describe('Soft Delete', () => {
    it('should set active=false instead of deleting', async () => {
      const product = TestDataFactory.createProduct(mockVenueId, {
        id: 'product-1',
        active: true,
      });

      productRepository.findOne.mockResolvedValue(product);

      await service.remove('product-1', mockVenueId);

      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ active: false }),
      );
    });
  });
});
