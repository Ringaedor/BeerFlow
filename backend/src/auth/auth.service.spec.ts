import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    venue_id: '123e4567-e89b-12d3-a456-426614174001',
    email: 'test@example.com',
    password_hash: 'hashedPassword',
    name: 'Test User',
    role: UserRole.WAITER,
    permissions: ['orders.create'],
    active: true,
    last_login: null,
    password_reset_token: null,
    password_reset_expires: null,
    created_at: new Date(),
    updated_at: new Date(),
    venue: null,
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findOne: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.validateUser('test@example.com', 'password');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      const inactiveUser = { ...mockUser, active: false };
      mockUsersService.findByEmail.mockResolvedValue(inactiveUser);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return login response with JWT token', async () => {
      const mockToken = 'mock.jwt.token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        venue_id: mockUser.venue_id,
        role: mockUser.role,
        permissions: mockUser.permissions,
      });

      expect(result).toEqual({
        access_token: mockToken,
        token_type: 'Bearer',
        expires_in: 7 * 24 * 60 * 60,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          venue_id: mockUser.venue_id,
        },
      });
    });
  });

  describe('validateToken', () => {
    const mockPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      venue_id: mockUser.venue_id,
      role: mockUser.role,
      permissions: mockUser.permissions,
    };

    it('should return user when token is valid', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await service.validateToken(mockPayload);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockPayload.sub);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(service.validateToken(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, active: false };
      mockUsersService.findOne.mockResolvedValue(inactiveUser);

      await expect(service.validateToken(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
