\# FASE 1 - IMPLEMENTAZIONE CORE BACKEND FOUNDATION



\## Obiettivo Fase

Implementare le fondamenta del backend NestJS con database PostgreSQL, moduli core (Venues, Users), sistema di autenticazione JWT e setup architetturale completo.



\## Prerequisiti Verificati

\- Database PostgreSQL funzionante con schema BeerFlow applicato

\- Schema verificato tramite `./scripts/test-database.sh`

\- Dati demo caricati e validati



\## Stack Tecnologico Definitivo

\- \*\*Framework\*\*: NestJS 10.x

\- \*\*Database\*\*: PostgreSQL 15+ con TypeORM 0.3.x

\- \*\*Autenticazione\*\*: JWT con Passport

\- \*\*Validazione\*\*: class-validator + class-transformer

\- \*\*Documentazione\*\*: Swagger/OpenAPI

\- \*\*Testing\*\*: Jest + Supertest



---



\## 1. Setup Progetto NestJS



\### 1.1 Inizializzazione Progetto

```bash

cd backend

nest new . --package-manager npm --skip-git

```



\### 1.2 Installazione Dipendenze Core

```bash

\# Core Dependencies

npm install @nestjs/typeorm typeorm pg

npm install @nestjs/config @nestjs/jwt @nestjs/passport

npm install passport passport-local passport-jwt

npm install @nestjs/swagger swagger-ui-express

npm install class-validator class-transformer

npm install bcrypt uuid



\# Dev Dependencies  

npm install -D @types/pg @types/passport-local @types/passport-jwt

npm install -D @types/bcrypt @types/uuid

npm install -D @nestjs/testing supertest @types/supertest

```



\### 1.3 Struttura Directory Obbligatoria

```

backend/src/

├── app.module.ts

├── main.ts

├── common/

│   ├── decorators/

│   │   ├── roles.decorator.ts

│   │   └── current-user.decorator.ts

│   ├── guards/

│   │   ├── jwt-auth.guard.ts

│   │   └── roles.guard.ts

│   ├── filters/

│   │   └── http-exception.filter.ts

│   └── interceptors/

│       └── transform.interceptor.ts

├── config/

│   ├── database.config.ts

│   └── jwt.config.ts

├── database/

│   ├── entities/

│   │   ├── venue.entity.ts

│   │   ├── user.entity.ts

│   │   └── base.entity.ts

│   └── database.module.ts

├── venues/

│   ├── venues.controller.ts

│   ├── venues.service.ts

│   ├── venues.module.ts

│   └── dto/

│       ├── create-venue.dto.ts

│       └── update-venue.dto.ts

├── users/

│   ├── users.controller.ts

│   ├── users.service.ts

│   ├── users.module.ts

│   └── dto/

│       ├── create-user.dto.ts

│       └── update-user.dto.ts

└── auth/

&nbsp;   ├── auth.controller.ts

&nbsp;   ├── auth.service.ts

&nbsp;   ├── auth.module.ts

&nbsp;   ├── dto/

&nbsp;   │   ├── login.dto.ts

&nbsp;   │   └── register.dto.ts

&nbsp;   └── strategies/

&nbsp;       ├── local.strategy.ts

&nbsp;       └── jwt.strategy.ts

```



---



\## 2. Configurazioni Base



\### 2.1 Environment Configuration (.env)

```env

\# Database

DATABASE\_HOST=localhost

DATABASE\_PORT=5432

DATABASE\_USERNAME=postgres

DATABASE\_PASSWORD=mattia

DATABASE\_NAME=beerflow\_dev



\# JWT

JWT\_SECRET=beerflow\_jwt\_secret\_2024\_ultra\_secure\_key

JWT\_EXPIRES\_IN=7d

JWT\_REFRESH\_EXPIRES\_IN=30d



\# App

PORT=3000

NODE\_ENV=development



\# CORS

CORS\_ORIGIN=http://localhost:5173

```



\### 2.2 Database Configuration (src/config/database.config.ts)

