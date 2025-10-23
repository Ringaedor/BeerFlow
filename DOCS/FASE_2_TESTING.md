# FASE 2 - TESTING PRODUCT & INVENTORY MANAGEMENT

## Obiettivo Testing
Implementare suite di test completa per validare la business logic avanzata del sistema inventario, inclusi FEFO, movimenti atomici, e integrità dei dati.

## Framework Testing Specializzato
- **Unit Tests**: Jest con mock avanzati per business logic
- **Integration Tests**: Database transazionale testing
- **Business Logic Tests**: FEFO algorithm validation
- **Performance Tests**: Concurrent stock movement testing
- **Data Integrity Tests**: Transactional consistency validation

---

## 1. Test Data Factories

### 1.1 Product Factory (src/test/factories/product.factory.ts)
```typescript
import { define } from 'factory.ts';
import { Product } from '../../database/entities/product.entity';
import { ProductCategory } from '../../database/entities/product-category.entity';

export const ProductFactory = define<Product>(() => ({
  id: '00000000-0000-0000-0000-000000000000',
  venue_id: '00000000-0000-0000-0000-000000000001',
  category_id: '11111111-1111-1111-1111-111111111101',
  sku: `PRD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
  name: `Test Product ${Math.random().toString(36).substr(2, 5)}`,
  description: 'Test product description',
  unit: 'pz',
  cost: 5.00,
  price: 10.00,
  attributes: { test: true },
  barcode: Math.random().toString().substr(2, 13),
  image_url: null,
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
  venue: null,
  category: null,
  lots: [],
  stockMovements: [],
}));

export const ProductCategoryFactory = define<ProductCategory>(() => ({
  id: '11111111-1111-1111-1111-111111111101',
  venue_id: '00000000-0000-0000-0000-000000000001',
  name: `Category ${Math.random().toString(36).substr(2, 5)}`,
  description: 'Test category',
  color: '#FF6B35',
  sort_order: 1,
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
  venue: null,
  products: [],
}));
```

### 1.2 Lot and Movement Factories (src/test/factories/stock.factory.ts)
```typescript
import { define } from 'factory.ts';
import { Lot } from '../../database/entities/lot.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { MovementType } from '../../database/enums/movement-type.enum';

