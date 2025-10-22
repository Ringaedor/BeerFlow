# BeerFlow - Phase 2: Product & Inventory Management

## Overview

Phase 2 implements a complete product and inventory management system with advanced FEFO (First-Expired, First-Out) business logic and atomic transaction handling.

## Key Features

### 1. Product Management
- **Product Categories**: Organize products into categories with custom colors and icons
- **Suppliers**: Manage supplier information with payment terms and contact details
- **Products**: Complete product catalog with SKU, pricing, and stock tracking
- **Lot Tracking**: Optional lot-based tracking with expiration dates

### 2. FEFO Algorithm
The system implements a sophisticated FEFO (First-Expired, First-Out) algorithm that:
- Prioritizes lots by expiration date (nearest first)
- Uses FIFO (First-In, First-Out) for lots with same expiration
- Handles products without expiration dates (NULLS LAST)
- Ensures optimal stock rotation and waste prevention

### 3. Atomic Stock Movements
All stock movements are implemented as atomic transactions:
- Pessimistic locking prevents race conditions
- All-or-nothing updates ensure data consistency
- Immutable audit trail for complete traceability
- Automatic stock quantity updates

### 4. Venue-Based Isolation
Complete security with venue-based data isolation:
- VenueGuard ensures users only access their venue's data
- All queries scoped to user's venue_id
- RBAC (Role-Based Access Control) for operations

## Database Entities

### ProductCategory
```typescript
{
  id: uuid
  venue_id: uuid
  name: string
  description: string (optional)
  color: string (hex color)
  icon: string
  active: boolean
}
```

### Supplier
```typescript
{
  id: uuid
  venue_id: uuid
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  vat_number: string
  payment_terms: jsonb
  active: boolean
}
```

### Product
```typescript
{
  id: uuid
  venue_id: uuid
  category_id: uuid
  supplier_id: uuid
  name: string
  sku: string (unique)
  description: string
  product_type: enum
  unit_of_measure: enum
  cost_price: decimal
  sell_price: decimal
  current_stock: decimal (auto-updated)
  minimum_stock: decimal
  optimal_stock: decimal
  track_lots: boolean
  barcode: string
  image_url: string
  metadata: jsonb
  active: boolean
}
```

### Lot
```typescript
{
  id: uuid
  product_id: uuid
  lot_number: string (unique)
  qty_initial: decimal
  qty_current: decimal (auto-updated)
  cost_price: decimal
  expiration_date: date (critical for FEFO)
  production_date: date
  received_date: date
  supplier_reference: string
  notes: string
  metadata: jsonb
  active: boolean
}
```

### StockMovement (Immutable)
```typescript
{
  id: uuid
  venue_id: uuid
  product_id: uuid
  lot_id: uuid (optional)
  user_id: uuid
  movement_type: enum
  quantity: decimal (positive/negative)
  qty_before: decimal (audit)
  qty_after: decimal (audit)
  unit_cost: decimal
  total_cost: decimal
  reference: string
  notes: string
  metadata: jsonb
  movement_date: timestamptz
}
```

## API Endpoints

### Product Categories
- `POST /api/v1/product-categories` - Create category (admin/manager)
- `GET /api/v1/product-categories` - List all categories
- `GET /api/v1/product-categories/:id` - Get category details
- `PATCH /api/v1/product-categories/:id` - Update category (admin/manager)
- `DELETE /api/v1/product-categories/:id` - Soft delete category (admin/manager)

### Suppliers
- `POST /api/v1/suppliers` - Create supplier (admin/manager)
- `GET /api/v1/suppliers` - List all suppliers
- `GET /api/v1/suppliers/:id` - Get supplier details
- `PATCH /api/v1/suppliers/:id` - Update supplier (admin/manager)
- `DELETE /api/v1/suppliers/:id` - Soft delete supplier (admin/manager)

### Products
- `POST /api/v1/products` - Create product (admin/manager)
- `GET /api/v1/products` - List all products
- `GET /api/v1/products?lowStock=true` - Get low stock products
- `GET /api/v1/products/:id` - Get product details
- `GET /api/v1/products/sku/:sku` - Get product by SKU
- `PATCH /api/v1/products/:id` - Update product (admin/manager)
- `DELETE /api/v1/products/:id` - Soft delete product (admin/manager)

### Lots
- `POST /api/v1/lots` - Create lot (admin/manager)
- `GET /api/v1/lots/product/:product_id` - List lots for product
- `GET /api/v1/lots/expiring-soon?days=30` - Get expiring lots
- `GET /api/v1/lots/:id` - Get lot details
- `PATCH /api/v1/lots/:id` - Update lot (admin/manager)
- `DELETE /api/v1/lots/:id` - Soft delete lot (admin/manager)

### Stock Movements
- `POST /api/v1/stock-movements` - Create atomic stock movement (admin/manager)
- `GET /api/v1/stock-movements` - List recent movements
- `GET /api/v1/stock-movements/product/:product_id` - Get product movement history
- `GET /api/v1/stock-movements/:id` - Get movement details
- `GET /api/v1/stock-movements/stock-summary/:product_id` - Get FEFO stock summary

## FEFO Algorithm Details

### Priority Rules
1. **Expiration Date**: Lots expiring sooner are allocated first
2. **Creation Date**: For same expiration, older lots are allocated first (FIFO)
3. **No Expiration**: Lots without expiration date are allocated last

