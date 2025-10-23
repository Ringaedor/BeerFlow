import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { StockHealthIndicator } from './stock-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [StockHealthIndicator],
})
export class HealthModule {}