export const LotFactory = define<Lot>(() => {
  const qty = Math.floor(Math.random() * 100) + 10;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + Math.floor(Math.random() * 30) + 1);

  return {
    id: '55555555-5555-5555-5555-555555555555',
    product_id: '33333333-3333-3333-3333-333333333333',
    supplier_id: '22222222-2222-2222-2222-222222222222',
    lot_code: `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    received_at: new Date(),
    expiry_date: expiryDate,
    qty_init: qty,
    qty_current: qty,
    unit: 'pz',
    cost_per_unit: 5.00,
    storage_location: 'Warehouse A-1',
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
    product: null,
    supplier: null,
    stockMovements: [],
  };
});

export const StockMovementFactory = define<StockMovement>(() => ({
  id: '99999999-9999-9999-9999-999999999999',
  venue_id: '00000000-0000-0000-0000-000000000001',
  product_id: '33333333-3333-3333-3333-333333333333',
  lot_id: '55555555-5555-5555-5555-555555555555',
  movement_type: MovementType.IN,
  quantity: 10,
  reference_type: 'test',
  reference_id: null,
  user_id: '00000000-0000-0000-0000-000000000002',
  notes: 'Test movement',
  created_at: new Date(),
  updated_at: new Date(),
  venue: null,
  product: null,
  lot: null,
  user: null,
}));
```

---

## 2. Business Logic Unit Tests

### 2.1 Products Service Tests (src/products/products.service.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from '../database/entities/product.entity';
import { Lot } from '../database/entities/lot.entity';
import { ProductFactory } from '../test/factories/product.factory';
import { CreateProductDto } from './dto/create-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: Repository<Product>;
  let lotRepository: Repository<Lot>;
  let dataSource: DataSource;

  const mockQueryBuilder = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getCount: jest.fn(),
  };

  const mockProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockLotRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Lot),
          useValue: mockLotRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    lotRepository = module.get<Repository<Lot>>(getRepositoryToken(Lot));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const venueId = '00000000-0000-0000-0000-000000000001';
    const createDto: CreateProductDto = {
      name: 'Test Product',
      unit: 'pz',
      price: 10.00,
      cost: 5.00,
      sku: 'TEST-001',
    };

    it('should create product successfully', async () => {
      const product = ProductFactory.build();
      
      mockProductRepository.findOne.mockResolvedValue(null); // No existing SKU
      mockProductRepository.create.mockReturnValue(product);
      mockProductRepository.save.mockResolvedValue(product);

      const result = await service.create(venueId, createDto);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { venue_id: venueId, sku: createDto.sku, active: true },
      });
      expect(mockProductRepository.create).toHaveBeenCalledWith({
        ...createDto,
        venue_id: venueId,
      });
      expect(result).toEqual(product);
    });

    it('should throw ConflictException for duplicate SKU', async () => {
      const existingProduct = ProductFactory.build({ sku: createDto.sku });
      mockProductRepository.findOne.mockResolvedValue(existingProduct);

      await expect(service.create(venueId, createDto)).rejects.toThrow(
        ConflictException
      );
      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    it('should allow products without SKU', async () => {
      const createDtoNoSku = { ...createDto };
      delete createDtoNoSku.sku;
      
      const product = ProductFactory.build({ sku: null });
      mockProductRepository.create.mockReturnValue(product);
      mockProductRepository.save.mockResolvedValue(product);

      const result = await service.create(venueId, createDtoNoSku);

      expect(mockProductRepository.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(product);
    });
  });

  describe('findAll with complex filtering', () => {
    const venueId = '00000000-0000-0000-0000-000000000001';

    it('should apply all filters correctly', async () => {
      const query = {
        category_id: '11111111-1111-1111-1111-111111111101',
        search: 'test',
        low_stock: true,
        page: 2,
        limit: 10,
        sort_by: 'name',
        sort_direction: 'DESC' as const,
      };

      const products = [ProductFactory.build()];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([products, 25]);

      // Mock stock calculation for each product
      jest.spyOn(service, 'getCurrentStock').mockResolvedValue(5);

      const result = await service.findAll(venueId, query);

      expect(mockProductRepository.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.venue_id = :venueId', { venueId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.category_id = :categoryId', { 
        categoryId: query.category_id 
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (page-1) * limit
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      
      expect(result).toEqual({
        products: expect.any(Array),
        total: 25,
        page: 2,
        totalPages: 3,
      });
    });

    it('should handle empty search results', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(venueId, {});

      expect(result.products).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('getCurrentStock calculation', () => {
    it('should calculate current stock from all lots', async () => {
      const productId = '33333333-3333-3333-3333-333333333333';
      
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: '25.50' });

      const result = await service.getCurrentStock(productId);

      expect(mockLotRepository.createQueryBuilder).toHaveBeenCalledWith('lot');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('SUM(lot.qty_current)', 'total');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('lot.product_id = :productId', { productId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('lot.qty_current > 0');
      expect(result).toBe(25.50);
    });

    it('should return 0 for products with no stock', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: null });

      const result = await service.getCurrentStock('test-id');

      expect(result).toBe(0);
    });
  });

  describe('remove', () => {
    const venueId = '00000000-0000-0000-0000-000000000001';
    const productId = '33333333-3333-3333-3333-333333333333';

    it('should soft delete product when no stock exists', async () => {
      const product = ProductFactory.build();
      jest.spyOn(service, 'findOne').mockResolvedValue(product);
      jest.spyOn(service, 'getCurrentStock').mockResolvedValue(0);

      await service.remove(venueId, productId);

      expect(product.active).toBe(false);
      expect(mockProductRepository.save).toHaveBeenCalledWith(product);
    });

    it('should throw ConflictException when product has stock', async () => {
      const product = ProductFactory.build();
      jest.spyOn(service, 'findOne').mockResolvedValue(product);
      jest.spyOn(service, 'getCurrentStock').mockResolvedValue(10);

      await expect(service.remove(venueId, productId)).rejects.toThrow(
        ConflictException
      );
    });
  });
});
```

### 2.2 FEFO Algorithm Tests (src/stock/stock.service.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { StockService } from './stock.service';
import { Lot } from '../database/entities/lot.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { Product } from '../database/entities/product.entity';
import { MovementType } from '../database/enums/movement-type.enum';
import { LotFactory, StockMovementFactory } from '../test/factories/stock.factory';

describe('StockService - FEFO Algorithm', () => {
  let service: StockService;
  let lotRepository: Repository<Lot>;
  let movementRepository: Repository<StockMovement>;
  let dataSource: DataSource;

  const mockQueryBuilder = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockLotRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockMovementRepository = {
    save: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: getRepositoryToken(Lot),
          useValue: mockLotRepository,
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: mockMovementRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
    lotRepository = module.get<Repository<Lot>>(getRepositoryToken(Lot));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('allocateFefo', () => {
    const productId = '33333333-3333-3333-3333-333333333333';

    it('should allocate from earliest expiring lot first', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);

      const lots = [
        LotFactory.build({ 
          id: 'lot1',
          qty_current: 10, 
          expiry_date: dayAfter,
          created_at: new Date('2024-01-01')
        }),
        LotFactory.build({ 
          id: 'lot2',
          qty_current: 15, 
          expiry_date: tomorrow,
          created_at: new Date('2024-01-02')
        }),
        LotFactory.build({ 
          id: 'lot3',
          qty_current: 5, 
          expiry_date: tomorrow,
          created_at: new Date('2024-01-01') // Earlier creation, same expiry
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValue(lots);

      const result = await service.allocateFefo(productId, 8);

      expect(result).toEqual([
        { lotId: 'lot3', quantity: 5 },  // First: earliest creation with same expiry
        { lotId: 'lot2', quantity: 3 },  // Second: same expiry, later creation
      ]);
    });

    it('should allocate from single lot when sufficient', async () => {
      const lots = [
        LotFactory.build({ 
          id: 'lot1',
          qty_current: 20, 
          expiry_date: new Date('2024-06-01')
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValue(lots);

      const result = await service.allocateFefo(productId, 15);

      expect(result).toEqual([
        { lotId: 'lot1', quantity: 15 },
      ]);
    });

    it('should handle lots without expiry date (NULLS LAST)', async () => {
      const lots = [
        LotFactory.build({ 
          id: 'lot1',
          qty_current: 10, 
          expiry_date: null,
          created_at: new Date('2024-01-01')
        }),
        LotFactory.build({ 
          id: 'lot2',
          qty_current: 15, 
          expiry_date: new Date('2024-06-01'),
          created_at: new Date('2024-01-02')
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValue(lots);

      const result = await service.allocateFefo(productId, 12);

      expect(result).toEqual([
        { lotId: 'lot2', quantity: 12 }, // With expiry date comes first
      ]);
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const lots = [
        LotFactory.build({ qty_current: 5 }),
        LotFactory.build({ qty_current: 3 }),
      ];

      mockQueryBuilder.getMany.mockResolvedValue(lots);

      await expect(service.allocateFefo(productId, 10)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle exact quantity allocation', async () => {
      const lots = [
        LotFactory.build({ 
          id: 'lot1',
          qty_current: 7 
        }),
        LotFactory.build({ 
          id: 'lot2',
          qty_current: 3 
        }),
      ];

      mockQueryBuilder.getMany.mockResolvedValue(lots);

      const result = await service.allocateFefo(productId, 10);

      expect(result).toEqual([
        { lotId: 'lot1', quantity: 7 },
        { lotId: 'lot2', quantity: 3 },
      ]);
    });
  });

  describe('executeFefoAllocation', () => {
    it('should create multiple movements for FEFO allocation', async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';
      const productId = '33333333-3333-3333-3333-333333333333';
      const userId = '00000000-0000-0000-0000-000000000002';

      const allocations = [
        { lotId: 'lot1', quantity: 5 },
        { lotId: 'lot2', quantity: 3 },
      ];

      jest.spyOn(service, 'allocateFefo').mockResolvedValue(allocations);
      
      const movements = [
        StockMovementFactory.build({ lot_id: 'lot1', quantity: -5 }),
        StockMovementFactory.build({ lot_id: 'lot2', quantity: -3 }),
      ];

      jest.spyOn(service, 'createMovement')
        .mockResolvedValueOnce(movements[0])
        .mockResolvedValueOnce(movements[1]);

      const result = await service.executeFefoAllocation(
        venueId,
        productId,
        8,
        'order',
        'order-123',
        userId,
        'Test FEFO allocation'
      );

      expect(service.allocateFefo).toHaveBeenCalledWith(productId, 8);
      expect(service.createMovement).toHaveBeenCalledTimes(2);
      expect(service.createMovement).toHaveBeenCalledWith(venueId, {
        lot_id: 'lot1',
        movement_type: MovementType.OUT,
        quantity: -5,
        reference_type: 'order',
        reference_id: 'order-123',
        notes: 'Test FEFO allocation',
      }, userId);

      expect(result).toHaveLength(2);
    });
  });
});
```

---

## 3. Integration Tests

### 3.1 Product Integration Tests (src/products/products.controller.integration.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { TestModule } from '../test/test.module';
import { Product } from '../database/entities/product.entity';
import { ProductCategory } from '../database/entities/product-category.entity';
import { User } from '../database/entities/user.entity';
import { Venue } from '../database/entities/venue.entity';
import { UserRole } from '../database/enums/user-role.enum';
import { ProductFactory, ProductCategoryFactory } from '../test/factories/product.factory';

describe('Products Controller (Integration)', () => {
  let app: INestApplication;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<ProductCategory>;
  let userRepository: Repository<User>;
  let venueRepository: Repository<Venue>;

  const testVenueId = '00000000-0000-0000-0000-000000000001';
  let adminToken: string;
  let managerToken: string;
  let waiterToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    productRepository = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    categoryRepository = moduleFixture.get<Repository<ProductCategory>>(getRepositoryToken(ProductCategory));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    venueRepository = moduleFixture.get<Repository<Venue>>(getRepositoryToken(Venue));

    // Setup test data and get tokens
    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanupProducts();
  });

  describe('POST /api/v1/venues/:venueId/products', () => {
    const createProductDto = {
      name: 'Test Beer',
      unit: 'lt',
      price: 8.50,
      cost: 4.25,
      sku: 'BEER-TEST-001',
      description: 'A test beer',
      attributes: { abv: '5.2%', style: 'IPA' },
    };

    it('should create product successfully for admin', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/venues/${testVenueId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createProductDto)
        .expect(201);

      expect(response.body).toMatchObject({
        name: createProductDto.name,
        sku: createProductDto.sku,
        unit: createProductDto.unit,
        price: createProductDto.price,
        venue_id: testVenueId,
      });

      expect(response.body).toHaveProperty('id');
      expect(response.body.attributes).toEqual(createProductDto.attributes);
    });

    it('should create product successfully for manager', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${testVenueId}/products`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(createProductDto)
        .expect(201);
    });

    it('should fail for waiter (insufficient permissions)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${testVenueId}/products`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send(createProductDto)
        .expect(403);
    });

    it('should fail with duplicate SKU', async () => {
      // Create first product
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${testVenueId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createProductDto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post(`/api/v1/venues/${testVenueId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createProductDto)
        .expect(409);
    });

    it('should validate required fields', async () => {
      const invalidProduct = {
        name: '', // Empty name
        unit: 'lt',
        price: -5, // Negative price
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/venues/${testVenueId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProduct)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
      expect(response.body.message).toContain('Product name is required');
      expect(response.body.message).toContain('Price must be positive');
    });

    it('should validate SKU format', async () => {
      const invalidSku = {
        ...createProductDto,
        sku: 'invalid sku with spaces',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/venues/${testVenueId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidSku)
        .expect(400);

      expect(response.body.message).toContain('SKU can only contain uppercase letters, numbers, hyphens and underscores');
    });
  });

  describe('GET /api/v1/venues/:venueId/products', () => {
    beforeEach(async () => {
      // Create test products
      const category = await categoryRepository.save(
        ProductCategoryFactory.build({ venue_id: testVenueId })
      );

      const products = [
        ProductFactory.build({ 
          venue_id: testVenueId,
          category_id: category.id,
          name: 'IPA Beer',
          price: 8.00,
          sku: 'IPA-001'
        }),
        ProductFactory.build({ 
          venue_id: testVenueId,
          category_id: category.id,
          name: 'Lager Beer',
          price: 6.50,
          sku: 'LAGER-001'
        }),
        ProductFactory.build({ 
          venue_id: testVenueId,
          category_id: null,
          name: 'Stout Beer',
          price: 9.00,
          sku: 'STOUT-001'
        }),
      ];

      await productRepository.save(products);
    });

    it('should return all products for admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/venues/${testVenueId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.products).toHaveLength(3);
      expect(response.body).toHaveProperty('total', 3);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('totalPages', 1);
    });

    it('should filter by category', async () => {
      const category = await categoryRepository.findOne({ 
        where: { venue_id: testVenueId } 
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/venues/${testVenueId}/products`)
        .query({ category_id: category.id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.products).toHaveLength(2);
      response.body.products.forEach(product => {
        expect(product.category_id).toBe(category.id);
      });
    });

    it('should search by name and SKU', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/venues/${testVenueId}/products`)
        .query({ search: 'IPA' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe('IPA Beer');
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/venues/${testVenueId}/products`)
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.products).toHaveLength(2);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBe(2);
    });

    it('should sort by price descending', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/venues/${testVenueId}/products`)
        .query({ sort_by: 'price', sort_direction: 'DESC' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const prices = response.body.products.map(p => p.price);
      expect(prices).toEqual([9.00, 8.00, 6.50]);
    });

    it('should allow waiter access for reading', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/venues/${testVenueId}/products`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(200);
    });

    it('should prevent access to other venues', async () => {
      const otherVenueId = '00000000-0000-0000-0000-000000000999';
      
      await request(app.getHttpServer())
        .get(`/api/v1/venues/${otherVenueId}/products`)
        .set('Authorization', `Bearer ${managerToken}`) // Manager of different venue
        .expect(403);
    });
  });

  describe('GET /api/v1/venues/:venueId/products/low-stock', () => {
    beforeEach(async () => {
      // This would require setting up lots with actual stock
      // For integration testing, we'd need to create products and lots
      // with known quantities to test the low stock functionality
    });

    it('should return low stock products', async () => {
      // Would test after implementing lot creation in setup
      const response = await request(app.getHttpServer())
        .get(`/api/v1/venues/${testVenueId}/products/low-stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create venue if not exists
    let venue = await venueRepository.findOne({ where: { id: testVenueId } });
    if (!venue) {
      venue = await venueRepository.save({
        id: testVenueId,
        name: 'Test Venue',
        active: true,
      });
    }

    // Create test users and get tokens
    const users = [
      { email: 'admin@test.com', role: UserRole.ADMIN },
      { email: 'manager@test.com', role: UserRole.MANAGER },
      { email: 'waiter@test.com', role: UserRole.WAITER },
    ];

    for (const userData of users) {
      let user = await userRepository.findOne({ where: { email: userData.email } });
      if (!user) {
        user = await userRepository.save({
          venue_id: testVenueId,
          email: userData.email,
          password_hash: 'hashedpassword',
          name: `Test ${userData.role}`,
          role: userData.role,
          active: true,
        });
      }

      // Get token (simplified - in real tests you'd call login endpoint)
      if (userData.role === UserRole.ADMIN) {
        adminToken = 'admin-token'; // Implement actual token generation
      } else if (userData.role === UserRole.MANAGER) {
        managerToken = 'manager-token';
      } else if (userData.role === UserRole.WAITER) {
        waiterToken = 'waiter-token';
      }
    }
  }

  async function cleanupProducts() {
    await productRepository.delete({ venue_id: testVenueId });
    await categoryRepository.delete({ venue_id: testVenueId });
  }
});
```

---

## 4. Performance and Concurrency Tests

### 4.1 Stock Movement Concurrency Tests (src/stock/stock.concurrency.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TestModule } from '../test/test.module';
import { StockService } from './stock.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Lot } from '../database/entities/lot.entity';
import { Product } from '../database/entities/product.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { MovementType } from '../database/enums/movement-type.enum';
import { LotFactory, ProductFactory } from '../test/factories';

describe('Stock Service Concurrency Tests', () => {
  let app: INestApplication;
  let stockService: StockService;
  let lotRepository: Repository<Lot>;
  let productRepository: Repository<Product>;
  let movementRepository: Repository<StockMovement>;

  const venueId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    stockService = moduleFixture.get<StockService>(StockService);
    lotRepository = moduleFixture.get<Repository<Lot>>(getRepositoryToken(Lot));
    productRepository = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    movementRepository = moduleFixture.get<Repository<StockMovement>>(getRepositoryToken(StockMovement));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await movementRepository.delete({});
    await lotRepository.delete({});
    await productRepository.delete({});
  });

  describe('Concurrent Stock Movements', () => {
    it('should handle concurrent OUT movements without overselling', async () => {
      // Setup: Create product and lot with 100 units
      const product = await productRepository.save(
        ProductFactory.build({ venue_id: venueId })
      );

      const lot = await lotRepository.save(
        LotFactory.build({
          product_id: product.id,
          qty_init: 100,
          qty_current: 100,
        })
      );

      // Test: 10 concurrent requests trying to take 15 units each (150 total)
      // Should only allow 100 units total to be taken
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        stockService.createMovement(venueId, {
          lot_id: lot.id,
          movement_type: MovementType.OUT,
          quantity: -15, // Trying to take 15 units
          reference_type: 'test',
          reference_id: `test-${i}`,
          notes: `Concurrent test ${i}`,
        }, userId).catch(error => error) // Catch errors to continue test
      );

      const results = await Promise.all(concurrentRequests);

      // Count successful movements
      const successfulMovements = results.filter(result => !(result instanceof Error));
      const failedMovements = results.filter(result => result instanceof Error);

      // Verify that total successful movements don't exceed available stock
      const totalMovementQuantity = successfulMovements.reduce((sum, movement) => 
        sum + Math.abs(movement.quantity), 0
      );

      expect(totalMovementQuantity).toBeLessThanOrEqual(100);
      expect(failedMovements.length).toBeGreaterThan(0); // Some should fail due to insufficient stock

      // Verify final lot quantity
      const finalLot = await lotRepository.findOne({ where: { id: lot.id } });
      expect(finalLot.qty_current).toBeGreaterThanOrEqual(0);
      expect(finalLot.qty_current).toBe(100 - totalMovementQuantity);
    });

    it('should handle concurrent FEFO allocations correctly', async () => {
      // Setup: Create product with multiple lots
      const product = await productRepository.save(
        ProductFactory.build({ venue_id: venueId })
      );

      const expiringSoon = new Date();
      expiringSoon.setDate(expiringSoon.getDate() + 1);
      
      const expiringLater = new Date();
      expiringLater.setDate(expiringLater.getDate() + 7);

      const lots = await lotRepository.save([
        LotFactory.build({
          product_id: product.id,
          qty_init: 20,
          qty_current: 20,
          expiry_date: expiringSoon,
          lot_code: 'EXPIRING-SOON',
        }),
        LotFactory.build({
          product_id: product.id,
          qty_init: 30,
          qty_current: 30,
          expiry_date: expiringLater,
          lot_code: 'EXPIRING-LATER',
        }),
      ]);

      // Test: 5 concurrent FEFO allocations of 8 units each
      const concurrentAllocations = Array.from({ length: 5 }, (_, i) =>
        stockService.executeFefoAllocation(
          venueId,
          product.id,
          8,
          'order',
          `order-${i}`,
          userId,
          `Concurrent FEFO test ${i}`
        ).catch(error => error)
      );

      const results = await Promise.all(concurrentAllocations);
      const successfulAllocations = results.filter(result => !(result instanceof Error));

      // Verify FEFO logic: earlier expiring lot should be depleted first
      const movements = await movementRepository.find({
        where: { reference_type: 'order' },
        relations: ['lot'],
      });

      const expiringSoonMovements = movements.filter(m => m.lot.lot_code === 'EXPIRING-SOON');
      const expiringLaterMovements = movements.filter(m => m.lot.lot_code === 'EXPIRING-LATER');

      // First lot should be prioritized
      expect(expiringSoonMovements.length).toBeGreaterThan(0);
      
      // Calculate total allocated
      const totalAllocated = movements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      expect(totalAllocated).toBeLessThanOrEqual(50); // Total available stock
    });
  });

  describe('Performance Under Load', () => {
    it('should handle 100 sequential movements within acceptable time', async () => {
      const product = await productRepository.save(
        ProductFactory.build({ venue_id: venueId })
      );

      const lot = await lotRepository.save(
        LotFactory.build({
          product_id: product.id,
          qty_init: 1000,
          qty_current: 1000,
        })
      );

      const startTime = Date.now();

      // Create 100 sequential movements
      for (let i = 0; i < 100; i++) {
        await stockService.createMovement(venueId, {
          lot_id: lot.id,
          movement_type: MovementType.OUT,
          quantity: -1,
          reference_type: 'performance_test',
          reference_id: `test-${i}`,
          notes: `Performance test ${i}`,
        }, userId);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`100 sequential movements completed in ${totalTime}ms`);
      
      // Should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000);

      // Verify final state
      const finalLot = await lotRepository.findOne({ where: { id: lot.id } });
      expect(finalLot.qty_current).toBe(900); // 1000 - 100
    });

    it('should handle complex FEFO scenarios efficiently', async () => {
      const product = await productRepository.save(
        ProductFactory.build({ venue_id: venueId })
      );

      // Create 20 lots with different expiry dates
      const lots = [];
      for (let i = 0; i < 20; i++) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + i + 1);
        
        lots.push(LotFactory.build({
          product_id: product.id,
          qty_init: 50,
          qty_current: 50,
          expiry_date: expiryDate,
          lot_code: `LOT-${String(i).padStart(2, '0')}`,
        }));
      }

      await lotRepository.save(lots);

      const startTime = Date.now();

      // Perform 50 FEFO allocations
      for (let i = 0; i < 50; i++) {
        await stockService.executeFefoAllocation(
          venueId,
          product.id,
          15, // Each allocation takes 15 units
          'order',
          `perf-order-${i}`,
          userId
        );
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`50 FEFO allocations across 20 lots completed in ${totalTime}ms`);
      
      // Should complete within 10 seconds
      expect(totalTime).toBeLessThan(10000);

      // Verify FEFO order: earliest lots should be depleted first
      const remainingLots = await lotRepository.find({
        where: { product_id: product.id },
        order: { expiry_date: 'ASC' },
      });

      // First few lots should be completely or partially depleted
      expect(remainingLots[0].qty_current).toBeLessThan(50);
    });
  });
});
```

---

## 5. Business Logic Validation Tests

### 5.1 Inventory Consistency Tests (src/test/inventory-consistency.spec.ts)

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TestModule } from './test.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../database/entities/product.entity';
import { Lot } from '../database/entities/lot.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { StockService } from '../stock/stock.service';
import { ProductsService } from '../products/products.service';

describe('Inventory Consistency Validation', () => {
  let app: INestApplication;
  let stockService: StockService;
  let productsService: ProductsService;
  let productRepository: Repository<Product>;
  let lotRepository: Repository<Lot>;
  let movementRepository: Repository<StockMovement>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    stockService = moduleFixture.get<StockService>(StockService);
    productsService = moduleFixture.get<ProductsService>(ProductsService);
    productRepository = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    lotRepository = moduleFixture.get<Repository<Lot>>(getRepositoryToken(Lot));
    movementRepository = moduleFixture.get<Repository<StockMovement>>(getRepositoryToken(StockMovement));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Stock Calculation Consistency', () => {
    it('should maintain consistency between lot qty_current and movement history', async () => {
      // This test verifies that lot quantities always match movement calculations
      const venueId = '00000000-0000-0000-0000-000000000001';
      const userId = '00000000-0000-0000-0000-000000000002';

      // Create product and initial lot
      const product = await productRepository.save({
        venue_id: venueId,
        name: 'Consistency Test Product',
        unit: 'pz',
        price: 10.00,
        active: true,
      });

      const lot = await stockService.createLot(venueId, {
        product_id: product.id,
        lot_code: 'CONSISTENCY-TEST',
        qty_init: 100,
        unit: 'pz',
        cost_per_unit: 5.00,
      }, userId);

      // Perform various movements
      const movements = [
        { type: 'OUT', quantity: -10 },
        { type: 'OUT', quantity: -5 },
        { type: 'IN', quantity: 3 },
        { type: 'OUT', quantity: -8 },
        { type: 'ADJUSTMENT', quantity: 85 }, // Set to specific amount
      ];

      for (const [index, movement] of movements.entries()) {
        await stockService.createMovement(venueId, {
          lot_id: lot.id,
          movement_type: movement.type as any,
          quantity: movement.quantity,
          reference_type: 'consistency_test',
          reference_id: `test-${index}`,
          notes: `Consistency test movement ${index}`,
        }, userId);
      }

      // Get final lot state
      const finalLot = await lotRepository.findOne({ where: { id: lot.id } });
      
      // Calculate expected quantity from movements
      const allMovements = await movementRepository.find({
        where: { lot_id: lot.id },
        order: { created_at: 'ASC' },
      });

      let calculatedQuantity = 0;
      for (const movement of allMovements) {
        if (movement.movement_type === 'ADJUSTMENT') {
          calculatedQuantity = movement.quantity;
        } else {
          calculatedQuantity += movement.quantity;
        }
      }

      expect(finalLot.qty_current).toBe(calculatedQuantity);
      expect(finalLot.qty_current).toBe(85); // Final adjustment value
    });

    it('should maintain product-level stock consistency', async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';
      const userId = '00000000-0000-0000-0000-000000000002';

      // Create product with multiple lots
      const product = await productRepository.save({
        venue_id: venueId,
        name: 'Multi-Lot Product',
        unit: 'kg',
        price: 15.00,
        active: true,
      });

      const lots = [];
      for (let i = 0; i < 3; i++) {
        const lot = await stockService.createLot(venueId, {
          product_id: product.id,
          lot_code: `MULTI-LOT-${i}`,
          qty_init: 50,
          unit: 'kg',
          cost_per_unit: 7.50,
        }, userId);
        lots.push(lot);
      }

      // Perform movements on different lots
      await stockService.createMovement(venueId, {
        lot_id: lots[0].id,
        movement_type: 'OUT',
        quantity: -20,
        reference_type: 'test',
        notes: 'Test movement',
      }, userId);

      await stockService.createMovement(venueId, {
        lot_id: lots[1].id,
        movement_type: 'OUT',
        quantity: -15,
        reference_type: 'test',
        notes: 'Test movement',
      }, userId);

      await stockService.createMovement(venueId, {
        lot_id: lots[2].id,
        movement_type: 'OUT',
        quantity: -10,
        reference_type: 'test',
        notes: 'Test movement',
      }, userId);

      // Check product-level stock calculation
      const calculatedStock = await productsService.getCurrentStock(product.id);
      const expectedStock = (50 - 20) + (50 - 15) + (50 - 10); // 105

      expect(calculatedStock).toBe(expectedStock);

      // Verify against manual lot summation
      const currentLots = await lotRepository.find({
        where: { product_id: product.id },
      });

      const manualSum = currentLots.reduce((sum, lot) => sum + lot.qty_current, 0);
      expect(calculatedStock).toBe(manualSum);
    });
  });

  describe('Data Integrity Constraints', () => {
    it('should prevent negative stock through validation', async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';
      const userId = '00000000-0000-0000-0000-000000000002';

      const product = await productRepository.save({
        venue_id: venueId,
        name: 'Low Stock Product',
        unit: 'pz',
        price: 5.00,
        active: true,
      });

      const lot = await stockService.createLot(venueId, {
        product_id: product.id,
        lot_code: 'LOW-STOCK',
        qty_init: 5,
        unit: 'pz',
        cost_per_unit: 2.50,
      }, userId);

      // Try to take more than available
      await expect(
        stockService.createMovement(venueId, {
          lot_id: lot.id,
          movement_type: 'OUT',
          quantity: -10, // More than the 5 available
          reference_type: 'test',
          notes: 'Over-allocation test',
        }, userId)
      ).rejects.toThrow('Insufficient stock');

      // Verify lot quantity unchanged
      const unchangedLot = await lotRepository.findOne({ where: { id: lot.id } });
      expect(unchangedLot.qty_current).toBe(5);
    });

    it('should handle edge case of exact stock depletion', async () => {
      const venueId = '00000000-0000-0000-0000-000000000001';
      const userId = '00000000-0000-0000-0000-000000000002';

      const product = await productRepository.save({
        venue_id: venueId,
        name: 'Exact Depletion Product',
        unit: 'lt',
        price: 8.00,
        active: true,
      });

      const lot = await stockService.createLot(venueId, {
        product_id: product.id,
        lot_code: 'EXACT-DEPLETION',
        qty_init: 10,
        unit: 'lt',
        cost_per_unit: 4.00,
      }, userId);

      // Take exactly all available stock
      await stockService.createMovement(venueId, {
        lot_id: lot.id,
        movement_type: 'OUT',
        quantity: -10,
        reference_type: 'test',
        notes: 'Exact depletion test',
      }, userId);

      const depletedLot = await lotRepository.findOne({ where: { id: lot.id } });
      expect(depletedLot.qty_current).toBe(0);

      // Verify cannot take more from depleted lot
      await expect(
        stockService.createMovement(venueId, {
          lot_id: lot.id,
          movement_type: 'OUT',
          quantity: -1,
          reference_type: 'test',
          notes: 'Post-depletion test',
        }, userId)
      ).rejects.toThrow('Insufficient stock');
    });
  });
});
```

