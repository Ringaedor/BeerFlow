import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { TestModule } from '../test/test.module';
import { getTestDatabaseConfig } from '../config/database-test.config';
import { User } from '../database/entities/user.entity';
import { Venue } from '../database/entities/venue.entity';
import { UserRole } from '../database/enums/user-role.enum';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Auth Controller (Integration)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let venueRepository: Repository<Venue>;

  const testVenue = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test Venue',
    address: 'Test Address',
    active: true,
  };

  const testUser = {
    id: '00000000-0000-0000-0000-000000000002',
    venue_id: testVenue.id,
    email: 'test@beerflow.demo',
    password: 'testPassword123!',
    name: 'Test User',
    role: UserRole.WAITER,
    permissions: ['orders.create', 'orders.read'],
    active: true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as main app
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api/v1');

    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    venueRepository = moduleFixture.get<Repository<Venue>>(getRepositoryToken(Venue));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    await userRepository.clear();
    await venueRepository.clear();

    // Insert test data
    await venueRepository.save(testVenue);

    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await userRepository.save({
      ...testUser,
      password_hash: hashedPassword,
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
      expect(response.body).toHaveProperty('expires_in');
      expect(response.body.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        venue_id: testUser.venue_id,
      });
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should fail login with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@email.com',
          password: testUser.password,
        })
        .expect(401);
    });

    it('should fail login with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongPassword',
        })
        .expect(401);
    });

    it('should fail login with inactive user', async () => {
      await userRepository.update(testUser.id, { active: false });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);
    });

    it('should validate request body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let authToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      authToken = loginResponse.body.access_token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        venue_id: testUser.venue_id,
      });
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should fail without authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should fail with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });
});