```typescript

import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { ConfigService } from '@nestjs/config';



export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({

&nbsp; type: 'postgres',

&nbsp; host: configService.get('DATABASE\_HOST'),

&nbsp; port: configService.get('DATABASE\_PORT'),

&nbsp; username: configService.get('DATABASE\_USERNAME'),

&nbsp; password: configService.get('DATABASE\_PASSWORD'),

&nbsp; database: configService.get('DATABASE\_NAME'),

&nbsp; entities: \[\_\_dirname + '/../\*\*/\*.entity{.ts,.js}'],

&nbsp; synchronize: false, // SEMPRE false in produzione

&nbsp; logging: configService.get('NODE\_ENV') === 'development',

&nbsp; ssl: configService.get('NODE\_ENV') === 'production' ? { rejectUnauthorized: false } : false,

});

```



\### 2.3 JWT Configuration (src/config/jwt.config.ts)

```typescript

import { JwtModuleOptions } from '@nestjs/jwt';

import { ConfigService } from '@nestjs/config';



export const getJwtConfig = (configService: ConfigService): JwtModuleOptions => ({

&nbsp; secret: configService.get('JWT\_SECRET'),

&nbsp; signOptions: {

&nbsp;   expiresIn: configService.get('JWT\_EXPIRES\_IN'),

&nbsp; },

});

```



---



\## 3. Entità Database (TypeORM)



\### 3.1 Base Entity (src/database/entities/base.entity.ts)

```typescript

import { 

&nbsp; PrimaryGeneratedColumn, 

&nbsp; CreateDateColumn, 

&nbsp; UpdateDateColumn 

} from 'typeorm';



export abstract class BaseEntity {

&nbsp; @PrimaryGeneratedColumn('uuid')

&nbsp; id: string;



&nbsp; @CreateDateColumn({ type: 'timestamptz' })

&nbsp; created\_at: Date;



&nbsp; @UpdateDateColumn({ type: 'timestamptz' })

&nbsp; updated\_at: Date;

}

```



\### 3.2 Venue Entity (src/database/entities/venue.entity.ts)

```typescript

import { Entity, Column, OneToMany } from 'typeorm';

import { BaseEntity } from './base.entity';

import { User } from './user.entity';



@Entity('venues')

export class Venue extends BaseEntity {

&nbsp; @Column({ type: 'varchar', length: 255 })

&nbsp; name: string;



&nbsp; @Column({ type: 'text', nullable: true })

&nbsp; address: string;



&nbsp; @Column({ 

&nbsp;   type: 'jsonb', 

&nbsp;   default: {

&nbsp;     currency: 'EUR',

&nbsp;     timezone: 'Europe/Rome',

&nbsp;     tax\_rate: 0.22,

&nbsp;     default\_language: 'it-IT'

&nbsp;   }

&nbsp; })

&nbsp; settings: Record<string, any>;



&nbsp; @Column({ type: 'varchar', length: 50, default: 'basic' })

&nbsp; subscription\_plan: string;



&nbsp; @Column({ type: 'timestamptz', nullable: true })

&nbsp; subscription\_expires\_at: Date;



&nbsp; @Column({ type: 'boolean', default: true })

&nbsp; active: boolean;



&nbsp; // Relations

&nbsp; @OneToMany(() => User, user => user.venue)

&nbsp; users: User\[];

}

```



\### 3.3 User Entity (src/database/entities/user.entity.ts)

```typescript

import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';

import { BaseEntity } from './base.entity';

import { Venue } from './venue.entity';

import { UserRole } from '../enums/user-role.enum';



@Entity('users')

export class User extends BaseEntity {

&nbsp; @Column({ type: 'uuid' })

&nbsp; venue\_id: string;



&nbsp; @Column({ type: 'varchar', length: 255, unique: true })

&nbsp; email: string;



&nbsp; @Column({ type: 'varchar', length: 255 })

&nbsp; password\_hash: string;



&nbsp; @Column({ type: 'varchar', length: 255 })

&nbsp; name: string;



&nbsp; @Column({ 

&nbsp;   type: 'enum', 

&nbsp;   enum: UserRole, 

&nbsp;   default: UserRole.WAITER 

&nbsp; })

&nbsp; role: UserRole;



&nbsp; @Column({ type: 'jsonb', default: \[] })

&nbsp; permissions: string\[];



&nbsp; @Column({ type: 'boolean', default: true })

&nbsp; active: boolean;



&nbsp; @Column({ type: 'timestamptz', nullable: true })

&nbsp; last\_login: Date;



&nbsp; @Column({ type: 'varchar', length: 255, nullable: true })

&nbsp; password\_reset\_token: string;



&nbsp; @Column({ type: 'timestamptz', nullable: true })

&nbsp; password\_reset\_expires: Date;



&nbsp; // Relations

&nbsp; @ManyToOne(() => Venue, venue => venue.users)

&nbsp; @JoinColumn({ name: 'venue\_id' })

&nbsp; venue: Venue;

}

```



