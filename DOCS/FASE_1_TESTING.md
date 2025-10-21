\# FASE 1 - TESTING CORE BACKEND FOUNDATION



\## Obiettivo Testing

Implementare suite di test completa per validare correttezza, sicurezza e performance dei moduli core implementati nella Fase 1.



\## Framework Testing

\- \*\*Unit Tests\*\*: Jest

\- \*\*Integration Tests\*\*: Supertest + Test Database

\- \*\*E2E Tests\*\*: Supertest + Real scenarios

\- \*\*Performance Tests\*\*: Custom timing utilities



---



\## 1. Setup Test Environment



\### 1.1 Test Database Configuration

```typescript

// src/config/database-test.config.ts

import { TypeOrmModuleOptions } from '@nestjs/typeorm';



export const getTestDatabaseConfig = (): TypeOrmModuleOptions => ({

&nbsp; type: 'postgres',

&nbsp; host: 'localhost',

&nbsp; port: 5432,

&nbsp; username: 'postgres',

&nbsp; password: 'mattia',

&nbsp; database: 'beerflow\_test',

&nbsp; entities: \[\_\_dirname + '/../\*\*/\*.entity{.ts,.js}'],

&nbsp; synchronize: true, // OK for testing

&nbsp; dropSchema: true, // Clean start for each test

&nbsp; logging: false,

});

```



\### 1.2 Test Module Setup

```typescript

// src/test/test.module.ts

import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '@nestjs/config';

import { getTestDatabaseConfig } from '../config/database-test.config';

import { AuthModule } from '../auth/auth.module';

import { VenuesModule } from '../venues/venues.module';

import { UsersModule } from '../users/users.module';



@Module({

&nbsp; imports: \[

&nbsp;   ConfigModule.forRoot({

&nbsp;     isGlobal: true,

&nbsp;     envFilePath: '.env.test',

&nbsp;   }),

&nbsp;   TypeOrmModule.forRoot(getTestDatabaseConfig()),

&nbsp;   AuthModule,

&nbsp;   VenuesModule,

&nbsp;   UsersModule,

&nbsp; ],

})

export class TestModule {}

```



\### 1.3 Test Environment Variables (.env.test)

```env

NODE\_ENV=test

DATABASE\_HOST=localhost

DATABASE\_PORT=5432

DATABASE\_USERNAME=postgres

DATABASE\_PASSWORD=mattia

DATABASE\_NAME=beerflow\_test

JWT\_SECRET=test\_jwt\_secret\_not\_secure

JWT\_EXPIRES\_IN=1h

PORT=3001

```



\### 1.4 Jest Configuration (jest.config.js)

```javascript

module.exports = {

&nbsp; moduleFileExtensions: \['js', 'json', 'ts'],

&nbsp; rootDir: 'src',

&nbsp; testRegex: '.\*\\\\.spec\\\\.ts$',

&nbsp; transform: {

&nbsp;   '^.+\\\\.(t|j)s$': 'ts-jest',

&nbsp; },

&nbsp; collectCoverageFrom: \[

&nbsp;   '\*\*/\*.(t|j)s',

&nbsp;   '!\*\*/\*.spec.ts',

&nbsp;   '!\*\*/\*.interface.ts',

&nbsp;   '!\*\*/node\_modules/\*\*',

&nbsp; ],

&nbsp; coverageDirectory: '../coverage',

&nbsp; testEnvironment: 'node',

&nbsp; setupFilesAfterEnv: \['<rootDir>/test/setup.ts'],

&nbsp; testTimeout: 30000,

};

```



---



\## 2. Unit Tests



\### 2.1 Venues Service Tests (src/venues/venues.service.spec.ts)

