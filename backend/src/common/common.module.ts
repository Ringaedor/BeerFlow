import { Module, Global } from '@nestjs/common';
import { PrometheusMetricsService } from './services/prometheus-metrics.service';
import { MetricsController } from './controllers/metrics.controller';

/**
 * CommonModule - Shared services and utilities
 *
 * Provides:
 * - PrometheusMetricsService: Business metrics for monitoring
 * - MetricsController: /metrics endpoint for Prometheus
 *
 * Global module - services are available throughout the app
 */
@Global()
@Module({
  providers: [PrometheusMetricsService],
  controllers: [MetricsController],
  exports: [PrometheusMetricsService],
})
export class CommonModule {}