\### 3.4 User Role Enum (src/database/enums/user-role.enum.ts)

```typescript

export enum UserRole {

&nbsp; ADMIN = 'admin',

&nbsp; MANAGER = 'manager', 

&nbsp; WAITER = 'waiter',

&nbsp; KITCHEN = 'kitchen',

&nbsp; BARTENDER = 'bartender',

&nbsp; MAINTENANCE = 'maintenance'

}

```



---



\## 4. Moduli Core



\### 4.1 Database Module (src/database/database.module.ts)

```typescript

import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { getDatabaseConfig } from '../config/database.config';



@Module({

&nbsp; imports: \[

&nbsp;   TypeOrmModule.forRootAsync({

&nbsp;     imports: \[ConfigModule],

&nbsp;     useFactory: (configService: ConfigService) => getDatabaseConfig(configService),

&nbsp;     inject: \[ConfigService],

&nbsp;   }),

&nbsp; ],

})

export class DatabaseModule {}

```



\### 4.2 Venues Module (src/venues/venues.module.ts)

```typescript

import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { VenuesController } from './venues.controller';

import { VenuesService } from './venues.service';

import { Venue } from '../database/entities/venue.entity';



@Module({

&nbsp; imports: \[TypeOrmModule.forFeature(\[Venue])],

&nbsp; controllers: \[VenuesController],

&nbsp; providers: \[VenuesService],

&nbsp; exports: \[VenuesService],

})

export class VenuesModule {}

```



\### 4.3 Venues Service (src/venues/venues.service.ts)

```typescript

import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Venue } from '../database/entities/venue.entity';

import { CreateVenueDto } from './dto/create-venue.dto';

import { UpdateVenueDto } from './dto/update-venue.dto';



@Injectable()

export class VenuesService {

&nbsp; constructor(

&nbsp;   @InjectRepository(Venue)

&nbsp;   private readonly venueRepository: Repository<Venue>,

&nbsp; ) {}



&nbsp; async create(createVenueDto: CreateVenueDto): Promise<Venue> {

&nbsp;   const venue = this.venueRepository.create(createVenueDto);

&nbsp;   return await this.venueRepository.save(venue);

&nbsp; }



&nbsp; async findAll(): Promise<Venue\[]> {

&nbsp;   return await this.venueRepository.find({

&nbsp;     where: { active: true },

&nbsp;     order: { created\_at: 'DESC' },

&nbsp;   });

&nbsp; }



&nbsp; async findOne(id: string): Promise<Venue> {

&nbsp;   const venue = await this.venueRepository.findOne({

&nbsp;     where: { id, active: true },

&nbsp;   });



&nbsp;   if (!venue) {

&nbsp;     throw new NotFoundException(`Venue with ID ${id} not found`);

&nbsp;   }



&nbsp;   return venue;

&nbsp; }



&nbsp; async update(id: string, updateVenueDto: UpdateVenueDto): Promise<Venue> {

&nbsp;   const venue = await this.findOne(id);

&nbsp;   Object.assign(venue, updateVenueDto);

&nbsp;   return await this.venueRepository.save(venue);

&nbsp; }



&nbsp; async remove(id: string): Promise<void> {

&nbsp;   const venue = await this.findOne(id);

&nbsp;   venue.active = false;

&nbsp;   await this.venueRepository.save(venue);

&nbsp; }

}

```



\### 4.4 Venues Controller (src/venues/venues.controller.ts)

