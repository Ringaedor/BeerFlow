import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestModule } from '../test/test.module';
import { performanceTest, PerformanceResult } from '../test/performance.util';

describe('Auth Performance Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Setup test data (using existing admin user from demo data)
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Login Performance', () => {
    it('should handle login requests within performance threshold', async () => {
      const loginTest = async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'admin@beerflow.demo',
            password: 'admin123!',
          });

        if (response.status !== 200) {
          throw new Error(`Login failed with status ${response.status}`);
        }

        return response.body;
      };

      const result: PerformanceResult = await performanceTest(loginTest, 50);

      // Performance requirements
      expect(result.averageTime).toBeLessThan(200); // Average < 200ms
      expect(result.maxTime).toBeLessThan(500); // Max < 500ms
      expect(result.successRate).toBe(100); // 100% success rate

      console.log('Login Performance Results:', {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        minTime: `${result.minTime}ms`,
        maxTime: `${result.maxTime}ms`,
        successRate: `${result.successRate}%`,
      });
    });
  });

  describe('Protected Route Performance', () => {
    let authToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@beerflow.demo',
          password: 'admin123!',
        });

      authToken = loginResponse.body.access_token;
    });

    it('should handle protected route requests within performance threshold', async () => {
      const protectedRouteTest = async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status !== 200) {
          throw new Error(`Protected route failed with status ${response.status}`);
        }

        return response.body;
      };

      const result: PerformanceResult = await performanceTest(protectedRouteTest, 100);

      // Performance requirements
      expect(result.averageTime).toBeLessThan(100); // Average < 100ms
      expect(result.maxTime).toBeLessThan(300); // Max < 300ms
      expect(result.successRate).toBe(100); // 100% success rate

      console.log('Protected Route Performance Results:', {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        minTime: `${result.minTime}ms`,
        maxTime: `${result.maxTime}ms`,
        successRate: `${result.successRate}%`,
      });
    });
  });
});