```typescript

import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { NotFoundException } from '@nestjs/common';

import { VenuesService } from './venues.service';

import { Venue } from '../database/entities/venue.entity';

import { CreateVenueDto } from './dto/create-venue.dto';

import { UpdateVenueDto } from './dto/update-venue.dto';



describe('VenuesService', () => {

&nbsp; let service: VenuesService;

&nbsp; let repository: Repository<Venue>;



&nbsp; const mockVenue: Venue = {

&nbsp;   id: '123e4567-e89b-12d3-a456-426614174000',

&nbsp;   name: 'Test Venue',

&nbsp;   address: 'Test Address',

&nbsp;   settings: { currency: 'EUR' },

&nbsp;   subscription\_plan: 'basic',

&nbsp;   subscription\_expires\_at: null,

&nbsp;   active: true,

&nbsp;   created\_at: new Date(),

&nbsp;   updated\_at: new Date(),

&nbsp;   users: \[],

&nbsp; };



&nbsp; const mockRepository = {

&nbsp;   create: jest.fn(),

&nbsp;   save: jest.fn(),

&nbsp;   find: jest.fn(),

&nbsp;   findOne: jest.fn(),

&nbsp; };



&nbsp; beforeEach(async () => {

&nbsp;   const module: TestingModule = await Test.createTestingModule({

&nbsp;     providers: \[

&nbsp;       VenuesService,

&nbsp;       {

&nbsp;         provide: getRepositoryToken(Venue),

&nbsp;         useValue: mockRepository,

&nbsp;       },

&nbsp;     ],

&nbsp;   }).compile();



&nbsp;   service = module.get<VenuesService>(VenuesService);

&nbsp;   repository = module.get<Repository<Venue>>(getRepositoryToken(Venue));

&nbsp; });



&nbsp; afterEach(() => {

&nbsp;   jest.clearAllMocks();

&nbsp; });



&nbsp; describe('create', () => {

&nbsp;   it('should create a venue successfully', async () => {

&nbsp;     const createVenueDto: CreateVenueDto = {

&nbsp;       name: 'New Venue',

&nbsp;       address: 'New Address',

&nbsp;     };



&nbsp;     mockRepository.create.mockReturnValue(mockVenue);

&nbsp;     mockRepository.save.mockResolvedValue(mockVenue);



&nbsp;     const result = await service.create(createVenueDto);



&nbsp;     expect(mockRepository.create).toHaveBeenCalledWith(createVenueDto);

&nbsp;     expect(mockRepository.save).toHaveBeenCalledWith(mockVenue);

&nbsp;     expect(result).toEqual(mockVenue);

&nbsp;   });

&nbsp; });



&nbsp; describe('findAll', () => {

&nbsp;   it('should return all active venues', async () => {

&nbsp;     const venues = \[mockVenue];

&nbsp;     mockRepository.find.mockResolvedValue(venues);



&nbsp;     const result = await service.findAll();



&nbsp;     expect(mockRepository.find).toHaveBeenCalledWith({

&nbsp;       where: { active: true },

&nbsp;       order: { created\_at: 'DESC' },

&nbsp;     });

&nbsp;     expect(result).toEqual(venues);

&nbsp;   });

&nbsp; });



&nbsp; describe('findOne', () => {

&nbsp;   it('should return a venue when found', async () => {

&nbsp;     mockRepository.findOne.mockResolvedValue(mockVenue);



&nbsp;     const result = await service.findOne(mockVenue.id);



&nbsp;     expect(mockRepository.findOne).toHaveBeenCalledWith({

&nbsp;       where: { id: mockVenue.id, active: true },

&nbsp;     });

&nbsp;     expect(result).toEqual(mockVenue);

&nbsp;   });



&nbsp;   it('should throw NotFoundException when venue not found', async () => {

&nbsp;     mockRepository.findOne.mockResolvedValue(null);



&nbsp;     await expect(service.findOne('non-existent-id')).rejects.toThrow(

&nbsp;       NotFoundException,

&nbsp;     );

&nbsp;   });

&nbsp; });



&nbsp; describe('update', () => {

&nbsp;   it('should update a venue successfully', async () => {

&nbsp;     const updateVenueDto: UpdateVenueDto = { name: 'Updated Name' };

&nbsp;     const updatedVenue = { ...mockVenue, ...updateVenueDto };



&nbsp;     jest.spyOn(service, 'findOne').mockResolvedValue(mockVenue);

&nbsp;     mockRepository.save.mockResolvedValue(updatedVenue);



&nbsp;     const result = await service.update(mockVenue.id, updateVenueDto);



&nbsp;     expect(service.findOne).toHaveBeenCalledWith(mockVenue.id);

&nbsp;     expect(mockRepository.save).toHaveBeenCalled();

&nbsp;     expect(result.name).toBe(updateVenueDto.name);

&nbsp;   });

&nbsp; });



&nbsp; describe('remove', () => {

&nbsp;   it('should soft delete a venue', async () => {

&nbsp;     const deletedVenue = { ...mockVenue, active: false };



&nbsp;     jest.spyOn(service, 'findOne').mockResolvedValue(mockVenue);

&nbsp;     mockRepository.save.mockResolvedValue(deletedVenue);



&nbsp;     await service.remove(mockVenue.id);



&nbsp;     expect(service.findOne).toHaveBeenCalledWith(mockVenue.id);

&nbsp;     expect(mockRepository.save).toHaveBeenCalledWith(

&nbsp;       expect.objectContaining({ active: false }),

&nbsp;     );

&nbsp;   });

&nbsp; });

});

```



\### 2.2 Auth Service Tests (src/auth/auth.service.spec.ts)