```typescript

import {

&nbsp; Controller,

&nbsp; Get,

&nbsp; Post,

&nbsp; Body,

&nbsp; Patch,

&nbsp; Param,

&nbsp; Delete,

&nbsp; UseGuards,

&nbsp; ParseUUIDPipe,

} from '@nestjs/common';

import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { VenuesService } from './venues.service';

import { CreateVenueDto } from './dto/create-venue.dto';

import { UpdateVenueDto } from './dto/update-venue.dto';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { Roles } from '../common/decorators/roles.decorator';

import { UserRole } from '../database/enums/user-role.enum';



@ApiTags('venues')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('venues')

export class VenuesController {

&nbsp; constructor(private readonly venuesService: VenuesService) {}



&nbsp; @Post()

&nbsp; @Roles(UserRole.ADMIN)

&nbsp; @ApiOperation({ summary: 'Create a new venue' })

&nbsp; @ApiResponse({ status: 201, description: 'Venue created successfully' })

&nbsp; create(@Body() createVenueDto: CreateVenueDto) {

&nbsp;   return this.venuesService.create(createVenueDto);

&nbsp; }



&nbsp; @Get()

&nbsp; @Roles(UserRole.ADMIN, UserRole.MANAGER)

&nbsp; @ApiOperation({ summary: 'Get all venues' })

&nbsp; @ApiResponse({ status: 200, description: 'Venues retrieved successfully' })

&nbsp; findAll() {

&nbsp;   return this.venuesService.findAll();

&nbsp; }



&nbsp; @Get(':id')

&nbsp; @ApiOperation({ summary: 'Get venue by ID' })

&nbsp; @ApiResponse({ status: 200, description: 'Venue retrieved successfully' })

&nbsp; @ApiResponse({ status: 404, description: 'Venue not found' })

&nbsp; findOne(@Param('id', ParseUUIDPipe) id: string) {

&nbsp;   return this.venuesService.findOne(id);

&nbsp; }



&nbsp; @Patch(':id')

&nbsp; @Roles(UserRole.ADMIN, UserRole.MANAGER)

&nbsp; @ApiOperation({ summary: 'Update venue' })

&nbsp; @ApiResponse({ status: 200, description: 'Venue updated successfully' })

&nbsp; update(

&nbsp;   @Param('id', ParseUUIDPipe) id: string,

&nbsp;   @Body() updateVenueDto: UpdateVenueDto,

&nbsp; ) {

&nbsp;   return this.venuesService.update(id, updateVenueDto);

&nbsp; }



&nbsp; @Delete(':id')

&nbsp; @Roles(UserRole.ADMIN)

&nbsp; @ApiOperation({ summary: 'Delete venue (soft delete)' })

&nbsp; @ApiResponse({ status: 200, description: 'Venue deleted successfully' })

&nbsp; remove(@Param('id', ParseUUIDPipe) id: string) {

&nbsp;   return this.venuesService.remove(id);

&nbsp; }

}

```



---



\## 5. DTOs e Validazione



\### 5.1 Create Venue DTO (src/venues/dto/create-venue.dto.ts)

```typescript

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';



export class CreateVenueDto {

&nbsp; @ApiProperty({ example: 'Demo Birreria' })

&nbsp; @IsString()

&nbsp; @IsNotEmpty()

&nbsp; name: string;



&nbsp; @ApiPropertyOptional({ example: 'Via Roma 123, Milano' })

&nbsp; @IsString()

&nbsp; @IsOptional()

&nbsp; address?: string;



&nbsp; @ApiPropertyOptional({

&nbsp;   example: {

&nbsp;     currency: 'EUR',

&nbsp;     timezone: 'Europe/Rome',

&nbsp;     tax\_rate: 0.22

&nbsp;   }

&nbsp; })

&nbsp; @IsObject()

&nbsp; @IsOptional()

&nbsp; settings?: Record<string, any>;

}

```



\### 5.2 Update Venue DTO (src/venues/dto/update-venue.dto.ts)

```typescript

import { PartialType } from '@nestjs/swagger';

import { CreateVenueDto } from './create-venue.dto';



export class UpdateVenueDto extends PartialType(CreateVenueDto) {}

```



\### 5.3 Users DTOs (src/users/dto/create-user.dto.ts)

