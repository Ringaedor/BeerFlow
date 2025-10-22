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

describe('Users Controller (Integration)', () => {
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
    permissions: ['users.manage'],
    active: true,
  };

  const testUserData = {
    id: '00000000-0000-0000-0000-000000000003',
    venue_id: testVenue.id,
    email: 'test@beerflow.demo',
    password: 'testPassword123!',
    name: 'Test User',
    role: UserRole.WAITER,
    permissions: ['orders.create'],
    active: true,
  };

  let adminToken: string;

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

    // Get admin token
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password,
      });
    adminToken = adminLogin.body.access_token;
  });

  describe('GET /api/v1/users', () => {
    it('should return all active users for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).not.toHaveProperty('password_hash');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(401);
    });
  });

  describe('POST /api/v1/users', () => {
    const newUserData = {
      venue_id: testVenue.id,
      email: 'newuser@beerflow.demo',
      password: 'newPassword123!',
      name: 'New User',
      role: UserRole.WAITER,
      permissions: ['orders.create'],
    };

    it('should create user successfully for admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(201);

      expect(response.body).toMatchObject({
        email: newUserData.email,
        name: newUserData.name,
        role: newUserData.role,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should fail when email already exists', async () => {
      // Create first user
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com',
          // Missing required fields
        })
        .expect(400);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...newUserData,
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should validate password length', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...newUserData,
          password: 'short',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return specific user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
      });
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/00000000-0000-0000-0000-000000000999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should validate UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should update password with hashing', async () => {
      const updateData = {
        password: 'newPassword123!',
      };

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      // Verify login works with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminUser.email,
          password: updateData.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should soft delete user', async () => {
      const testHashedPassword = await bcrypt.hash(testUserData.password, 10);
      const savedUser = await userRepository.save({
        ...testUserData,
        password_hash: testHashedPassword,
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${savedUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify user cannot login
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUserData.email,
          password: testUserData.password,
        })
        .expect(401);
    });
  });
});
