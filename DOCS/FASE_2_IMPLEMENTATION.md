FASE 2 - IMPLEMENTAZIONE

## Obiettivo Fase
Implementare il sistema completo di gestione prodotti e inventario con tracciabilità lotti FEFO/FIFO, movimenti di magazzino automatici e business logic per compliance HACCP.

## Prerequisiti Verificati
- Fase 1 completata e funzionante
- Database con schema applicato e testato
- Sistema di autenticazione JWT operativo
- Tutti i test della Fase 1 superati

## Architettura Moduli Fase 2
- **ProductCategories**: Categorizzazione prodotti con ordinamento
- **Suppliers**: Anagrafica fornitori per tracciabilità
- **Products**: Catalogo prodotti con attributi avanzati
- **Lots**: Tracciabilità lotti con FEFO automatico
- **StockMovements**: Log immutabile movimenti magazzino

---

## 1. Nuove Dipendenze Richieste

### 1.1 Installazione Dipendenze Aggiuntive
```bash
cd backend

# Dipendenze per business logic avanzata
npm install --save date-fns
npm install --save decimal.js

# Dipendenze per file processing
npm install --save multer @types/multer

# Dipendenze per validazione avanzata
npm install --save class-transformer-validator

# Dev dependencies per testing
npm install --save-dev factory.ts
```

---

## 2. Entità Database Aggiuntive

### 2.1 ProductCategory Entity (src/database/entities/product-category.entity.ts)
```typescript
import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { Product } from './product.entity';

@Entity('product_categories')
export class ProductCategory extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string; // Hex color for UI

  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @OneToMany(() => Product, product => product.category)
  products: Product[];
}
```

### 2.2 Supplier Entity (src/database/entities/supplier.entity.ts)
```typescript
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { Lot } from './lot.entity';

@Entity('suppliers')
export class Supplier extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contact_phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_code: string;

  @Column({ type: 'integer', default: 30 })
  payment_terms: number; // Days

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @OneToMany(() => Lot, lot => lot.supplier)
  lots: Lot[];
}
```

### 2.3 Product Entity (src/database/entities/product.entity.ts)
```typescript
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { ProductCategory } from './product-category.entity';
import { Lot } from './lot.entity';
import { StockMovement } from './stock-movement.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid', nullable: true })
  category_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  unit: string; // kg, lt, pz, etc.

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  cost: number;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  price: number;

  @Column({ type: 'jsonb', default: '{}' })
  attributes: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  barcode: string;

  @Column({ type: 'text', nullable: true })
  image_url: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => ProductCategory)
  @JoinColumn({ name: 'category_id' })
  category: ProductCategory;

  @OneToMany(() => Lot, lot => lot.product)
  lots: Lot[];

  @OneToMany(() => StockMovement, movement => movement.product)
  stockMovements: StockMovement[];

  // Virtual field for current stock
  currentStock?: number;
}
```

### 2.4 Lot Entity (src/database/entities/lot.entity.ts)
```typescript
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { Supplier } from './supplier.entity';
import { StockMovement } from './stock-movement.entity';

@Entity('lots')
export class Lot extends BaseEntity {
  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  supplier_id: string;

  @Column({ type: 'varchar', length: 200 })
  lot_code: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  received_at: Date;

  @Column({ type: 'date', nullable: true })
  expiry_date: Date;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  qty_init: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  qty_current: number;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  cost_per_unit: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  storage_location: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => Product, product => product.lots)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Supplier, supplier => supplier.lots)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @OneToMany(() => StockMovement, movement => movement.lot)
  stockMovements: StockMovement[];
}
```

### 2.5 StockMovement Entity (src/database/entities/stock-movement.entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { Product } from './product.entity';
import { Lot } from './lot.entity';
import { User } from './user.entity';
import { MovementType } from '../enums/movement-type.enum';