```typescript

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { 

&nbsp; IsString, 

&nbsp; IsEmail, 

&nbsp; IsNotEmpty, 

&nbsp; IsEnum, 

&nbsp; IsUUID, 

&nbsp; IsArray,

&nbsp; IsOptional,

&nbsp; MinLength 

} from 'class-validator';

import { UserRole } from '../../database/enums/user-role.enum';



export class CreateUserDto {

&nbsp; @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })

&nbsp; @IsUUID()

&nbsp; @IsNotEmpty()

&nbsp; venue\_id: string;



&nbsp; @ApiProperty({ example: 'user@beerflow.demo' })

&nbsp; @IsEmail()

&nbsp; @IsNotEmpty()

&nbsp; email: string;



&nbsp; @ApiProperty({ example: 'securePassword123!' })

&nbsp; @IsString()

&nbsp; @MinLength(8)

&nbsp; @IsNotEmpty()

&nbsp; password: string;



&nbsp; @ApiProperty({ example: 'Mario Rossi' })

&nbsp; @IsString()

&nbsp; @IsNotEmpty()

&nbsp; name: string;



&nbsp; @ApiPropertyOptional({ enum: UserRole, example: UserRole.WAITER })

&nbsp; @IsEnum(UserRole)

&nbsp; @IsOptional()

&nbsp; role?: UserRole;



&nbsp; @ApiPropertyOptional({ example: \['orders.create', 'orders.read'] })

&nbsp; @IsArray()

&nbsp; @IsString({ each: true })

&nbsp; @IsOptional()

&nbsp; permissions?: string\[];

}

```



---



\## 6. Sistema di Autenticazione



\### 6.1 Auth Module (src/auth/auth.module.ts)

```typescript

import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import { PassportModule } from '@nestjs/passport';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';

import { AuthService } from './auth.service';

import { UsersModule } from '../users/users.module';

import { LocalStrategy } from './strategies/local.strategy';

import { JwtStrategy } from './strategies/jwt.strategy';

import { getJwtConfig } from '../config/jwt.config';



@Module({

&nbsp; imports: \[

&nbsp;   PassportModule,

&nbsp;   JwtModule.registerAsync({

&nbsp;     imports: \[ConfigModule],

&nbsp;     useFactory: (configService: ConfigService) => getJwtConfig(configService),

&nbsp;     inject: \[ConfigService],

&nbsp;   }),

&nbsp;   UsersModule,

&nbsp; ],

&nbsp; controllers: \[AuthController],

&nbsp; providers: \[AuthService, LocalStrategy, JwtStrategy],

&nbsp; exports: \[AuthService],

})

export class AuthModule {}

```



\### 6.2 Auth Service (src/auth/auth.service.ts)

```typescript

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';

import { User } from '../database/entities/user.entity';

import \* as bcrypt from 'bcrypt';



export interface JwtPayload {

&nbsp; sub: string;

&nbsp; email: string;

&nbsp; venue\_id: string;

&nbsp; role: string;

&nbsp; permissions: string\[];

}



export interface LoginResponse {

&nbsp; access\_token: string;

&nbsp; token\_type: string;

&nbsp; expires\_in: number;

&nbsp; user: {

&nbsp;   id: string;

&nbsp;   email: string;

&nbsp;   name: string;

&nbsp;   role: string;

&nbsp;   venue\_id: string;

&nbsp; };

}



@Injectable()

export class AuthService {

&nbsp; constructor(

&nbsp;   private readonly usersService: UsersService,

&nbsp;   private readonly jwtService: JwtService,

&nbsp; ) {}



&nbsp; async validateUser(email: string, password: string): Promise<User | null> {

&nbsp;   const user = await this.usersService.findByEmail(email);

&nbsp;   

&nbsp;   if (user \&\& user.active \&\& await bcrypt.compare(password, user.password\_hash)) {

&nbsp;     // Update last login

&nbsp;     await this.usersService.updateLastLogin(user.id);

&nbsp;     return user;

&nbsp;   }

&nbsp;   

&nbsp;   return null;

&nbsp; }



&nbsp; async login(user: User): Promise<LoginResponse> {

&nbsp;   const payload: JwtPayload = {

&nbsp;     sub: user.id,

&nbsp;     email: user.email,

&nbsp;     venue\_id: user.venue\_id,

&nbsp;     role: user.role,

&nbsp;     permissions: user.permissions,

&nbsp;   };



&nbsp;   const access\_token = this.jwtService.sign(payload);



&nbsp;   return {

&nbsp;     access\_token,

&nbsp;     token\_type: 'Bearer',

&nbsp;     expires\_in: 7 \* 24 \* 60 \* 60, // 7 days in seconds

&nbsp;     user: {

&nbsp;       id: user.id,

&nbsp;       email: user.email,

&nbsp;       name: user.name,

&nbsp;       role: user.role,

&nbsp;       venue\_id: user.venue\_id,

&nbsp;     },

&nbsp;   };

&nbsp; }



&nbsp; async validateToken(payload: JwtPayload): Promise<User> {

&nbsp;   const user = await this.usersService.findOne(payload.sub);

&nbsp;   

&nbsp;   if (!user || !user.active) {

&nbsp;     throw new UnauthorizedException('Invalid token');

&nbsp;   }

&nbsp;   

&nbsp;   return user;

&nbsp; }

}

```