```typescript

import { Test, TestingModule } from '@nestjs/testing';

import { JwtService } from '@nestjs/jwt';

import { UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';

import { UsersService } from '../users/users.service';

import { User } from '../database/entities/user.entity';

import { UserRole } from '../database/enums/user-role.enum';

import \* as bcrypt from 'bcrypt';



jest.mock('bcrypt');



describe('AuthService', () => {

&nbsp; let service: AuthService;

&nbsp; let usersService: UsersService;

&nbsp; let jwtService: JwtService;



&nbsp; const mockUser: User = {

&nbsp;   id: '123e4567-e89b-12d3-a456-426614174000',

&nbsp;   venue\_id: '123e4567-e89b-12d3-a456-426614174001',

&nbsp;   email: 'test@example.com',

&nbsp;   password\_hash: 'hashedPassword',

&nbsp;   name: 'Test User',

&nbsp;   role: UserRole.WAITER,

&nbsp;   permissions: \['orders.create'],

&nbsp;   active: true,

&nbsp;   last\_login: null,

&nbsp;   password\_reset\_token: null,

&nbsp;   password\_reset\_expires: null,

&nbsp;   created\_at: new Date(),

&nbsp;   updated\_at: new Date(),

&nbsp;   venue: null,

&nbsp; };



&nbsp; const mockUsersService = {

&nbsp;   findByEmail: jest.fn(),

&nbsp;   findOne: jest.fn(),

&nbsp;   updateLastLogin: jest.fn(),

&nbsp; };



&nbsp; const mockJwtService = {

&nbsp;   sign: jest.fn(),

&nbsp; };



&nbsp; beforeEach(async () => {

&nbsp;   const module: TestingModule = await Test.createTestingModule({

&nbsp;     providers: \[

&nbsp;       AuthService,

&nbsp;       {

&nbsp;         provide: UsersService,

&nbsp;         useValue: mockUsersService,

&nbsp;       },

&nbsp;       {

&nbsp;         provide: JwtService,

&nbsp;         useValue: mockJwtService,

&nbsp;       },

&nbsp;     ],

&nbsp;   }).compile();



&nbsp;   service = module.get<AuthService>(AuthService);

&nbsp;   usersService = module.get<UsersService>(UsersService);

&nbsp;   jwtService = module.get<JwtService>(JwtService);

&nbsp; });



&nbsp; afterEach(() => {

&nbsp;   jest.clearAllMocks();

&nbsp; });



&nbsp; describe('validateUser', () => {

&nbsp;   it('should return user when credentials are valid', async () => {

&nbsp;     mockUsersService.findByEmail.mockResolvedValue(mockUser);

&nbsp;     (bcrypt.compare as jest.Mock).mockResolvedValue(true);

&nbsp;     mockUsersService.updateLastLogin.mockResolvedValue(undefined);



&nbsp;     const result = await service.validateUser('test@example.com', 'password');



&nbsp;     expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');

&nbsp;     expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');

&nbsp;     expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);

&nbsp;     expect(result).toEqual(mockUser);

&nbsp;   });



&nbsp;   it('should return null when user not found', async () => {

&nbsp;     mockUsersService.findByEmail.mockResolvedValue(null);



&nbsp;     const result = await service.validateUser('test@example.com', 'password');



&nbsp;     expect(result).toBeNull();

&nbsp;   });



&nbsp;   it('should return null when password is invalid', async () => {

&nbsp;     mockUsersService.findByEmail.mockResolvedValue(mockUser);

&nbsp;     (bcrypt.compare as jest.Mock).mockResolvedValue(false);



&nbsp;     const result = await service.validateUser('test@example.com', 'wrongpassword');



&nbsp;     expect(result).toBeNull();

&nbsp;   });



&nbsp;   it('should return null when user is inactive', async () => {

&nbsp;     const inactiveUser = { ...mockUser, active: false };

&nbsp;     mockUsersService.findByEmail.mockResolvedValue(inactiveUser);



&nbsp;     const result = await service.validateUser('test@example.com', 'password');



&nbsp;     expect(result).toBeNull();

&nbsp;   });

&nbsp; });



&nbsp; describe('login', () => {

&nbsp;   it('should return login response with JWT token', async () => {

&nbsp;     const mockToken = 'mock.jwt.token';

&nbsp;     mockJwtService.sign.mockReturnValue(mockToken);



&nbsp;     const result = await service.login(mockUser);



&nbsp;     expect(jwtService.sign).toHaveBeenCalledWith({

&nbsp;       sub: mockUser.id,

&nbsp;       email: mockUser.email,

&nbsp;       venue\_id: mockUser.venue\_id,

&nbsp;       role: mockUser.role,

&nbsp;       permissions: mockUser.permissions,

&nbsp;     });



&nbsp;     expect(result).toEqual({

&nbsp;       access\_token: mockToken,

&nbsp;       token\_type: 'Bearer',

&nbsp;       expires\_in: 7 \* 24 \* 60 \* 60,

&nbsp;       user: {

&nbsp;         id: mockUser.id,

&nbsp;         email: mockUser.email,

&nbsp;         name: mockUser.name,

&nbsp;         role: mockUser.role,

&nbsp;         venue\_id: mockUser.venue\_id,

&nbsp;       },

&nbsp;     });

&nbsp;   });

&nbsp; });



&nbsp; describe('validateToken', () => {

&nbsp;   const mockPayload = {

&nbsp;     sub: mockUser.id,

&nbsp;     email: mockUser.email,

&nbsp;     venue\_id: mockUser.venue\_id,

&nbsp;     role: mockUser.role,

&nbsp;     permissions: mockUser.permissions,

&nbsp;   };



&nbsp;   it('should return user when token is valid', async () => {

&nbsp;     mockUsersService.findOne.mockResolvedValue(mockUser);



&nbsp;     const result = await service.validateToken(mockPayload);



&nbsp;     expect(mockUsersService.findOne).toHaveBeenCalledWith(mockPayload.sub);

&nbsp;     expect(result).toEqual(mockUser);

&nbsp;   });



&nbsp;   it('should throw UnauthorizedException when user not found', async () => {

&nbsp;     mockUsersService.findOne.mockResolvedValue(null);



&nbsp;     await expect(service.validateToken(mockPayload)).rejects.toThrow(

&nbsp;       UnauthorizedException,

&nbsp;     );

&nbsp;   });



&nbsp;   it('should throw UnauthorizedException when user is inactive', async () => {

&nbsp;     const inactiveUser = { ...mockUser, active: false };

&nbsp;     mockUsersService.findOne.mockResolvedValue(inactiveUser);



&nbsp;     await expect(service.validateToken(mockPayload)).rejects.toThrow(

&nbsp;       UnauthorizedException,

&nbsp;     );

&nbsp;   });

&nbsp; });

});

```



