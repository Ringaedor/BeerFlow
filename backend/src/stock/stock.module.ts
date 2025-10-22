import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { Product } from '../database/entities/product.entity';
import { Lot } from '../database/entities/lot.entity';
import { StockMovement } from '../database/entities/stock-movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Lot, StockMovement])],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
