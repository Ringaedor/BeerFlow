import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getTestDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'mattia',
  database: 'beerflow_test',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // OK for testing
  dropSchema: true, // Clean start for each test
  logging: false,
});