---



\## 3. Integration Tests



\### 3.1 Auth Integration Tests (src/auth/auth.controller.integration.spec.ts)

```typescript

import { Test, TestingModule } from '@nestjs/testing';

import { INestApplication } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import \* as request from 'supertest';

import \* as bcrypt from 'bcrypt';

import { TestModule } from '../test/test.module';

import { getTestDatabaseConfig } from '../config/database-test.config';

import { User } from '../database/entities/user.entity';

import { Venue } from '../database/entities/venue.entity';

import { UserRole } from '../database/enums/user-role.enum';

import { Repository } from 'typeorm';

import { getRepositoryToken } from '@nestjs/typeorm';



describe('Auth Controller (Integration)', () => {

&nbsp; let app: INestApplication;

&nbsp; let userRepository: Repository<User>;

&nbsp; let venueRepository: Repository<Venue>;



&nbsp; const testVenue = {

&nbsp;   id: '00000000-0000-0000-0000-000000000001',

&nbsp;   name: 'Test Venue',

&nbsp;   address: 'Test Address',

&nbsp;   active: true,

&nbsp; };



&nbsp; const testUser = {

&nbsp;   id: '00000000-0000-0000-0000-000000000002',

&nbsp;   venue\_id: testVenue.id,

&nbsp;   email: 'test@beerflow.demo',

&nbsp;   password: 'testPassword123!',

&nbsp;   name: 'Test User',

&nbsp;   role: UserRole.WAITER,

&nbsp;   permissions: \['orders.create', 'orders.read'],

&nbsp;   active: true,

&nbsp; };



&nbsp; beforeAll(async () => {

&nbsp;   const moduleFixture: TestingModule = await Test.createTestingModule({

&nbsp;     imports: \[TestModule],

&nbsp;   }).compile();



&nbsp;   app = moduleFixture.createNestApplication();

&nbsp;   

&nbsp;   // Apply same configuration as main app

&nbsp;   app.useGlobalPipes(

&nbsp;     new ValidationPipe({

&nbsp;       whitelist: true,

&nbsp;       forbidNonWhitelisted: true,

&nbsp;       transform: true,

&nbsp;     }),

&nbsp;   );

&nbsp;   

&nbsp;   app.setGlobalPrefix('api/v1');

&nbsp;   

&nbsp;   await app.init();



&nbsp;   userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

&nbsp;   venueRepository = moduleFixture.get<Repository<Venue>>(getRepositoryToken(Venue));

&nbsp; });



&nbsp; afterAll(async () => {

&nbsp;   await app.close();

&nbsp; });



&nbsp; beforeEach(async () => {

&nbsp;   // Clean database

&nbsp;   await userRepository.clear();

&nbsp;   await venueRepository.clear();



&nbsp;   // Insert test data

&nbsp;   await venueRepository.save(testVenue);

&nbsp;   

&nbsp;   const hashedPassword = await bcrypt.hash(testUser.password, 10);

&nbsp;   await userRepository.save({

&nbsp;     ...testUser,

&nbsp;     password\_hash: hashedPassword,

&nbsp;   });

&nbsp; });



&nbsp; describe('POST /api/v1/auth/login', () => {

&nbsp;   it('should login successfully with valid credentials', async () => {

&nbsp;     const response = await request(app.getHttpServer())

&nbsp;       .post('/api/v1/auth/login')

&nbsp;       .send({

&nbsp;         email: testUser.email,

&nbsp;         password: testUser.password,

&nbsp;       })

&nbsp;       .expect(200);



&nbsp;     expect(response.body).toHaveProperty('access\_token');

&nbsp;     expect(response.body).toHaveProperty('token\_type', 'Bearer');

&nbsp;     expect(response.body).toHaveProperty('expires\_in');

&nbsp;     expect(response.body.user).toMatchObject({

&nbsp;       id: testUser.id,

&nbsp;       email: testUser.email,

&nbsp;       name: testUser.name,

&nbsp;       role: testUser.role,

&nbsp;       venue\_id: testUser.venue\_id,

&nbsp;     });

&nbsp;     expect(response.body.user).not.toHaveProperty('password\_hash');

&nbsp;   });



&nbsp;   it('should fail login with invalid email', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .post('/api/v1/auth/login')

&nbsp;       .send({

&nbsp;         email: 'wrong@email.com',

&nbsp;         password: testUser.password,

&nbsp;       })

&nbsp;       .expect(401);

&nbsp;   });



&nbsp;   it('should fail login with invalid password', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .post('/api/v1/auth/login')

&nbsp;       .send({

&nbsp;         email: testUser.email,

&nbsp;         password: 'wrongPassword',

&nbsp;       })

&nbsp;       .expect(401);

&nbsp;   });



&nbsp;   it('should fail login with inactive user', async () => {

&nbsp;     await userRepository.update(testUser.id, { active: false });



&nbsp;     await request(app.getHttpServer())

&nbsp;       .post('/api/v1/auth/login')

&nbsp;       .send({

&nbsp;         email: testUser.email,

&nbsp;         password: testUser.password,

&nbsp;       })

&nbsp;       .expect(401);

&nbsp;   });



&nbsp;   it('should validate request body', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .post('/api/v1/auth/login')

&nbsp;       .send({

&nbsp;         email: 'invalid-email',

&nbsp;         password: '',

&nbsp;       })

&nbsp;       .expect(400);

&nbsp;   });

&nbsp; });



&nbsp; describe('GET /api/v1/auth/profile', () => {

&nbsp;   let authToken: string;



&nbsp;   beforeEach(async () => {

&nbsp;     const loginResponse = await request(app.getHttpServer())

&nbsp;       .post('/api/v1/auth/login')

&nbsp;       .send({

&nbsp;         email: testUser.email,

&nbsp;         password: testUser.password,

&nbsp;       });



&nbsp;     authToken = loginResponse.body.access\_token;

&nbsp;   });



&nbsp;   it('should return user profile with valid token', async () => {

&nbsp;     const response = await request(app.getHttpServer())

&nbsp;       .get('/api/v1/auth/profile')

&nbsp;       .set('Authorization', `Bearer ${authToken}`)

&nbsp;       .expect(200);



&nbsp;     expect(response.body).toMatchObject({

&nbsp;       id: testUser.id,

&nbsp;       email: testUser.email,

&nbsp;       name: testUser.name,

&nbsp;       role: testUser.role,

&nbsp;       venue\_id: testUser.venue\_id,

&nbsp;     });

&nbsp;     expect(response.body).not.toHaveProperty('password\_hash');

&nbsp;   });



&nbsp;   it('should fail without authorization header', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .get('/api/v1/auth/profile')

&nbsp;       .expect(401);

&nbsp;   });



&nbsp;   it('should fail with invalid token', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .get('/api/v1/auth/profile')

&nbsp;       .set('Authorization', 'Bearer invalid.token.here')

&nbsp;       .expect(401);

&nbsp;   });



&nbsp;   it('should fail with malformed authorization header', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .get('/api/v1/auth/profile')

&nbsp;       .set('Authorization', 'InvalidFormat')

&nbsp;       .expect(401);

&nbsp;   });

&nbsp; });

});

```



