import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from '../analytics/analytics.service';
import { MailService } from './mail.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService (Unit)', () => {
  let service: AuthService;
  let prismaMock: any;
  let jwtMock: any;
  let configMock: any;
  let analyticsMock: any;
  let mailMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      passwordResetOtp: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    jwtMock = {
      sign: jest.fn().mockReturnValue('mocked_access_token'),
      signAsync: jest.fn().mockResolvedValue('mocked_access_token'),
    };

    configMock = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_EXPIRES') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES') return '7d';
        return 'test_value';
      }),
    };

    analyticsMock = {
      capture: jest.fn(),
    };

    mailMock = {
      sendPasswordResetOtp: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
        { provide: AnalyticsService, useValue: analyticsMock },
        { provide: MailService, useValue: mailMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if user already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });
      await expect(
        service.register({ email: 'test@example.com', password: 'Password123!', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully register a new user and return tokens', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
        role: 'STUDENT',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
      });

      expect(result.user.email).toBe('new@example.com');
      expect(result.tokens.accessToken).toBe('mocked_access_token');
      expect(prismaMock.user.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'wrong@example.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      const hash = await bcrypt.hash('CorrectPassword123!', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: hash,
        isActive: true,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user and tokens on valid login', async () => {
      const hash = await bcrypt.hash('CorrectPassword123!', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: hash,
        role: 'STUDENT',
        isActive: true,
      });
      prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await service.login({
        email: 'test@example.com',
        password: 'CorrectPassword123!',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.tokens.accessToken).toBe('mocked_access_token');
    });
  });
});