@Entity('stock_movements')
export class StockMovement extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid' })
  lot_id: string;

  @Column({ 
    type: 'enum', 
    enum: MovementType 
  })
  movement_type: MovementType;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  quantity: number; // Positive for IN, negative for OUT

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_type: string; // 'order', 'document', 'adjustment', etc.

  @Column({ type: 'uuid', nullable: true })
  reference_id: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Product, product => product.stockMovements)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Lot, lot => lot.stockMovements)
  @JoinColumn({ name: 'lot_id' })
  lot: Lot;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

### 2.6 Movement Type Enum (src/database/enums/movement-type.enum.ts)
```typescript
export enum MovementType {
  IN = 'in',           // Carico merci
  OUT = 'out',         // Scarico per vendita
  ADJUSTMENT = 'adjustment', // Rettifica inventario
  TRANSFER = 'transfer',     // Trasferimento
  WASTE = 'waste'      // Spreco/scaduto
}
```

---

## 3. Moduli di Business Logic

### 3.1 ProductCategories Module (src/product-categories/product-categories.module.ts)
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { ProductCategory } from '../database/entities/product-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductCategory])],
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService],
  exports: [ProductCategoriesService],
})
export class ProductCategoriesModule {}
```

### 3.2 ProductCategories Service (src/product-categories/product-categories.service.ts)
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from '../database/entities/product-category.entity';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private readonly categoryRepository: Repository<ProductCategory>,
  ) {}

  async create(venueId: string, createDto: CreateProductCategoryDto): Promise<ProductCategory> {
    // Check for duplicate names in the same venue
    const existing = await this.categoryRepository.findOne({
      where: { venue_id: venueId, name: createDto.name, active: true },
    });

    if (existing) {
      throw new ConflictException(`Category '${createDto.name}' already exists`);
    }

    // Get max sort_order and increment
    const maxOrder = await this.categoryRepository
      .createQueryBuilder('category')
      .select('MAX(category.sort_order)', 'max')
      .where('category.venue_id = :venueId', { venueId })
      .getRawOne();

    const category = this.categoryRepository.create({
      ...createDto,
      venue_id: venueId,
      sort_order: (maxOrder?.max || 0) + 1,
    });

    return await this.categoryRepository.save(category);
  }

  async findAll(venueId: string): Promise<ProductCategory[]> {
    return await this.categoryRepository.find({
      where: { venue_id: venueId, active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
      relations: ['products'],
    });
  }

  async findOne(venueId: string, id: string): Promise<ProductCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id, venue_id: venueId, active: true },
      relations: ['products'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(venueId: string, id: string, updateDto: UpdateProductCategoryDto): Promise<ProductCategory> {
    const category = await this.findOne(venueId, id);

    // Check for duplicate names if name is being changed
    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.categoryRepository.findOne({
        where: { venue_id: venueId, name: updateDto.name, active: true },
      });

      if (existing) {
        throw new ConflictException(`Category '${updateDto.name}' already exists`);
      }
    }

    Object.assign(category, updateDto);
    return await this.categoryRepository.save(category);
  }

  async remove(venueId: string, id: string): Promise<void> {
    const category = await this.findOne(venueId, id);
    category.active = false;
    await this.categoryRepository.save(category);
  }

  async reorder(venueId: string, categoryIds: string[]): Promise<void> {
    const categories = await this.categoryRepository.find({
      where: { venue_id: venueId, active: true },
    });

    for (let i = 0; i < categoryIds.length; i++) {
      const category = categories.find(c => c.id === categoryIds[i]);
      if (category) {
        category.sort_order = i + 1;
        await this.categoryRepository.save(category);
      }
    }
  }
}
```

