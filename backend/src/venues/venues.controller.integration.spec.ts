import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { TestModule } from '../test/test.module';
import { User } from '../database/entities/user.entity';
import { Venue } from '../database/entities/venue.entity';
import { UserRole } from '../database/enums/user-role.enum';
import { Repository } from 'typeorm';

describe('Venues Controller (Integration)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let venueRepository: Repository<Venue>;

  const testVenue = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test Venue',
    address: 'Test Address',
    active: true,
  };

  const adminUser = {
    id: '00000000-0000-0000-0000-000000000002',
    venue_id: testVenue.id,
    email: 'admin@beerflow.demo',
    password: 'adminPassword123!',
    name: 'Admin User',
    role: UserRole.ADMIN,
    permissions: ['venues.manage'],
    active: true,
  };

  const waiterUser = {
    id: '00000000-0000-0000-0000-000000000003',
    venue_id: testVenue.id,
    email: 'waiter@beerflow.demo',
    password: 'waiterPassword123!',
    name: 'Waiter User',
    role: UserRole.WAITER,
    permissions: ['orders.create'],
    active: true,
  };

  let adminToken: string;
  let waiterToken: string;

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

    const adminHashedPassword = await bcrypt.hash(adminUser.password, 10);
    await userRepository.save({
      ...adminUser,
      password_hash: adminHashedPassword,
    });

    const waiterHashedPassword = await bcrypt.hash(waiterUser.password, 10);
    await userRepository.save({
      ...waiterUser,
      password_hash: waiterHashedPassword,
    });

    // Get auth tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password,
      });
    adminToken = adminLogin.body.access_token;

    const waiterLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: waiterUser.email,
        password: waiterUser.password,
      });
    waiterToken = waiterLogin.body.access_token;
  });

  describe('GET /api/v1/venues', () => {
    it('should return venues for admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: testVenue.id,
        name: testVenue.name,
        address: testVenue.address,
      });
    });

    it('should fail for waiter user (insufficient permissions)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/venues')
        .set('Authorization', `Bearer ${waiterToken}`)
        .expect(403);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/venues')
        .expect(401);
    });
  });

  describe('POST /api/v1/venues', () => {
    const newVenueData = {
      name: 'New Test Venue',
      address: 'New Test Address',
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
      },
    };

    it('should create venue successfully for admin user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newVenueData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: newVenueData.name,
        address: newVenueData.address,
        settings: expect.objectContaining(newVenueData.settings),
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('created_at');
    });

    it('should fail for waiter user (insufficient permissions)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send(newVenueData)
        .expect(403);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          address: 'Missing name field',
        })
        .expect(400);
    });

    it('should reject invalid field types', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 123, // Should be string
          address: 'Test Address',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/venues/:id', () => {
    it('should return specific venue', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/venues/${testVenue.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testVenue.id,
        name: testVenue.name,
        address: testVenue.address,
      });
    });

    it('should return 404 for non-existent venue', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/venues/00000000-0000-0000-0000-000000000999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should validate UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/venues/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