---

## 6. Test Execution and Coverage

### 6.1 Test Scripts Update (package.json)

{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:unit": "jest --testPathPattern=\\.spec\\.ts$ --testPathIgnorePatterns=integration",
    "test:integration": "jest --testPathPattern=\\.integration\\.spec\\.ts$",
    "test:performance": "jest --testPathPattern=\\.performance\\.spec\\.ts$",
    "test:concurrency": "jest --testPathPattern=\\.concurrency\\.spec\\.ts$",
    "test:business": "jest --testPathPattern=business-logic|consistency",
    "test:phase2": "jest --testPathPattern=\"(products|stock|categories|suppliers).*\\.(spec|integration|performance)\\.ts$\"",
    "test:phase2:all": "npm run test:unit && npm run test:integration && npm run test:business && npm run test:performance"
  }
}

### 6.2 Jest Configuration Update (jest.config.js)

javascriptmodule.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/*.factory.ts',
    '!**/node_modules/**',
    '!**/test/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 30000,
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Higher threshold for critical business logic
    './src/stock/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/products/': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90,
    },
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  maxWorkers: 4, // Limit for database tests
};
````

---

## 7. Criteri di Accettazione Testing Fase 2

### Unit Tests Requirements (100% Pass Rate):
- **Products Service**: Tutti i metodi CRUD testati
- **Stock Service**: FEFO algorithm completamente validato
- **Categories/Suppliers**: CRUD operations tested
- **Business Logic**: Edge cases e validazioni

### Integration Tests Requirements (100% Pass Rate):
- **API Endpoints**: Tutti gli endpoint Phase 2 testati
- **Database Transactions**: Atomicità verificata
- **Authorization**: Venue-based access control
- **Validation**: DTO validation completa

### Performance Benchmarks:
- **Sequential Operations**: 100 movimenti < 5 secondi
- **FEFO Allocation**: 50 allocazioni su 20 lotti < 10 secondi
- **Concurrent Movements**: Nessuna race condition
- **Database Queries**: Query complesse < 100ms

### Business Logic Validation:
- **FEFO Correctness**: Algoritmo sempre rispetta ordine scadenza
- **Stock Consistency**: Quantità sempre accurate
- **Negative Stock Prevention**: Impossibile andare sotto zero
- **Concurrent Safety**: Nessuna condizione di gara

### Coverage Requirements:
- **Overall Coverage**: > 90%
- **Critical Business Logic**: > 95%
- **Controller Methods**: > 85%
- **Service Methods**: > 90%

La Fase 2 Testing è completa quando tutti i test passano, i benchmark sono rispettati e la business logic è completamente validata.
````