\### 3.2 Venues Integration Tests (src/venues/venues.controller.integration.spec.ts)

```typescript

import { Test, TestingModule } from '@nestjs/testing';

import { INestApplication, ValidationPipe } from '@nestjs/common';

import { getRepositoryToken } from '@nestjs/typeorm';

import \* as request from 'supertest';

import \* as bcrypt from 'bcrypt';

import { TestModule } from '../test/test.module';

import { User } from '../database/entities/user.entity';

import { Venue } from '../database/entities/venue.entity';

import { UserRole } from '../database/enums/user-role.enum';

import { Repository } from 'typeorm';



describe('Venues Controller (Integration)', () => {

&nbsp; let app: INestApplication;

&nbsp; let userRepository: Repository<User>;

&nbsp; let venueRepository: Repository<Venue>;



&nbsp; const testVenue = {

&nbsp;   id: '00000000-0000-0000-0000-000000000001',

&nbsp;   name: 'Test Venue',

&nbsp;   address: 'Test Address',

&nbsp;   active: true,

&nbsp; };



&nbsp; const adminUser = {

&nbsp;   id: '00000000-0000-0000-0000-000000000002',

&nbsp;   venue\_id: testVenue.id,

&nbsp;   email: 'admin@beerflow.demo',

&nbsp;   password: 'adminPassword123!',

&nbsp;   name: 'Admin User',

&nbsp;   role: UserRole.ADMIN,

&nbsp;   permissions: \['venues.manage'],

&nbsp;   active: true,

&nbsp; };



&nbsp; const waiterUser = {

&nbsp;   id: '00000000-0000-0000-0000-000000000003',

&nbsp;   venue\_id: testVenue.id,

&nbsp;   email: 'waiter@beerflow.demo',

&nbsp;   password: 'waiterPassword123!',

&nbsp;   name: 'Waiter User',

&nbsp;   role: UserRole.WAITER,

&nbsp;   permissions: \['orders.create'],

&nbsp;   active: true,

&nbsp; };



&nbsp; let adminToken: string;

&nbsp; let waiterToken: string;



&nbsp; beforeAll(async () => {

&nbsp;   const moduleFixture: TestingModule = await Test.createTestingModule({

&nbsp;     imports: \[TestModule],

&nbsp;   }).compile();



&nbsp;   app = moduleFixture.createNestApplication();

&nbsp;   app.useGlobalPipes(

&nbsp;     new ValidationPipe({

&nbsp;       whitelist: true,

&nbsp;       forbidNonWhitelisted: true,

&nbsp;       transform: true,

&nbsp;     }),

&nbsp;   );

&nbsp;   app.setGlobalPrefix('api/v1');

&nbsp;   await app.init();



&nbsp;   userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

&nbsp;   venueRepository = moduleFixture.get<Repository<Venue>>(getRepositoryToken(Venue));

&nbsp; });



&nbsp; afterAll(async () => {

&nbsp;   await app.close();

&nbsp; });



&nbsp; beforeEach(async () => {

&nbsp;   // Clean database

&nbsp;   await userRepository.clear();

&nbsp;   await venueRepository.clear();



&nbsp;   // Insert test data

&nbsp;   await venueRepository.save(testVenue);

&nbsp;   

&nbsp;   const adminHashedPassword = await bcrypt.hash(adminUser.password, 10);

&nbsp;   await userRepository.save({

&nbsp;     ...adminUser,

&nbsp;     password\_hash: adminHashedPassword,

&nbsp;   });



&nbsp;   const waiterHashedPassword = await bcrypt.hash(waiterUser.password, 10);

&nbsp;   await userRepository.save({

&nbsp;     ...waiterUser,

&nbsp;     password\_hash: waiterHashedPassword,

&nbsp;   });



&nbsp;   // Get auth tokens

&nbsp;   const adminLogin = await request(app.getHttpServer())

&nbsp;     .post('/api/v1/auth/login')

&nbsp;     .send({

&nbsp;       email: adminUser.email,

&nbsp;       password: adminUser.password,

&nbsp;     });

&nbsp;   adminToken = adminLogin.body.access\_token;



&nbsp;   const waiterLogin = await request(app.getHttpServer())

&nbsp;     .post('/api/v1/auth/login')

&nbsp;     .send({

&nbsp;       email: waiterUser.email,

&nbsp;       password: waiterUser.password,

&nbsp;     });

&nbsp;   waiterToken = waiterLogin.body.access\_token;

&nbsp; });



&nbsp; describe('GET /api/v1/venues', () => {

&nbsp;   it('should return venues for admin user', async () => {

&nbsp;     const response = await request(app.getHttpServer())

&nbsp;       .get('/api/v1/venues')

&nbsp;       .set('Authorization', `Bearer ${adminToken}`)

&nbsp;       .expect(200);



&nbsp;     expect(response.body).toBeInstanceOf(Array);

&nbsp;     expect(response.body).toHaveLength(1);

&nbsp;     expect(response.body\[0]).toMatchObject({

&nbsp;       id: testVenue.id,

&nbsp;       name: testVenue.name,

&nbsp;       address: testVenue.address,

&nbsp;     });

&nbsp;   });



&nbsp;   it('should fail for waiter user (insufficient permissions)', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .get('/api/v1/venues')

&nbsp;       .set('Authorization', `Bearer ${waiterToken}`)

&nbsp;       .expect(403);

&nbsp;   });



&nbsp;   it('should fail without authentication', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .get('/api/v1/venues')

&nbsp;       .expect(401);

&nbsp;   });

&nbsp; });



&nbsp; describe('POST /api/v1/venues', () => {

&nbsp;   const newVenueData = {

&nbsp;     name: 'New Test Venue',

&nbsp;     address: 'New Test Address',

&nbsp;     settings: {

&nbsp;       currency: 'USD',

&nbsp;       timezone: 'America/New\_York',

&nbsp;     },

&nbsp;   };



&nbsp;   it('should create venue successfully for admin user', async () => {

&nbsp;     const response = await request(app.getHttpServer())

&nbsp;       .post('/api/v1/venues')

&nbsp;       .set('Authorization', `Bearer ${adminToken}`)

&nbsp;       .send(newVenueData)

&nbsp;       .expect(201);



&nbsp;     expect(response.body).toMatchObject({

&nbsp;       name: newVenueData.name,

&nbsp;       address: newVenueData.address,

&nbsp;       settings: expect.objectContaining(newVenueData.settings),

&nbsp;     });

&nbsp;     expect(response.body).toHaveProperty('id');

&nbsp;     expect(response.body).toHaveProperty('created\_at');

&nbsp;   });



&nbsp;   it('should fail for waiter user (insufficient permissions)', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .post('/api/v1/venues')

&nbsp;       .set('Authorization', `Bearer ${waiterToken}`)

&nbsp;       .send(newVenueData)

&nbsp;       .expect(403);

&nbsp;   });



&nbsp;   it('should validate required fields', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .post('/api/v1/venues')

&nbsp;       .set('Authorization', `Bearer ${adminToken}`)

&nbsp;       .send({

&nbsp;         address: 'Missing name field',

&nbsp;       })

&nbsp;       .expect(400);

&nbsp;   });



&nbsp;   it('should reject invalid field types', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .post('/api/v1/venues')

&nbsp;       .set('Authorization', `Bearer ${adminToken}`)

&nbsp;       .send({

&nbsp;         name: 123, // Should be string

&nbsp;         address: 'Test Address',

&nbsp;       })

&nbsp;       .expect(400);

&nbsp;   });

&nbsp; });



&nbsp; describe('GET /api/v1/venues/:id', () => {

&nbsp;   it('should return specific venue', async () => {

&nbsp;     const response = await request(app.getHttpServer())

&nbsp;       .get(`/api/v1/venues/${testVenue.id}`)

&nbsp;       .set('Authorization', `Bearer ${adminToken}`)

&nbsp;       .expect(200);



&nbsp;     expect(response.body).toMatchObject({

&nbsp;       id: testVenue.id,

&nbsp;       name: testVenue.name,

&nbsp;       address: testVenue.address,

&nbsp;     });

&nbsp;   });



&nbsp;   it('should return 404 for non-existent venue', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .get('/api/v1/venues/00000000-0000-0000-0000-000000000999')

&nbsp;       .set('Authorization', `Bearer ${adminToken}`)

&nbsp;       .expect(404);

&nbsp;   });



&nbsp;   it('should validate UUID format', async () => {

&nbsp;     await request(app.getHttpServer())

&nbsp;       .get('/api/v1/venues/invalid-uuid')

&nbsp;       .set('Authorization', `Bearer ${adminToken}`)

&nbsp;       .expect(400);

&nbsp;   });

&nbsp; });

});

```



