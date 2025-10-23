import { Venue } from '../../database/entities/venue.entity';
import { User } from '../../database/entities/user.entity';
import { Product } from '../../database/entities/product.entity';
import { ProductCategory } from '../../database/entities/product-category.entity';
import { Supplier } from '../../database/entities/supplier.entity';
import { Lot } from '../../database/entities/lot.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { ProductType } from '../../database/enums/product-type.enum';
import { UnitOfMeasure } from '../../database/enums/unit-of-measure.enum';
import { StockMovementType } from '../../database/enums/stock-movement-type.enum';
import { UserRole } from '../../database/enums/user-role.enum';

let idCounter = 0;
const generateId = () => `test-id-${++idCounter}`;

export class TestDataFactory {
  /**
   * Create test venue
   */
  static createVenue(overrides?: Partial<Venue>): Venue {
    const venue = new Venue();
    venue.id = generateId();
    venue.name = 'Test Venue';
    venue.address = 'Test Address 123';
    venue.settings = {
      currency: 'EUR',
      timezone: 'Europe/Rome',
      tax_rate: 0.22,
    };
    venue.active = true;
    venue.created_at = new Date();
    venue.updated_at = new Date();

    return Object.assign(venue, overrides);
  }

  /**
   * Create test user
   */
  static createUser(
    venue_id: string,
    overrides?: Partial<User>,
  ): User {
    const user = new User();
    user.id = generateId();
    user.venue_id = venue_id;
    user.email = `user${idCounter}@test.com`;
    user.password_hash = 'hashed_password';
    user.name = 'Test User';
    user.role = UserRole.MANAGER;
    user.active = true;
    user.created_at = new Date();
    user.updated_at = new Date();

    return Object.assign(user, overrides);
  }

  /**
   * Create test product category
   */
  static createProductCategory(
    venue_id: string,
    overrides?: Partial<ProductCategory>,
  ): ProductCategory {
    const category = new ProductCategory();
    category.id = generateId();
    category.venue_id = venue_id;
    category.name = `Test Category ${idCounter}`;
    category.description = 'Test category description';
    category.color = '#FFD700';
    category.active = true;
    category.created_at = new Date();
    category.updated_at = new Date();

    return Object.assign(category, overrides);
  }

  /**
   * Create test supplier
   */
  static createSupplier(
    venue_id: string,
    overrides?: Partial<Supplier>,
  ): Supplier {
    const supplier = new Supplier();
    supplier.id = generateId();
    supplier.venue_id = venue_id;
    supplier.name = `Test Supplier ${idCounter}`;
    supplier.contact_person = 'John Doe';
    supplier.email = `supplier${idCounter}@test.com`;
    supplier.phone = '+39 123 456 7890';
    supplier.active = true;
    supplier.created_at = new Date();
    supplier.updated_at = new Date();

    return Object.assign(supplier, overrides);
  }

  /**
   * Create test product
   */
  static createProduct(
    venue_id: string,
    overrides?: Partial<Product>,
  ): Product {
    const product = new Product();
    product.id = generateId();
    product.venue_id = venue_id;
    product.name = `Test Product ${idCounter}`;
    product.sku = `SKU-${idCounter}`;
    product.product_type = ProductType.BEER;
    product.unit_of_measure = UnitOfMeasure.BOTTLE;
    product.cost_price = 1.5;
    product.sell_price = 3.5;
    product.current_stock = 0;
    product.minimum_stock = 10;
    product.track_lots = false;
    product.active = true;
    product.created_at = new Date();
    product.updated_at = new Date();

    return Object.assign(product, overrides);
  }

  /**
   * Create test product with lot tracking enabled
   */
  static createProductWithLots(
    venue_id: string,
    overrides?: Partial<Product>,
  ): Product {
    return this.createProduct(venue_id, {
      track_lots: true,
      ...overrides,
    });
  }

  /**
   * Create test lot
   */
  static createLot(
    product_id: string,
    overrides?: Partial<Lot>,
  ): Lot {
    const lot = new Lot();
    lot.id = generateId();
    lot.product_id = product_id;
    lot.lot_number = `LOT-${idCounter}`;
    lot.qty_initial = 100;
    lot.qty_current = 100;
    lot.cost_price = 1.5;
    lot.expiration_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    lot.active = true;
    lot.created_at = new Date();
    lot.updated_at = new Date();

    return Object.assign(lot, overrides);
  }

  /**
   * Create lot with specific expiration days from now
   */
  static createLotWithExpiry(
    product_id: string,
    daysFromNow: number,
    qty: number = 100,
    overrides?: Partial<Lot>,
  ): Lot {
    const expiration_date = new Date(
      Date.now() + daysFromNow * 24 * 60 * 60 * 1000,
    );
    return this.createLot(product_id, {
      qty_initial: qty,
      qty_current: qty,
      expiration_date,
      ...overrides,
    });
  }

  /**
   * Create lot without expiration
   */
  static createLotNoExpiry(
    product_id: string,
    qty: number = 100,
    overrides?: Partial<Lot>,
  ): Lot {
    const lot = this.createLot(product_id, {
      qty_initial: qty,
      qty_current: qty,
      ...overrides,
    });
    (lot as any).expiration_date = null;
    return lot;
  }

  /**
   * Create test stock movement
   */
  static createStockMovement(
    venue_id: string,
    product_id: string,
    user_id: string,
    overrides?: Partial<StockMovement>,
  ): StockMovement {
    const movement = new StockMovement();
    movement.id = generateId();
    movement.venue_id = venue_id;
    movement.product_id = product_id;
    movement.user_id = user_id;
    movement.movement_type = StockMovementType.PURCHASE;
    movement.quantity = 10;
    movement.qty_before = 0;
    movement.qty_after = 10;
    movement.unit_cost = 1.5;
    movement.total_cost = 15;
    movement.movement_date = new Date();
    movement.created_at = new Date();
    movement.updated_at = new Date();

    return Object.assign(movement, overrides);
  }

  /**
   * Reset counter for isolated tests
   */
  static reset(): void {
    idCounter = 0;
  }

  /**
   * Create multiple lots with different expiration dates for FEFO testing
   */
  static createFEFOTestLots(product_id: string): Lot[] {
    const today = new Date();
    const lots: Lot[] = [];

    // Lot 1: Expires in 10 days (should be allocated first)
    lots.push(
      this.createLot(product_id, {
        lot_number: 'LOT-001-SOON',
        qty_initial: 30,
        qty_current: 30,
        expiration_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000),
        created_at: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // Created 5 days ago
      }),
    );

    // Lot 2: Expires in 30 days (should be allocated second, older creation)
    lots.push(
      this.createLot(product_id, {
        lot_number: 'LOT-002-MEDIUM',
        qty_initial: 50,
        qty_current: 50,
        expiration_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        created_at: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // Created 3 days ago
      }),
    );

    // Lot 3: Expires in 30 days (should be allocated third, newer creation)
    lots.push(
      this.createLot(product_id, {
        lot_number: 'LOT-003-MEDIUM-NEW',
        qty_initial: 40,
        qty_current: 40,
        expiration_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        created_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Created 1 day ago
      }),
    );

    // Lot 4: No expiration (should be allocated last)
    lots.push(
      this.createLotNoExpiry(product_id, 60, {
        lot_number: 'LOT-004-NO-EXPIRY',
        created_at: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // Created 7 days ago
      }),
    );

    return lots;
  }
}
