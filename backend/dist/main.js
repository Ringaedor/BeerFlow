"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const metrics_interceptor_1 = require("./common/interceptors/metrics.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalInterceptors(new metrics_interceptor_1.MetricsInterceptor());
    app.enableCors({
        origin: configService.get('CORS_ORIGIN'),
        credentials: true,
    });
    app.setGlobalPrefix('api/v1');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('BeerFlow API')
        .setDescription('Complete brewery management system API - Phase 1 & 2')
        .setVersion('2.0')
        .addBearerAuth()
        .addTag('auth', 'Authentication endpoints')
        .addTag('venues', 'Venue management')
        .addTag('users', 'User management')
        .addTag('health', 'Health check endpoints')
        .addTag('product-categories', 'Product categories management')
        .addTag('suppliers', 'Supplier management')
        .addTag('products', 'Product & inventory management')
        .addTag('lots', 'Lot tracking with FEFO')
        .addTag('stock-movements', 'Stock movements & audit trail')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = configService.get('PORT') || 3000;
    await app.listen(port);
    console.log(`🍺 BeerFlow API is running on: http://localhost:${port}`);
    console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map