---



\## 4. Performance Tests



\### 4.1 Performance Test Utilities (src/test/performance.util.ts)

```typescript

export interface PerformanceResult {

&nbsp; averageTime: number;

&nbsp; minTime: number;

&nbsp; maxTime: number;

&nbsp; successRate: number;

&nbsp; totalRequests: number;

}



export async function performanceTest(

&nbsp; testFunction: () => Promise<any>,

&nbsp; iterations: number = 100,

): Promise<PerformanceResult> {

&nbsp; const times: number\[] = \[];

&nbsp; let successCount = 0;



&nbsp; for (let i = 0; i < iterations; i++) {

&nbsp;   const startTime = Date.now();

&nbsp;   

&nbsp;   try {

&nbsp;     await testFunction();

&nbsp;     successCount++;

&nbsp;   } catch (error) {

&nbsp;     // Test failed, don't count time

&nbsp;     continue;

&nbsp;   }

&nbsp;   

&nbsp;   const endTime = Date.now();

&nbsp;   times.push(endTime - startTime);

&nbsp; }



&nbsp; if (times.length === 0) {

&nbsp;   throw new Error('All performance tests failed');

&nbsp; }



&nbsp; return {

&nbsp;   averageTime: times.reduce((a, b) => a + b, 0) / times.length,

&nbsp;   minTime: Math.min(...times),

&nbsp;   maxTime: Math.max(...times),

&nbsp;   successRate: (successCount / iterations) \* 100,

&nbsp;   totalRequests: iterations,

&nbsp; };

}

```



