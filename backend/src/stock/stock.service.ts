import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from '../database/entities/product.entity';
import { Lot } from '../database/entities/lot.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';
import { StockMovementType } from '../database/enums/stock-movement-type.enum';

export interface FEFOAllocation {
  lot_id: string;
  lot_number: string;
  quantity: number;
  expiration_date: Date | null;
}

export interface StockAllocationResult {
  success: boolean;
  allocations: FEFOAllocation[];
  total_allocated: number;
  message?: string;
}

/**
 * StockService - Core business logic for inventory management
 *
 * Key responsibilities:
 * 1. FEFO (First-Expired, First-Out) allocation algorithm
 * 2. Atomic stock movements with transactions
 * 3. Stock consistency validation
 * 4. Negative stock prevention
 */
@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Lot)
    private readonly lotRepository: Repository<Lot>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * FEFO Algorithm: First-Expired, First-Out
   *
   * Allocates stock from lots with nearest expiration date first.
   * For lots with same expiration (or no expiration), uses creation date (FIFO).
   *
   * @param product_id - Product to allocate from
   * @param quantity - Quantity to allocate
   * @param venue_id - Venue scope for isolation
   * @returns Allocation result with lot assignments
   */
  async allocateFEFO(
    product_id: string,
    quantity: number,
    venue_id: string,
  ): Promise<StockAllocationResult> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    // Get product with lots
    const product = await this.productRepository.findOne({
      where: { id: product_id, venue_id, active: true },
      relations: ['lots'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if product tracks lots
    if (!product.track_lots) {
      // For non-tracked products, simple stock check
      if (product.current_stock < quantity) {
        return {
          success: false,
          allocations: [],
          total_allocated: 0,
          message: `Insufficient stock. Available: ${product.current_stock}, Requested: ${quantity}`,
        };
      }

      return {
        success: true,
        allocations: [],
        total_allocated: quantity,
        message: 'Stock allocated from non-tracked product',
      };
    }

    // Get available lots sorted by FEFO rules
    const availableLots = await this.lotRepository
      .createQueryBuilder('lot')
      .where('lot.product_id = :product_id', { product_id })
      .andWhere('lot.active = true')
      .andWhere('lot.qty_current > 0')
      .orderBy('lot.expiration_date', 'ASC', 'NULLS LAST') // Expired first, null last
      .addOrderBy('lot.created_at', 'ASC') // FIFO for same expiration
      .getMany();

    if (availableLots.length === 0) {
      return {
        success: false,
        allocations: [],
        total_allocated: 0,
        message: 'No available lots found',
      };
    }

    // FEFO Allocation Algorithm
    const allocations: FEFOAllocation[] = [];
    let remaining = quantity;

    for (const lot of availableLots) {
      if (remaining <= 0) break;

      const allocateFromLot = Math.min(
        Number(lot.qty_current),
        remaining,
      );

      allocations.push({
        lot_id: lot.id,
        lot_number: lot.lot_number,
        quantity: allocateFromLot,
        expiration_date: lot.expiration_date,
      });

      remaining -= allocateFromLot;
    }

    const total_allocated = quantity - remaining;

    if (remaining > 0) {
      return {
        success: false,
        allocations,
        total_allocated,
        message: `Insufficient stock. Available: ${total_allocated}, Requested: ${quantity}`,
      };
    }

    return {
      success: true,
      allocations,
      total_allocated,
      message: 'FEFO allocation successful',
    };
  }

  /**
   * Execute atomic stock movement
   *
   * This method MUST be transactional to ensure data consistency:
   * 1. Create stock movement record (immutable audit trail)
   * 2. Update lot quantity (if lot-tracked)
   * 3. Update product current_stock
   *
   * All steps must succeed or all fail (ACID compliance).
   *
   * @param movement_data - Movement details
   * @param user_id - User executing the movement
   * @returns Created stock movement
   */
  async executeStockMovement(
    movement_data: {
      venue_id: string;
      product_id: string;
      lot_id?: string;
      movement_type: StockMovementType;
      quantity: number;
      unit_cost?: number;
      reference?: string;
      notes?: string;
      metadata?: Record<string, any>;
    },
    user_id: string,
  ): Promise<StockMovement> {
    // Start transaction
    return await this.dataSource.transaction(async (manager) => {
      // 1. Get product with lock
      const product = await manager.findOne(Product, {
        where: {
          id: movement_data.product_id,
          venue_id: movement_data.venue_id,
          active: true,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const qty_before = Number(product.current_stock);
      const qty_change = Number(movement_data.quantity);
      const qty_after = qty_before + qty_change;

      // 2. Validate stock won't go negative
      if (qty_after < 0) {
        throw new BadRequestException(
          `Operation would result in negative stock. Current: ${qty_before}, Change: ${qty_change}`,
        );
      }

      // 3. If lot-tracked, update lot quantity
      let lot: Lot | null = null;
      if (movement_data.lot_id) {
        lot = await manager.findOne(Lot, {
          where: {
            id: movement_data.lot_id,
            product_id: movement_data.product_id,
            active: true,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!lot) {
          throw new NotFoundException('Lot not found');
        }

        const lot_qty_before = Number(lot.qty_current);
        const lot_qty_after = lot_qty_before + qty_change;

        if (lot_qty_after < 0) {
          throw new BadRequestException(
            `Operation would result in negative lot stock. Lot: ${lot.lot_number}, Current: ${lot_qty_before}, Change: ${qty_change}`,
          );
        }

        // Update lot quantity
        lot.qty_current = lot_qty_after;
        await manager.save(Lot, lot);
      }

      // 4. Update product stock
      product.current_stock = qty_after;
      await manager.save(Product, product);

      // 5. Create immutable stock movement record (audit trail)
      const movement = manager.create(StockMovement, {
        venue_id: movement_data.venue_id,
        product_id: movement_data.product_id,
        lot_id: movement_data.lot_id,
        user_id,
        movement_type: movement_data.movement_type,
        quantity: qty_change,
        qty_before,
        qty_after,
        unit_cost: movement_data.unit_cost,
        total_cost: movement_data.unit_cost
          ? movement_data.unit_cost * Math.abs(qty_change)
          : undefined,
        reference: movement_data.reference,
        notes: movement_data.notes,
        metadata: movement_data.metadata || {},
        movement_date: new Date(),
      });

      return await manager.save(StockMovement, movement);
    });
  }

  /**
   * Execute FEFO-based sale or consumption
   *
   * Uses FEFO algorithm to determine lot allocations,
   * then creates atomic movements for each lot.
   *
   * @param product_id - Product to consume
   * @param quantity - Quantity to consume
   * @param venue_id - Venue scope
   * @param user_id - User executing the operation
   * @param movement_type - Type of movement (SALE, WASTE, etc.)
   * @param reference - External reference
   * @returns Array of created movements
   */
  async executeFEFOMovement(
    product_id: string,
    quantity: number,
    venue_id: string,
    user_id: string,
    movement_type: StockMovementType,
    reference?: string,
    notes?: string,
  ): Promise<StockMovement[]> {
    // 1. Calculate FEFO allocations
    const allocation = await this.allocateFEFO(product_id, quantity, venue_id);

    if (!allocation.success) {
      throw new BadRequestException(allocation.message);
    }

    // 2. Execute atomic movement for each lot allocation
    const movements: StockMovement[] = [];

    for (const alloc of allocation.allocations) {
      const movement = await this.executeStockMovement(
        {
          venue_id,
          product_id,
          lot_id: alloc.lot_id,
          movement_type,
          quantity: -alloc.quantity, // Negative for consumption
          reference,
          notes,
        },
        user_id,
      );

      movements.push(movement);
    }

    return movements;
  }

  /**
   * Get stock summary for a product
   *
   * @param product_id - Product ID
   * @param venue_id - Venue scope
   * @returns Stock summary with lot breakdown
   */
  async getStockSummary(product_id: string, venue_id: string) {
    const product = await this.productRepository.findOne({
      where: { id: product_id, venue_id, active: true },
      relations: ['lots'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const lots = await this.lotRepository.find({
      where: { product_id, active: true },
      order: {
        expiration_date: 'ASC',
        created_at: 'ASC',
      },
    });

    return {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      current_stock: Number(product.current_stock),
      minimum_stock: Number(product.minimum_stock),
      below_minimum: Number(product.current_stock) < Number(product.minimum_stock),
      track_lots: product.track_lots,
      lots: lots.map((lot) => ({
        lot_id: lot.id,
        lot_number: lot.lot_number,
        qty_current: Number(lot.qty_current),
        expiration_date: lot.expiration_date,
        cost_price: Number(lot.cost_price),
      })),
    };
  }
}
