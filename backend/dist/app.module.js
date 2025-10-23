"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const database_module_1 = require("./database/database.module");
const venues_module_1 = require("./venues/venues.module");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const health_module_1 = require("./health/health.module");
const common_module_1 = require("./common/common.module");
const product_categories_module_1 = require("./product-categories/product-categories.module");
const suppliers_module_1 = require("./suppliers/suppliers.module");
const products_module_1 = require("./products/products.module");
const lots_module_1 = require("./lots/lots.module");
const stock_movements_module_1 = require("./stock-movements/stock-movements.module");
const stock_module_1 = require("./stock/stock.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            database_module_1.DatabaseModule,
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            venues_module_1.VenuesModule,
            users_module_1.UsersModule,
            health_module_1.HealthModule,
            product_categories_module_1.ProductCategoriesModule,
            suppliers_module_1.SuppliersModule,
            products_module_1.ProductsModule,
            lots_module_1.LotsModule,
            stock_module_1.StockModule,
            stock_movements_module_1.StockMovementsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map