\### 4.2 Auth Performance Tests (src/auth/auth.performance.spec.ts)

```typescript

import { Test, TestingModule } from '@nestjs/testing';

import { INestApplication, ValidationPipe } from '@nestjs/common';

import \* as request from 'supertest';

import { TestModule } from '../test/test.module';

import { performanceTest, PerformanceResult } from '../test/performance.util';



describe('Auth Performance Tests', () => {

&nbsp; let app: INestApplication;



&nbsp; beforeAll(async () => {

&nbsp;   const moduleFixture: TestingModule = await Test.createTestingModule({

&nbsp;     imports: \[TestModule],

&nbsp;   }).compile();



&nbsp;   app = moduleFixture.createNestApplication();

&nbsp;   app.useGlobalPipes(

&nbsp;     new ValidationPipe({

&nbsp;       whitelist: true,

&nbsp;       forbidNonWhitelisted: true,

&nbsp;       transform: true,

&nbsp;     }),

&nbsp;   );

&nbsp;   app.setGlobalPrefix('api/v1');

&nbsp;   await app.init();



&nbsp;   // Setup test data (using existing admin user from demo data)

&nbsp; });



&nbsp; afterAll(async () => {

&nbsp;   await app.close();

&nbsp; });



&nbsp; describe('Login Performance', () => {

&nbsp;   it('should handle login requests within performance threshold', async () => {

&nbsp;     const loginTest = async () => {

&nbsp;       const response = await request(app.getHttpServer())

&nbsp;         .post('/api/v1/auth/login')

&nbsp;         .send({

&nbsp;           email: 'admin@beerflow.demo',

&nbsp;           password: 'admin123!',

&nbsp;         });



&nbsp;       if (response.status !== 200) {

&nbsp;         throw new Error(`Login failed with status ${response.status}`);

&nbsp;       }



&nbsp;       return response.body;

&nbsp;     };



&nbsp;     const result: PerformanceResult = await performanceTest(loginTest, 50);



&nbsp;     // Performance requirements

&nbsp;     expect(result.averageTime).toBeLessThan(200); // Average < 200ms

&nbsp;     expect(result.maxTime).toBeLessThan(500); // Max < 500ms

&nbsp;     expect(result.successRate).toBe(100); // 100% success rate



&nbsp;     console.log('Login Performance Results:', {

&nbsp;       averageTime: `${result.averageTime.toFixed(2)}ms`,

&nbsp;       minTime: `${result.minTime}ms`,

&nbsp;       maxTime: `${result.maxTime}ms`,

&nbsp;       successRate: `${result.successRate}%`,

&nbsp;     });

&nbsp;   });

&nbsp; });



&nbsp; describe('Protected Route Performance', () => {

&nbsp;   let authToken: string;



&nbsp;   beforeAll(async () => {

&nbsp;     const loginResponse = await request(app.getHttpServer())

&nbsp;       .post('/api/v1/auth/login')

&nbsp;       .send({

&nbsp;         email: 'admin@beerflow.demo',

&nbsp;         password: 'admin123!',

&nbsp;       });



&nbsp;     authToken = loginResponse.body.access\_token;

&nbsp;   });



&nbsp;   it('should handle protected route requests within performance threshold', async () => {

&nbsp;     const protectedRouteTest = async () => {

&nbsp;       const response = await request(app.getHttpServer())

&nbsp;         .get('/api/v1/auth/profile')

&nbsp;         .set('Authorization', `Bearer ${authToken}`);



&nbsp;       if (response.status !== 200) {

&nbsp;         throw new Error(`Protected route failed with status ${response.status}`);

&nbsp;       }



&nbsp;       return response.body;

&nbsp;     };



&nbsp;     const result: PerformanceResult = await performanceTest(protectedRouteTest, 100);



&nbsp;     // Performance requirements

&nbsp;     expect(result.averageTime).toBeLessThan(100); // Average < 100ms

&nbsp;     expect(result.maxTime).toBeLessThan(300); // Max < 300ms

&nbsp;     expect(result.successRate).toBe(100); // 100% success rate



&nbsp;     console.log('Protected Route Performance Results:', {

&nbsp;       averageTime: `${result.averageTime.toFixed(2)}ms`,

&nbsp;       minTime: `${result.minTime}ms`,

&nbsp;       maxTime: `${result.maxTime}ms`,

&nbsp;       successRate: `${result.successRate}%`,

&nbsp;     });

&nbsp;   });

&nbsp; });

});

```



