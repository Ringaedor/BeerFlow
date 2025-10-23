import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry, register } from 'prom-client';

/**
 * PrometheusMetricsService - Business metrics for stock operations
 *
 * Tracks critical business KPIs:
 * - Stock movement operations (count, success, failures)
 * - FEFO allocations (performance, failures)
 * - Product queries (performance)
 * - Current stock levels
 * - Low stock alerts
 *
 * Metrics exposed at /metrics endpoint for Prometheus scraping
 */
@Injectable()
export class PrometheusMetricsService {
  private readonly registry: Registry;

  // Stock Movement Metrics
  public readonly stockMovementTotal: Counter;
  public readonly stockMovementDuration: Histogram;
  public readonly stockMovementErrors: Counter;

  // FEFO Allocation Metrics
  public readonly fefoAllocationTotal: Counter;
  public readonly fefoAllocationDuration: Histogram;
  public readonly fefoAllocationErrors: Counter;

  // Product Query Metrics
  public readonly productQueryTotal: Counter;
  public readonly productQueryDuration: Histogram;

  // Business KPIs
  public readonly currentStockLevel: Gauge;
  public readonly lowStockProducts: Gauge;
  public readonly totalProductValue: Gauge;

  // System Health Metrics
  public readonly healthCheckDuration: Histogram;

  constructor() {
    // Use default registry or create new one
    this.registry = register;

    // Stock Movement Metrics
    this.stockMovementTotal = new Counter({
      name: 'beerflow_stock_movements_total',
      help: 'Total number of stock movements',
      labelNames: ['venue_id', 'movement_type', 'status'],
      registers: [this.registry],
    });

    this.stockMovementDuration = new Histogram({
      name: 'beerflow_stock_movement_duration_ms',
      help: 'Stock movement operation duration in milliseconds',
      labelNames: ['venue_id', 'movement_type'],
      buckets: [10, 25, 50, 100, 200, 500, 1000],
      registers: [this.registry],
    });

    this.stockMovementErrors = new Counter({
      name: 'beerflow_stock_movement_errors_total',
      help: 'Total number of stock movement errors',
      labelNames: ['venue_id', 'movement_type', 'error_type'],
      registers: [this.registry],
    });

    // FEFO Allocation Metrics
    this.fefoAllocationTotal = new Counter({
      name: 'beerflow_fefo_allocations_total',
      help: 'Total number of FEFO allocations',
      labelNames: ['venue_id', 'status'],
      registers: [this.registry],
    });

    this.fefoAllocationDuration = new Histogram({
      name: 'beerflow_fefo_allocation_duration_ms',
      help: 'FEFO allocation duration in milliseconds',
      labelNames: ['venue_id'],
      buckets: [10, 50, 100, 200, 500, 1000, 2000],
      registers: [this.registry],
    });

    this.fefoAllocationErrors = new Counter({
      name: 'beerflow_fefo_allocation_errors_total',
      help: 'Total number of FEFO allocation errors',
      labelNames: ['venue_id', 'error_type'],
      registers: [this.registry],
    });

    // Product Query Metrics
    this.productQueryTotal = new Counter({
      name: 'beerflow_product_queries_total',
      help: 'Total number of product queries',
      labelNames: ['venue_id', 'query_type'],
      registers: [this.registry],
    });

    this.productQueryDuration = new Histogram({
      name: 'beerflow_product_query_duration_ms',
      help: 'Product query duration in milliseconds',
      labelNames: ['venue_id', 'query_type'],
      buckets: [5, 10, 25, 50, 100, 200],
      registers: [this.registry],
    });

    // Business KPIs
    this.currentStockLevel = new Gauge({
      name: 'beerflow_current_stock_level',
      help: 'Current stock level by product',
      labelNames: ['venue_id', 'product_id', 'product_name', 'sku'],
      registers: [this.registry],
    });

    this.lowStockProducts = new Gauge({
      name: 'beerflow_low_stock_products_count',
      help: 'Number of products below minimum stock level',
      labelNames: ['venue_id'],
      registers: [this.registry],
    });

    this.totalProductValue = new Gauge({
      name: 'beerflow_total_product_value_eur',
      help: 'Total value of all products in inventory (EUR)',
      labelNames: ['venue_id'],
      registers: [this.registry],
    });

    // System Health Metrics
    this.healthCheckDuration = new Histogram({
      name: 'beerflow_health_check_duration_ms',
      help: 'Health check duration in milliseconds',
      labelNames: ['check_type'],
      buckets: [10, 50, 100, 200, 500],
      registers: [this.registry],
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get content type for metrics endpoint
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Record stock movement operation
   */
  recordStockMovement(
    venueId: string,
    movementType: string,
    duration: number,
    success: boolean,
    errorType?: string,
  ): void {
    const status = success ? 'success' : 'failure';

    this.stockMovementTotal.inc({
      venue_id: venueId,
      movement_type: movementType,
      status,
    });

    this.stockMovementDuration.observe(
      {
        venue_id: venueId,
        movement_type: movementType,
      },
      duration,
    );

    if (!success && errorType) {
      this.stockMovementErrors.inc({
        venue_id: venueId,
        movement_type: movementType,
        error_type: errorType,
      });
    }
  }

  /**
   * Record FEFO allocation operation
   */
  recordFEFOAllocation(
    venueId: string,
    duration: number,
    success: boolean,
    errorType?: string,
  ): void {
    const status = success ? 'success' : 'failure';

    this.fefoAllocationTotal.inc({
      venue_id: venueId,
      status,
    });

    this.fefoAllocationDuration.observe(
      {
        venue_id: venueId,
      },
      duration,
    );

    if (!success && errorType) {
      this.fefoAllocationErrors.inc({
        venue_id: venueId,
        error_type: errorType,
      });
    }
  }

  /**
   * Record product query operation
   */
  recordProductQuery(
    venueId: string,
    queryType: string,
    duration: number,
  ): void {
    this.productQueryTotal.inc({
      venue_id: venueId,
      query_type: queryType,
    });

    this.productQueryDuration.observe(
      {
        venue_id: venueId,
        query_type: queryType,
      },
      duration,
    );
  }

  /**
   * Update current stock level for a product
   */
  updateStockLevel(
    venueId: string,
    productId: string,
    productName: string,
    sku: string,
    stockLevel: number,
  ): void {
    this.currentStockLevel.set(
      {
        venue_id: venueId,
        product_id: productId,
        product_name: productName,
        sku,
      },
      stockLevel,
    );
  }

  /**
   * Update low stock products count
   */
  updateLowStockCount(venueId: string, count: number): void {
    this.lowStockProducts.set({ venue_id: venueId }, count);
  }

  /**
   * Update total product value
   */
  updateTotalProductValue(venueId: string, value: number): void {
    this.totalProductValue.set({ venue_id: venueId }, value);
  }

  /**
   * Record health check duration
   */
  recordHealthCheck(checkType: string, duration: number): void {
    this.healthCheckDuration.observe({ check_type: checkType }, duration);
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.registry.resetMetrics();
  }
}
