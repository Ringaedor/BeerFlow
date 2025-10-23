import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * StockHealthIndicator - Custom health check for stock operations
 *
 * Validates:
 * - Database query performance for stock operations
 * - FEFO allocation query performance
 * - Product availability queries
 * - Stock movement table accessibility
 *
 * Thresholds:
 * - Healthy: < 100ms for critical queries
 * - Warning: 100-200ms
 * - Critical: > 200ms
 */
@Injectable()
export class StockHealthIndicator extends HealthIndicator {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  /**
   * Check stock operations health
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Test critical stock queries
      await this.testProductQuery();
      await this.testLotQuery();
      await this.testStockMovementQuery();

      const duration = Date.now() - startTime;

      // Determine health status based on performance
      if (duration > 200) {
        throw new HealthCheckError(
          'Stock operations slow',
          this.getStatus(key, false, { duration, threshold: 200 }),
        );
      }

      const status = duration > 100 ? 'warning' : 'healthy';

      return this.getStatus(key, true, {
        duration: `${duration}ms`,
        status,
        message: status === 'warning' ? 'Stock operations slower than optimal' : 'Stock operations healthy',
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new HealthCheckError(
        'Stock operations check failed',
        this.getStatus(key, false, {
          duration: `${duration}ms`,
          error: error.message,
        }),
      );
    }
  }

  /**
   * Test product query performance
   */
  private async testProductQuery(): Promise<void> {
    await this.dataSource.query(
      'SELECT COUNT(*) FROM products WHERE active = true LIMIT 1',
    );
  }

  /**
   * Test lot query performance (FEFO critical)
   */
  private async testLotQuery(): Promise<void> {
    await this.dataSource.query(
      `SELECT id, expiration_date, created_at FROM lots
       WHERE active = true AND qty_current > 0
       ORDER BY expiration_date ASC NULLS LAST, created_at ASC
       LIMIT 10`,
    );
  }

  /**
   * Test stock movement query performance
   */
  private async testStockMovementQuery(): Promise<void> {
    await this.dataSource.query(
      'SELECT COUNT(*) FROM stock_movements LIMIT 1',
    );
  }
}