---



\## 5. Test Scripts Package.json



\### 5.1 Aggiornare Package.json Scripts

```json

{

&nbsp; "scripts": {

&nbsp;   "test": "jest",

&nbsp;   "test:watch": "jest --watch",

&nbsp;   "test:cov": "jest --coverage",

&nbsp;   "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node\_modules/.bin/jest --runInBand",

&nbsp;   "test:e2e": "jest --config ./test/jest-e2e.json",

&nbsp;   "test:unit": "jest --testPathPattern=\\\\.spec\\\\.ts$",

&nbsp;   "test:integration": "jest --testPathPattern=\\\\.integration\\\\.spec\\\\.ts$",

&nbsp;   "test:performance": "jest --testPathPattern=\\\\.performance\\\\.spec\\\\.ts$",

&nbsp;   "test:all": "npm run test:unit \&\& npm run test:integration \&\& npm run test:performance"

&nbsp; }

}

```



---



\## 6. Test Coverage Requirements



\### Minimum Coverage Thresholds:

\- \*\*Statements\*\*: 90%

\- \*\*Branches\*\*: 85%

\- \*\*Functions\*\*: 90%

\- \*\*Lines\*\*: 90%



\### Critical Paths (100% Coverage Required):

\- Authentication flow

\- Authorization checks

\- Database operations

\- Error handling

\- Input validation



---



\## 7. Test Execution Commands

```bash

\# Run all tests

npm run test:all



\# Run unit tests only

npm run test:unit



\# Run integration tests only

npm run test:integration



\# Run performance tests only

npm run test:performance



\# Run tests with coverage

npm run test:cov



\# Run tests in watch mode

npm run test:watch

```



---



\## 8. Criteri di Accettazione Testing



\### Tutti i test devono passare:

\- Unit tests: 100% pass rate

\- Integration tests: 100% pass rate

\- Performance tests: Meet time thresholds



\### Coverage requirements:

\- Overall coverage > 90%

\- Critical paths coverage = 100%



\### Performance benchmarks:

\- Login average time < 200ms

\- API call average time < 100ms

\- Database query time < 50ms



La Fase 1 è considerata completa solo quando tutti i test passano e tutti i benchmark di performance sono rispettati.