### 3.3 Products Service con Business Logic Avanzata (src/products/products.service.ts)
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { Product } from '../database/entities/product.entity';
import { Lot } from '../database/entities/lot.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsQueryDto } from './dto/products-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Lot)
    private readonly lotRepository: Repository<Lot>,
    private readonly dataSource: DataSource,
  ) {}

  async create(venueId: string, createDto: CreateProductDto): Promise<Product> {
    // Check for duplicate SKU if provided
    if (createDto.sku) {
      const existing = await this.productRepository.findOne({
        where: { venue_id: venueId, sku: createDto.sku, active: true },
      });

      if (existing) {
        throw new ConflictException(`Product with SKU '${createDto.sku}' already exists`);
      }
    }

    const product = this.productRepository.create({
      ...createDto,
      venue_id: venueId,
    });

    return await this.productRepository.save(product);
  }

  async findAll(venueId: string, query: ProductsQueryDto): Promise<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.venue_id = :venueId', { venueId })
      .andWhere('product.active = :active', { active: true });

    // Apply filters
    if (query.category_id) {
      queryBuilder.andWhere('product.category_id = :categoryId', { 
        categoryId: query.category_id 
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(LOWER(product.name) LIKE LOWER(:search) OR LOWER(product.sku) LIKE LOWER(:search))',
        { search: `%${query.search}%` }
      );
    }

    if (query.barcode) {
      queryBuilder.andWhere('product.barcode = :barcode', { barcode: query.barcode });
    }

    if (query.low_stock !== undefined) {
      // Subquery to get products with low stock
      const stockSubquery = this.lotRepository
        .createQueryBuilder('lot')
        .select('lot.product_id')
        .addSelect('SUM(lot.qty_current)', 'total_stock')
        .where('lot.qty_current > 0')
        .groupBy('lot.product_id')
        .having('SUM(lot.qty_current) < :lowStockThreshold', { lowStockThreshold: 10 });

      if (query.low_stock) {
        queryBuilder.andWhere(`product.id IN (${stockSubquery.getQuery()})`);
      } else {
        queryBuilder.andWhere(`product.id NOT IN (${stockSubquery.getQuery()})`);
      }

      queryBuilder.setParameters(stockSubquery.getParameters());
    }

    // Apply sorting
    const sortField = query.sort_by || 'name';
    const sortDirection = query.sort_direction || 'ASC';
    
    if (sortField === 'category') {
      queryBuilder.orderBy('category.name', sortDirection);
    } else {
      queryBuilder.orderBy(`product.${sortField}`, sortDirection);
    }

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    // Add current stock to each product
    const productsWithStock = await this.addCurrentStockToProducts(products);

    return {
      products: productsWithStock,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(venueId: string, id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, venue_id: venueId, active: true },
      relations: ['category', 'lots'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Add current stock
    product.currentStock = await this.getCurrentStock(id);

    return product;
  }

  async update(venueId: string, id: string, updateDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(venueId, id);

    // Check for duplicate SKU if being changed
    if (updateDto.sku && updateDto.sku !== product.sku) {
      const existing = await this.productRepository.findOne({
        where: { venue_id: venueId, sku: updateDto.sku, active: true },
      });

      if (existing) {
        throw new ConflictException(`Product with SKU '${updateDto.sku}' already exists`);
      }
    }

    Object.assign(product, updateDto);
    return await this.productRepository.save(product);
  }

  async remove(venueId: string, id: string): Promise<void> {
    const product = await this.findOne(venueId, id);
    
    // Check if product has stock
    const currentStock = await this.getCurrentStock(id);
    if (currentStock > 0) {
      throw new ConflictException('Cannot delete product with existing stock');
    }

    product.active = false;
    await this.productRepository.save(product);
  }

  async getCurrentStock(productId: string): Promise<number> {
    const result = await this.lotRepository
      .createQueryBuilder('lot')
      .select('SUM(lot.qty_current)', 'total')
      .where('lot.product_id = :productId', { productId })
      .andWhere('lot.qty_current > 0')
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  async getLowStockProducts(venueId: string, threshold: number = 10): Promise<Product[]> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoin('product.lots', 'lot')
      .where('product.venue_id = :venueId', { venueId })
      .andWhere('product.active = :active', { active: true })
      .groupBy('product.id, category.id')
      .having('COALESCE(SUM(lot.qty_current), 0) < :threshold', { threshold });

    const products = await query.getMany();
    return await this.addCurrentStockToProducts(products);
  }

  private async addCurrentStockToProducts(products: Product[]): Promise<Product[]> {
    for (const product of products) {
      product.currentStock = await this.getCurrentStock(product.id);
    }
    return products;
  }

  async getProductsByBarcode(venueId: string, barcode: string): Promise<Product[]> {
    return await this.productRepository.find({
      where: { venue_id: venueId, barcode, active: true },
      relations: ['category'],
    });
  }
}
```

### 3.4 Stock Service con Logica FEFO (src/stock/stock.service.ts)
```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { Lot } from '../database/entities/lot.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { Product } from '../database/entities/product.entity';
import { MovementType } from '../database/enums/movement-type.enum';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateLotDto } from './dto/create-lot.dto';
import Decimal from 'decimal.js';