\### 6.3 JWT Strategy (src/auth/strategies/jwt.strategy.ts)

```typescript

import { ExtractJwt, Strategy } from 'passport-jwt';

import { PassportStrategy } from '@nestjs/passport';

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { AuthService, JwtPayload } from '../auth.service';



@Injectable()

export class JwtStrategy extends PassportStrategy(Strategy) {

&nbsp; constructor(

&nbsp;   private readonly configService: ConfigService,

&nbsp;   private readonly authService: AuthService,

&nbsp; ) {

&nbsp;   super({

&nbsp;     jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

&nbsp;     ignoreExpiration: false,

&nbsp;     secretOrKey: configService.get('JWT\_SECRET'),

&nbsp;   });

&nbsp; }



&nbsp; async validate(payload: JwtPayload) {

&nbsp;   try {

&nbsp;     const user = await this.authService.validateToken(payload);

&nbsp;     return user;

&nbsp;   } catch (error) {

&nbsp;     throw new UnauthorizedException('Invalid token');

&nbsp;   }

&nbsp; }

}

```



\### 6.4 Auth Controller (src/auth/auth.controller.ts)

```typescript

import {

&nbsp; Controller,

&nbsp; Post,

&nbsp; Body,

&nbsp; UseGuards,

&nbsp; Get,

&nbsp; Request,

} from '@nestjs/common';

import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';

import { LocalAuthGuard } from '../common/guards/local-auth.guard';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { LoginDto } from './dto/login.dto';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { User } from '../database/entities/user.entity';



@ApiTags('auth')

@Controller('auth')

export class AuthController {

&nbsp; constructor(private readonly authService: AuthService) {}



&nbsp; @UseGuards(LocalAuthGuard)

&nbsp; @Post('login')

&nbsp; @ApiOperation({ summary: 'User login' })

&nbsp; @ApiResponse({ status: 200, description: 'Login successful' })

&nbsp; @ApiResponse({ status: 401, description: 'Invalid credentials' })

&nbsp; async login(@Body() loginDto: LoginDto, @Request() req) {

&nbsp;   return this.authService.login(req.user);

&nbsp; }



&nbsp; @UseGuards(JwtAuthGuard)

&nbsp; @Get('profile')

&nbsp; @ApiBearerAuth()

&nbsp; @ApiOperation({ summary: 'Get current user profile' })

&nbsp; @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })

&nbsp; getProfile(@CurrentUser() user: User) {

&nbsp;   const { password\_hash, ...result } = user;

&nbsp;   return result;

&nbsp; }

}

```



---



\## 7. Guards e Decorators



\### 7.1 JWT Auth Guard (src/common/guards/jwt-auth.guard.ts)

```typescript

import { Injectable } from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';



@Injectable()

export class JwtAuthGuard extends AuthGuard('jwt') {}

```



\### 7.2 Roles Guard (src/common/guards/roles.guard.ts)

```typescript

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { UserRole } from '../../database/enums/user-role.enum';

import { ROLES\_KEY } from '../decorators/roles.decorator';



@Injectable()

export class RolesGuard implements CanActivate {

&nbsp; constructor(private reflector: Reflector) {}



&nbsp; canActivate(context: ExecutionContext): boolean {

&nbsp;   const requiredRoles = this.reflector.getAllAndOverride<UserRole\[]>(ROLES\_KEY, \[

&nbsp;     context.getHandler(),

&nbsp;     context.getClass(),

&nbsp;   ]);



&nbsp;   if (!requiredRoles) {

&nbsp;     return true;

&nbsp;   }



&nbsp;   const { user } = context.switchToHttp().getRequest();

&nbsp;   return requiredRoles.some((role) => user.role === role);

&nbsp; }

}

```



\### 7.3 Roles Decorator (src/common/decorators/roles.decorator.ts)

