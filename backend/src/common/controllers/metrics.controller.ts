import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrometheusMetricsService } from '../services/prometheus-metrics.service';

/**
 * MetricsController - Prometheus metrics endpoint
 *
 * Exposes business metrics in Prometheus format for scraping.
 * Endpoint: GET /metrics
 *
 * Configure Prometheus to scrape:
 * scrape_configs:
 *   - job_name: 'beerflow'
 *     static_configs:
 *       - targets: ['localhost:3000']
 *     metrics_path: '/metrics'
 */
@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: PrometheusMetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Prometheus metrics endpoint',
    description: 'Returns metrics in Prometheus text format for scraping',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus format',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: `# HELP beerflow_stock_movements_total Total number of stock movements
# TYPE beerflow_stock_movements_total counter
beerflow_stock_movements_total{venue_id="venue-123",movement_type="purchase",status="success"} 42`,
        },
      },
    },
  })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