export interface FefoAllocation {
  lotId: string;
  quantity: number;
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Lot)
    private readonly lotRepository: Repository<Lot>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new lot with initial stock movement
   */
  async createLot(venueId: string, createDto: CreateLotDto, userId: string): Promise<Lot> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify product exists and belongs to venue
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: createDto.product_id, venue_id: venueId, active: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Create lot
      const lot = queryRunner.manager.create(Lot, {
        ...createDto,
        qty_current: createDto.qty_init,
      });

      const savedLot = await queryRunner.manager.save(lot);

      // Create initial stock movement
      const movement = queryRunner.manager.create(StockMovement, {
        venue_id: venueId,
        product_id: createDto.product_id,
        lot_id: savedLot.id,
        movement_type: MovementType.IN,
        quantity: createDto.qty_init,
        reference_type: 'lot_creation',
        reference_id: savedLot.id,
        user_id: userId,
        notes: `Initial stock for lot ${createDto.lot_code}`,
      });

      await queryRunner.manager.save(movement);

      await queryRunner.commitTransaction();
      return savedLot;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create stock movement with automatic lot updates
   */
  async createMovement(venueId: string, createDto: CreateStockMovementDto, userId: string): Promise<StockMovement> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get lot with lock
      const lot = await queryRunner.manager.findOne(Lot, {
        where: { id: createDto.lot_id },
        relations: ['product'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!lot || lot.product.venue_id !== venueId) {
        throw new NotFoundException('Lot not found');
      }

      const currentQty = new Decimal(lot.qty_current);
      const movementQty = new Decimal(createDto.quantity);

      // Validate movement
      if (createDto.movement_type === MovementType.OUT || 
          createDto.movement_type === MovementType.WASTE) {
        
        if (movementQty.isPositive()) {
          throw new BadRequestException('OUT and WASTE movements must have negative quantity');
        }

        const newQuantity = currentQty.plus(movementQty);
        if (newQuantity.isNegative()) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${currentQty}, Requested: ${movementQty.abs()}`
          );
        }

        lot.qty_current = newQuantity.toNumber();
      } else if (createDto.movement_type === MovementType.IN) {
        if (movementQty.isNegative()) {
          throw new BadRequestException('IN movements must have positive quantity');
        }

        lot.qty_current = currentQty.plus(movementQty).toNumber();
      } else if (createDto.movement_type === MovementType.ADJUSTMENT) {
        // For adjustments, quantity is the final amount, not the delta
        lot.qty_current = movementQty.toNumber();
      }

      // Save updated lot
      await queryRunner.manager.save(lot);

      // Create movement record
      const movement = queryRunner.manager.create(StockMovement, {
        ...createDto,
        venue_id: venueId,
        product_id: lot.product_id,
        user_id: userId,
      });

      const savedMovement = await queryRunner.manager.save(movement);

      await queryRunner.commitTransaction();
      return savedMovement;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * FEFO: Find best lots to fulfill a quantity requirement
   */
  async allocateFefo(productId: string, requiredQuantity: number): Promise<FefoAllocation[]> {
    const lots = await this.lotRepository
      .createQueryBuilder('lot')
      .where('lot.product_id = :productId', { productId })
      .andWhere('lot.qty_current > 0')
      .orderBy('lot.expiry_date', 'ASC', 'NULLS LAST')
      .addOrderBy('lot.created_at', 'ASC')
      .getMany();

    const allocations: FefoAllocation[] = [];
    let remainingQuantity = new Decimal(requiredQuantity);

    for (const lot of lots) {
      if (remainingQuantity.lte(0)) break;

      const availableQty = new Decimal(lot.qty_current);
      const allocateQty = Decimal.min(remainingQuantity, availableQty);

      allocations.push({
        lotId: lot.id,
        quantity: allocateQty.toNumber(),
      });

      remainingQuantity = remainingQuantity.minus(allocateQty);
    }

    if (remainingQuantity.gt(0)) {
      throw new BadRequestException(
        `Insufficient stock. Required: ${requiredQuantity}, Available: ${requiredQuantity - remainingQuantity.toNumber()}`
      );
    }

    return allocations;
  }

  /**
   * Execute FEFO allocation (used by order processing)
   */
  async executeFefoAllocation(
    venueId: string,
    productId: string,
    requiredQuantity: number,
    referenceType: string,
    referenceId: string,
    userId: string,
    notes?: string
  ): Promise<StockMovement[]> {
    const allocations = await this.allocateFefo(productId, requiredQuantity);
    const movements: StockMovement[] = [];

    for (const allocation of allocations) {
      const movement = await this.createMovement(venueId, {
        lot_id: allocation.lotId,
        movement_type: MovementType.OUT,
        quantity: -allocation.quantity, // Negative for OUT
        reference_type: referenceType,
        reference_id: referenceId,
        notes: notes || `FEFO allocation for ${referenceType}`,
      }, userId);

      movements.push(movement);
    }

    return movements;
  }

  /**
   * Get lots nearing expiry
   */
  async getExpiringLots(venueId: string, days: number = 7): Promise<Lot[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.lotRepository
      .createQueryBuilder('lot')
      .leftJoinAndSelect('lot.product', 'product')
      .where('product.venue_id = :venueId', { venueId })
      .andWhere('lot.qty_current > 0')
      .andWhere('lot.expiry_date IS NOT NULL')
      .andWhere('lot.expiry_date <= :futureDate', { futureDate })
      .orderBy('lot.expiry_date', 'ASC')
      .getMany();
  }

  /**
   * Get movement history for a product
   */
  async getProductMovementHistory(
    venueId: string,
    productId: string,
    limit: number = 50
  ): Promise<StockMovement[]> {
    return await this.movementRepository.find({
      where: { venue_id: venueId, product_id: productId },
      relations: ['lot', 'user'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get current stock summary for a venue
   */
  async getStockSummary(venueId: string): Promise<{
    totalProducts: number;
    totalLots: number;
    totalValue: number;
    lowStockProducts: number;
    expiringLots: number;
  }> {
    const [
      totalProducts,
      totalLots,
      stockValue,
      lowStockProducts,
      expiringLots
    ] = await Promise.all([
      this.productRepository.count({
        where: { venue_id: venueId, active: true }
      }),
      this.lotRepository.count({
        where: { product: { venue_id: venueId }, qty_current: 'MoreThan(0)' }
      }),
      this.getStockValue(venueId),
      this.getLowStockCount(venueId),
      this.getExpiringLotsCount(venueId)
    ]);

    return {
      totalProducts,
      totalLots,
      totalValue: stockValue,
      lowStockProducts,
      expiringLots,
    };
  }

  private async getStockValue(venueId: string): Promise<number> {
    const result = await this.lotRepository
      .createQueryBuilder('lot')
      .leftJoin('lot.product', 'product')
      .select('SUM(lot.qty_current * lot.cost_per_unit)', 'total')
      .where('product.venue_id = :venueId', { venueId })
      .andWhere('lot.qty_current > 0')
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  private async getLowStockCount(venueId: string, threshold: number = 10): Promise<number> {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.lots', 'lot')
      .where('product.venue_id = :venueId', { venueId })
      .andWhere('product.active = :active', { active: true })
      .groupBy('product.id')
      .having('COALESCE(SUM(lot.qty_current), 0) < :threshold', { threshold })
      .getCount();

    return result;
  }

  private async getExpiringLotsCount(venueId: string, days: number = 7): Promise<number> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.lotRepository
      .createQueryBuilder('lot')
      .leftJoin('lot.product', 'product')
      .where('product.venue_id = :venueId', { venueId })
      .andWhere('lot.qty_current > 0')
      .andWhere('lot.expiry_date IS NOT NULL')
      .andWhere('lot.expiry_date <= :futureDate', { futureDate })
      .getCount();
  }
}
```

---

## 4. Controllers con Validazione Completa

### 4.1 Products Controller (src/products/products.controller.ts)
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsQueryDto } from './dto/products-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VenueGuard } from '../common/guards/venue.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VenueAccess } from '../common/decorators/venue-access.decorator';
import { UserRole } from '../database/enums/user-role.enum';
import { User } from '../database/entities/user.entity';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, VenueGuard)
@Controller('venues/:venueId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 409, description: 'SKU already exists' })
  create(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.create(venueId, createProductDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Get all products with filtering and pagination' })
  @ApiQuery({ name: 'category_id', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'barcode', required: false, type: String })
  @ApiQuery({ name: 'low_stock', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort_by', required: false, enum: ['name', 'price', 'cost', 'category'] })
  @ApiQuery({ name: 'sort_direction', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  findAll(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query() query: ProductsQueryDto,
  ) {
    return this.productsService.findAll(venueId, query);
  }

  @Get('low-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Get products with low stock' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Low stock products retrieved' })
  getLowStock(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query('threshold') threshold?: number,
  ) {
    return this.productsService.getLowStockProducts(venueId, threshold);
  }

  @Get('barcode/:barcode')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Find products by barcode' })
  @ApiResponse({ status: 200, description: 'Products found' })
  findByBarcode(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('barcode') barcode: string,
  ) {
    return this.productsService.getProductsByBarcode(venueId, barcode);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER)
  @VenueAccess()
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.findOne(venueId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 409, description: 'SKU already exists' })
  update(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(venueId, id, updateProductDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @VenueAccess()
  @ApiOperation({ summary: 'Delete product (soft delete)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 409, description: 'Cannot delete product with existing stock' })
  remove(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(venueId, id);
  }
}
```

---

## 5. DTOs con Validazione Avanzata

### 5.1 Create Product DTO (src/products/dto/create-product.dto.ts)
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsPositive,
  Min,
  MaxLength,
  IsObject,
  IsUrl,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateProductDto {
  @ApiPropertyOptional({ 
    example: '11111111-1111-1111-1111-111111111101',
    description: 'Product category ID'
  })
  @IsOptional()
  @IsUUID(4, { message: 'Category ID must be a valid UUID' })
  category_id?: string;

  @ApiPropertyOptional({ 
    example: 'BEER-001',
    description: 'Stock Keeping Unit - must be unique within venue'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'SKU cannot exceed 100 characters' })
  @Matches(/^[A-Z0-9\-_]+$/, { 
    message: 'SKU can only contain uppercase letters, numbers, hyphens and underscores' 
  })
  sku?: string;

  @ApiProperty({ 
    example: 'IPA Artigianale',
    description: 'Product name'
  })
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MaxLength(255, { message: 'Product name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({ 
    example: 'India Pale Ale con note agrumate',
    description: 'Product description'
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description?: string;

  @ApiProperty({ 
    example: 'lt',
    description: 'Unit of measurement (kg, lt, pz, etc.)'
  })
  @IsString()
  @IsNotEmpty({ message: 'Unit is required' })
  @MaxLength(50, { message: 'Unit cannot exceed 50 characters' })
  unit: string;

  @ApiPropertyOptional({ 
    example: 4.50,
    description: 'Cost per unit'
  })
  @IsOptional()
  @IsNumber({}, { message: 'Cost must be a number' })
  @Min(0, { message: 'Cost cannot be negative' })
  @Transform(({ value }) => parseFloat(value))
  cost?: number;

  @ApiProperty({ 
    example: 8.00,
    description: 'Selling price per unit'
  })
  @IsNumber({}, { message: 'Price must be a number' })
  @IsPositive({ message: 'Price must be positive' })
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @ApiPropertyOptional({
    example: {
      abv: '6.2%',
      ibu: '65',
      color: 'golden',
      origin: 'Italia'
    },
    description: 'Additional product attributes'
  })
  @IsOptional()
  @IsObject({ message: 'Attributes must be an object' })
  attributes?: Record<string, any>;

  @ApiPropertyOptional({ 
    example: '8033874514201',
    description: 'Product barcode'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Barcode cannot exceed 255 characters' })
  @Matches(/^[0-9]+$/, { message: 'Barcode can only contain numbers' })
  barcode?: string;

  @ApiPropertyOptional({ 
    example: 'https://example.com/images/product.jpg',
    description: 'Product image URL'
  })
  @IsOptional()
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  image_url?: string;
}
```

### 5.2 Products Query DTO (src/products/dto/products-query.dto.ts)
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsOptional, 
  IsUUID, 
  IsString, 
  IsBoolean, 
  IsNumber, 
  IsIn,
  Min,
  Max,
  Transform
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID(4)
  category_id?: string;

  @ApiPropertyOptional({ description: 'Search in product name and SKU' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by barcode' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Filter products with low stock' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  low_stock?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ 
    description: 'Sort field',
    enum: ['name', 'price', 'cost', 'category', 'created_at']
  })
  @IsOptional()
  @IsIn(['name', 'price', 'cost', 'category', 'created_at'])
  sort_by?: string;

  @ApiPropertyOptional({ 
    description: 'Sort direction',
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort_direction?: 'ASC' | 'DESC';
}
```

---

## 6. Guards per Venue Access

### 6.1 Venue Guard (src/common/guards/venue.guard.ts)
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../database/entities/user.entity';
import { UserRole } from '../../database/enums/user-role.enum';

@Injectable()
export class VenueGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    const venueId: string = request.params.venueId;

    // Allow admins to access any venue
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Check if user belongs to the requested venue
    if (user.venue_id !== venueId) {
      throw new ForbiddenException('Access denied to this venue');
    }

    return true;
  }
}
```

### 6.2 Venue Access Decorator (src/common/decorators/venue-access.decorator.ts)
```typescript
import { SetMetadata } from '@nestjs/common';

export const VENUE_ACCESS_KEY = 'venue_access';
export const VenueAccess = () => SetMetadata(VENUE_ACCESS_KEY, true);
```

---

## 7. Criteri di Completamento Fase 2

### Verifiche Funzionali Obbligatorie:
1. **CRUD Completo**: Categories, Suppliers, Products, Lots funzionanti
2. **Business Logic FEFO**: Allocazione automatica lotti per scadenza
3. **Stock Movements**: Creazione e tracking movimenti immutabili
4. **Validazione Avanzata**: Tutti i DTO con validazioni complete
5. **Authorization**: Venue-based access control funzionante
6. **API Documentation**: Swagger completo per tutti i nuovi endpoint

### Endpoints da Testare:
- `GET /api/v1/venues/{venueId}/product-categories` - Lista categorie
- `POST /api/v1/venues/{venueId}/products` - Creazione prodotto
- `GET /api/v1/venues/{venueId}/products?low_stock=true` - Prodotti sotto scorta
- `POST /api/v1/venues/{venueId}/lots` - Creazione lotto
- `POST /api/v1/venues/{venueId}/stock/movements` - Movimento magazzino
- `GET /api/v1/venues/{venueId}/stock/summary` - Riepilogo magazzino

### Business Logic Requirements:
- FEFO allocation funzionante per allocazioni automatiche
- Stock movements atomici con transazioni database
- Validazione scorte negative impedita
- Calcolo stock corrente accurato
- Prodotti low-stock identificati correttamente

La Fase 2 è completa quando tutti gli endpoint funzionano, la business logic FEFO opera correttamente e tutti i test di validazione passano.