```typescript

import { SetMetadata } from '@nestjs/common';

import { UserRole } from '../../database/enums/user-role.enum';



export const ROLES\_KEY = 'roles';

export const Roles = (...roles: UserRole\[]) => SetMetadata(ROLES\_KEY, roles);

```



\### 7.4 Current User Decorator (src/common/decorators/current-user.decorator.ts)

```typescript

import { createParamDecorator, ExecutionContext } from '@nestjs/common';



export const CurrentUser = createParamDecorator(

&nbsp; (data: unknown, ctx: ExecutionContext) => {

&nbsp;   const request = ctx.switchToHttp().getRequest();

&nbsp;   return request.user;

&nbsp; },

);

```



---



\## 8. Main Application Setup



\### 8.1 Main.ts (src/main.ts)

```typescript

import { NestFactory } from '@nestjs/core';

import { ValidationPipe } from '@nestjs/common';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';



async function bootstrap() {

&nbsp; const app = await NestFactory.create(AppModule);

&nbsp; const configService = app.get(ConfigService);



&nbsp; // Global pipes

&nbsp; app.useGlobalPipes(

&nbsp;   new ValidationPipe({

&nbsp;     whitelist: true,

&nbsp;     forbidNonWhitelisted: true,

&nbsp;     transform: true,

&nbsp;   }),

&nbsp; );



&nbsp; // CORS

&nbsp; app.enableCors({

&nbsp;   origin: configService.get('CORS\_ORIGIN'),

&nbsp;   credentials: true,

&nbsp; });



&nbsp; // API prefix

&nbsp; app.setGlobalPrefix('api/v1');



&nbsp; // Swagger documentation

&nbsp; const config = new DocumentBuilder()

&nbsp;   .setTitle('BeerFlow API')

&nbsp;   .setDescription('Complete brewery management system API')

&nbsp;   .setVersion('1.0')

&nbsp;   .addBearerAuth()

&nbsp;   .addTag('auth', 'Authentication endpoints')

&nbsp;   .addTag('venues', 'Venue management')

&nbsp;   .addTag('users', 'User management')

&nbsp;   .build();



&nbsp; const document = SwaggerModule.createDocument(app, config);

&nbsp; SwaggerModule.setup('api/docs', app, document);



&nbsp; const port = configService.get('PORT') || 3000;

&nbsp; await app.listen(port);

&nbsp; 

&nbsp; console.log(`🍺 BeerFlow API is running on: http://localhost:${port}`);

&nbsp; console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);

}

bootstrap();

```



\### 8.2 App Module (src/app.module.ts)

```typescript

import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';

import { VenuesModule } from './venues/venues.module';

import { UsersModule } from './users/users.module';

import { AuthModule } from './auth/auth.module';



@Module({

&nbsp; imports: \[

&nbsp;   ConfigModule.forRoot({

&nbsp;     isGlobal: true,

&nbsp;     envFilePath: '.env',

&nbsp;   }),

&nbsp;   DatabaseModule,

&nbsp;   AuthModule,

&nbsp;   VenuesModule,

&nbsp;   UsersModule,

&nbsp; ],

})

export class AppModule {}

```



---



\## 9. Criteri di Completamento Fase



\### Verifiche Funzionali Obbligatorie:

1\. \*\*Server Startup\*\*: `npm run start:dev` avvia senza errori

2\. \*\*Database Connection\*\*: Connessione TypeORM funzionante

3\. \*\*API Documentation\*\*: Swagger disponibile su `/api/docs`

4\. \*\*Authentication\*\*: Login con utenti demo funzionante

5\. \*\*Authorization\*\*: Guards per ruoli funzionanti

6\. \*\*CRUD Venues\*\*: Operazioni venues complete

7\. \*\*CRUD Users\*\*: Operazioni users complete



\### Endpoints da Testare:

\- `POST /api/v1/auth/login` - Login utente

\- `GET /api/v1/auth/profile` - Profilo utente autenticato  

\- `GET /api/v1/venues` - Lista venues

\- `POST /api/v1/venues` - Creazione venue (admin only)

\- `GET /api/v1/users` - Lista utenti



\### Performance Requirements:

\- Response time login < 200ms

\- Response time API calls < 100ms

\- Memory usage < 150MB in development



La fase 1 è completa quando tutti i test passano e l'API Swagger è completamente navigabile con autenticazione funzionante.

