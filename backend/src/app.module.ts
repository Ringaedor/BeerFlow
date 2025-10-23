import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { VenuesModule } from './venues/venues.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ProductsModule } from './products/products.module';
import { LotsModule } from './lots/lots.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { StockModule } from './stock/stock.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    CommonModule,
    AuthModule,
    VenuesModule,
    UsersModule,
    HealthModule,
    // Phase 2: Product & Inventory Management
    ProductCategoriesModule,
    SuppliersModule,
    ProductsModule,
    LotsModule,
    StockModule,
    StockMovementsModule,
  ],
})
export class AppModule {}