### Example
```
Lot A: expires 2024-12-31, created 2024-01-01, qty: 50
Lot B: expires 2024-11-30, created 2024-02-01, qty: 30
Lot C: expires 2024-12-31, created 2024-01-15, qty: 20

Request: allocate 60 units

Result:
1. Lot B: 30 units (expires soonest)
2. Lot A: 30 units (same expiration as C, but created earlier)
Total: 60 units allocated
```

### Code Implementation
```typescript
const lots = await this.lotRepository
  .createQueryBuilder('lot')
  .where('lot.product_id = :product_id', { product_id })
  .andWhere('lot.active = true')
  .andWhere('lot.qty_current > 0')
  .orderBy('lot.expiration_date', 'ASC', 'NULLS LAST')
  .addOrderBy('lot.created_at', 'ASC')
  .getMany();
```

## Atomic Transaction Pattern

### Stock Movement Flow
```typescript
await dataSource.transaction(async (manager) => {
  // 1. Lock product row
  const product = await manager.findOne(Product, {
    where: { id, venue_id },
    lock: { mode: 'pessimistic_write' }
  });

  // 2. Lock lot row (if applicable)
  const lot = await manager.findOne(Lot, {
    where: { id: lot_id },
    lock: { mode: 'pessimistic_write' }
  });

  // 3. Validate no negative stock
  if (qty_after < 0) throw BadRequestException();

  // 4. Update lot quantity
  lot.qty_current = qty_after;
  await manager.save(Lot, lot);

  // 5. Update product stock
  product.current_stock = qty_after;
  await manager.save(Product, product);

  // 6. Create immutable movement record
  const movement = manager.create(StockMovement, {...});
  return await manager.save(StockMovement, movement);
});
```

## Security & Authorization

### VenueGuard
All Phase 2 endpoints protected with:
- `@UseGuards(JwtAuthGuard, VenueGuard, RolesGuard)`
- VenueGuard ensures venue isolation
- RolesGuard enforces RBAC permissions

### Permissions
- **Admin/Manager**: Full CRUD access
- **Waiter/Kitchen/Bartender**: Read-only access
- All operations scoped to user's venue

## Validation

### DTOs with class-validator
```typescript
class CreateProductDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(100)
  sku: string;

  @IsEnum(ProductType)
  product_type: ProductType;

  @IsNumber()
  @Min(0)
  cost_price: number;

  // ... more validations
}
```

## Performance Requirements

### Benchmarks
- Stock operations: < 200ms (atomic transactions)
- FEFO allocation: < 500ms (complex queries)
- Product queries: < 100ms (indexed)

### Optimizations
- Database indexes on:
  - `products.sku` (unique)
  - `lots.lot_number` (unique)
  - `lots.expiration_date` (FEFO sorting)
  - `lots.product_id` (foreign key)
  - `stock_movements.product_id` (audit queries)
- Pessimistic locking only when needed
- Query result limits (e.g., last 100 movements)

## Testing

### Unit Tests
Run FEFO algorithm tests:
```bash
npm run test:unit
```

Tests include:
- FEFO allocation with various expiration dates
- FIFO fallback for same expiration
- Null expiration handling
- Insufficient stock scenarios
- Non-tracked product handling
- Negative quantity validation

### Results
```
✓ should allocate from lot with nearest expiration date first
✓ should use FIFO when expiration dates are the same
✓ should handle lots without expiration dates (NULLS LAST)
✓ should fail when insufficient stock
✓ should handle non-tracked products
✓ should reject negative or zero quantity
✓ should return stock summary with lot breakdown
✓ should indicate when stock is below minimum
```

## Example Usage

### 1. Create Product with Lot Tracking
```bash
POST /api/v1/products
{
  "name": "Pilsner Beer 33cl",
  "sku": "BEER-PIL-33",
  "product_type": "beer",
  "unit_of_measure": "bottle",
  "cost_price": 1.50,
  "sell_price": 3.50,
  "minimum_stock": 24,
  "track_lots": true
}
```

### 2. Create Lot with Expiration
```bash
POST /api/v1/lots
{
  "product_id": "...",
  "lot_number": "LOT-2024-001",
  "qty_initial": 100,
  "cost_price": 1.45,
  "expiration_date": "2025-12-31",
  "received_date": "2024-10-22"
}
```

### 3. Create Stock Movement (Purchase)
```bash
POST /api/v1/stock-movements
{
  "product_id": "...",
  "lot_id": "...",
  "movement_type": "purchase",
  "quantity": 100,
  "unit_cost": 1.45,
  "reference": "PO-2024-123"
}
```

### 4. Create Stock Movement (Sale with FEFO)
```bash
POST /api/v1/stock-movements
{
  "product_id": "...",
  "movement_type": "sale",
  "quantity": -10,
  "reference": "ORDER-456"
}
```
The system automatically uses FEFO to allocate from lots with nearest expiration.

### 5. Check Stock Summary
```bash
GET /api/v1/stock-movements/stock-summary/:product_id

Response:
{
  "product_id": "...",
  "product_name": "Pilsner Beer 33cl",
  "sku": "BEER-PIL-33",
  "current_stock": 90,
  "minimum_stock": 24,
  "below_minimum": false,
  "track_lots": true,
  "lots": [
    {
      "lot_id": "...",
      "lot_number": "LOT-2024-001",
      "qty_current": 90,
      "expiration_date": "2025-12-31",
      "cost_price": 1.45
    }
  ]
}
```

## Next Steps: Phase 3

Phase 2 is complete. Ready to proceed to Phase 3:
- Orders management
- Tables management
- Real-time updates with WebSockets
- Point of Sale integration

---

**Phase 2 Complete** - Full product & inventory management with FEFO algorithm and atomic transactions.
