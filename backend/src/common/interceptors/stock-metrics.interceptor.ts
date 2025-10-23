import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrometheusMetricsService } from '../services/prometheus-metrics.service';

/**
 * StockMetricsInterceptor - Specialized monitoring for stock operations
 *
 * Tracks performance and errors for critical business operations:
 * - Stock movements (purchase, sale, adjustment)
 * - FEFO allocations
 * - Lot operations
 * - Product queries
 *
 * Performance thresholds:
 * - Stock movements: < 100ms (WARNING at 100ms, CRITICAL at 200ms)
 * - FEFO allocation: < 200ms (WARNING at 200ms, CRITICAL at 500ms)
 * - Product queries: < 50ms (WARNING at 50ms, CRITICAL at 100ms)
 */
@Injectable()
export class StockMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(StockMetricsInterceptor.name);

  constructor(
    @Optional() private readonly prometheusMetrics?: PrometheusMetricsService,
  ) {}

  // Performance thresholds (ms)
  private readonly THRESHOLDS = {
    'POST /stock-movements': { warning: 100, critical: 200 },
    'POST /stock-movements/fefo': { warning: 200, critical: 500 },
    'GET /products': { warning: 50, critical: 100 },
    'GET /lots': { warning: 50, critical: 100 },
    'GET /stock-movements/stock-summary': { warning: 100, critical: 200 },
  };

  // Counters for metrics
  private metrics = {
    stockMovements: { count: 0, totalTime: 0, errors: 0 },
    fefoAllocations: { count: 0, totalTime: 0, errors: 0 },
    productQueries: { count: 0, totalTime: 0, errors: 0 },
    lotQueries: { count: 0, totalTime: 0, errors: 0 },
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;

    // Only track stock-related endpoints
    if (!this.isStockRelatedEndpoint(url)) {
      return next.handle();
    }

    const operation = this.getOperationType(method, url);
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.trackSuccess(operation, duration, method, url, user);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.trackError(operation, duration, method, url, error, user);
        },
      }),
    );
  }

  private isStockRelatedEndpoint(url: string): boolean {
    return (
      url.includes('/stock-movements') ||
      url.includes('/products') ||
      url.includes('/lots') ||
      url.includes('/product-categories') ||
      url.includes('/suppliers')
    );
  }

  private getOperationType(method: string, url: string): string {
    if (url.includes('/stock-movements') && method === 'POST') {
      return url.includes('/fefo') ? 'fefoAllocation' : 'stockMovement';
    }
    if (url.includes('/products')) return 'productQuery';
    if (url.includes('/lots')) return 'lotQuery';
    if (url.includes('/product-categories')) return 'categoryQuery';
    if (url.includes('/suppliers')) return 'supplierQuery';
    return 'unknown';
  }

  private getThreshold(method: string, url: string) {
    const key = `${method} ${this.getEndpointPattern(url)}`;
    return this.THRESHOLDS[key] || { warning: 100, critical: 200 };
  }

  private getEndpointPattern(url: string): string {
    if (url.includes('/stock-movements/stock-summary')) {
      return '/stock-movements/stock-summary';
    }
    if (url.includes('/stock-movements/fefo')) {
      return '/stock-movements/fefo';
    }
    if (url.includes('/stock-movements')) {
      return '/stock-movements';
    }
    if (url.includes('/products')) return '/products';
    if (url.includes('/lots')) return '/lots';
    return url;
  }

  private trackSuccess(
    operation: string,
    duration: number,
    method: string,
    url: string,
    user: any,
  ): void {
    const threshold = this.getThreshold(method, url);
    const userId = user?.id || 'anonymous';
    const venueId = user?.venue_id || 'unknown';

    // Update metrics
    if (this.metrics[operation]) {
      this.metrics[operation].count++;
      this.metrics[operation].totalTime += duration;
    }

    // Record to Prometheus
    if (this.prometheusMetrics) {
      if (operation === 'stockMovement' || operation === 'fefoAllocation') {
        const movementType = this.extractMovementType(url);
        this.prometheusMetrics.recordStockMovement(
          venueId,
          movementType,
          duration,
          true,
        );
      } else if (operation === 'productQuery' || operation === 'lotQuery') {
        this.prometheusMetrics.recordProductQuery(venueId, operation, duration);
      }
    }

    // Log based on performance
    if (duration >= threshold.critical) {
      this.logger.error(
        `🚨 CRITICAL SLOW OPERATION: ${method} ${url} - ${duration}ms (threshold: ${threshold.critical}ms) | User: ${userId} | Venue: ${venueId}`,
      );
    } else if (duration >= threshold.warning) {
      this.logger.warn(
        `⚠️  SLOW OPERATION: ${method} ${url} - ${duration}ms (threshold: ${threshold.warning}ms) | User: ${userId} | Venue: ${venueId}`,
      );
    } else {
      this.logger.log(
        `✅ ${operation}: ${method} ${url} - ${duration}ms | User: ${userId} | Venue: ${venueId}`,
      );
    }
  }

  private trackError(
    operation: string,
    duration: number,
    method: string,
    url: string,
    error: any,
    user: any,
  ): void {
    const userId = user?.id || 'anonymous';
    const venueId = user?.venue_id || 'unknown';

    // Update error metrics
    if (this.metrics[operation]) {
      this.metrics[operation].errors++;
    }

    // Record to Prometheus
    if (this.prometheusMetrics) {
      const errorType = error?.name || 'UnknownError';
      if (operation === 'stockMovement' || operation === 'fefoAllocation') {
        const movementType = this.extractMovementType(url);
        this.prometheusMetrics.recordStockMovement(
          venueId,
          movementType,
          duration,
          false,
          errorType,
        );
      }
    }

    this.logger.error(
      `❌ OPERATION FAILED: ${method} ${url} - ${duration}ms | Error: ${error.message} | User: ${userId} | Venue: ${venueId}`,
      error.stack,
    );
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    const calculateAverage = (totalTime: number, count: number) =>
      count > 0 ? Math.round(totalTime / count) : 0;

    return {
      stockMovements: {
        ...this.metrics.stockMovements,
        averageTime: calculateAverage(
          this.metrics.stockMovements.totalTime,
          this.metrics.stockMovements.count,
        ),
      },
      fefoAllocations: {
        ...this.metrics.fefoAllocations,
        averageTime: calculateAverage(
          this.metrics.fefoAllocations.totalTime,
          this.metrics.fefoAllocations.count,
        ),
      },
      productQueries: {
        ...this.metrics.productQueries,
        averageTime: calculateAverage(
          this.metrics.productQueries.totalTime,
          this.metrics.productQueries.count,
        ),
      },
      lotQueries: {
        ...this.metrics.lotQueries,
        averageTime: calculateAverage(
          this.metrics.lotQueries.totalTime,
          this.metrics.lotQueries.count,
        ),
      },
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    Object.keys(this.metrics).forEach((key) => {
      this.metrics[key] = { count: 0, totalTime: 0, errors: 0 };
    });
  }

  /**
   * Extract movement type from URL for Prometheus labels
   */
  private extractMovementType(url: string): string {
    if (url.includes('/fefo')) return 'fefo';
    if (url.includes('/stock-movements')) return 'stock_movement';
    if (url.includes('/products')) return 'product_query';
    if (url.includes('/lots')) return 'lot_query';
    return 'unknown';
  }
}
