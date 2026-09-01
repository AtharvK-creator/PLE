import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { MailService } from './mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload, TokenPair, AuthUser, UserRole } from '@ple/types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleUser } from './strategies/google.strategy';
import { EnvConfig } from '../../config/env.validation';

function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig>,
    private readonly analyticsService: AnalyticsService,
    private readonly mailService: MailService,
  ) {}

  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        emailVerified: false,
        profile: {
          create: {
            name: dto.name,
            branch: '',
            semester: 1,
            careerGoal: '',
            skillLevel: 'BEGINNER',
          },
        },
      },
    });

    await this.createAuditLog(user.id, 'REGISTER', ipAddress, userAgent, { method: 'email' });
    this.analyticsService.capture(user.id, 'user_registered', { method: 'email' });

    const tokens = await this.issueTokenPair(user.id, user.email, user.role as UserRole);
    return { user: this.toAuthUser(user), tokens };
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) {
      await this.createAuditLog(undefined, 'LOGIN_FAILED', ipAddress, userAgent, {
        email: dto.email,
        reason: 'user_not_found',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.createAuditLog(user.id, 'LOGIN_FAILED', ipAddress, userAgent, {
        reason: 'invalid_password',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    await this.createAuditLog(user.id, 'LOGIN', ipAddress, userAgent, { method: 'email' });
    this.analyticsService.capture(user.id, 'user_logged_in', { method: 'email' });

    const tokens = await this.issueTokenPair(user.id, user.email, user.role as UserRole);
    return { user: this.toAuthUser(user), tokens };
  }

  async refreshTokens(userId: string, incomingRefreshToken: string): Promise<TokenPair> {
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId, token: incomingRefreshToken, isRevoked: false },
    });

    if (!stored || stored.expiresAt < new Date()) {
      // Revoke all tokens for this user (potential token theft detected)
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found or inactive');

    return this.issueTokenPair(user.id, user.email, user.role as UserRole);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { isRevoked: true },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }
    await this.createAuditLog(userId, 'LOGOUT');
  }

  async googleAuth(
    googleUser: GoogleUser,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair; isNew: boolean }> {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }] },
    });

    let isNew = false;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          googleId: googleUser.googleId,
          emailVerified: true,
          profile: {
            create: {
              name: googleUser.name,
              avatarUrl: googleUser.avatarUrl,
              branch: '',
              semester: 1,
              careerGoal: '',
              skillLevel: 'BEGINNER',
            },
          },
        },
      });
      isNew = true;
      this.analyticsService.capture(user.id, 'user_registered', { method: 'google' });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.googleId, emailVerified: true },
      });
    }

    await this.createAuditLog(user.id, 'LOGIN', ipAddress, userAgent, { method: 'google' });
    this.analyticsService.capture(user.id, 'user_logged_in', { method: 'google' });

    const tokens = await this.issueTokenPair(user.id, user.email, user.role as UserRole);
    return { user: this.toAuthUser(user), tokens, isNew };
  }

  async forgotPassword(email: string): Promise<void> {
    // 1. Delete expired OTP records automatically.
    try {
      await this.prisma.passwordResetOtp.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
    } catch (err) {
      this.logger.error('Failed to clean up expired OTP records:', err);
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      // Don't reveal whether user exists to avoid email enumeration
      this.logger.warn(`Forgot password for non-existent email: ${email}`);
      return;
    }

    // 2. Rate limiting check: maximum 3 OTP requests per hour per email.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtpsCount = await this.prisma.passwordResetOtp.count({
      where: {
        userId: user.id,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentOtpsCount >= 3) {
      throw new BadRequestException('Too many password reset requests. Please try again later.');
    }

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Hash OTP before storing (sha256)
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // 5. Expire after 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.passwordResetOtp.create({
        data: {
          userId: user.id,
          otpHash,
          expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastOtpRequestAt: new Date() },
      }),
    ]);

    await this.createAuditLog(user.id, 'FORGOT_PASSWORD_REQUEST', undefined, undefined, { email });

    // 6. Send email via Nodemailer
    const name = user.profile?.name || 'Student';
    await this.mailService.sendPasswordResetOtp(user.email, name, otp);
    this.logger.log(`Forgot password requested for user: ${user.id}, OTP sent.`);
  }

  async verifyResetOtp(email: string, otp: string): Promise<{ verificationToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return a generic error to prevent disclosure
      throw new BadRequestException('Invalid or expired verification code.');
    }

    // Find the latest active OTP for this user
    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    // Enforce maximum 5 verification attempts per OTP
    if (otpRecord.attempts >= 5) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    // Increment attempts count
    await this.prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });

    // Check if the input OTP matches the stored hash
    const inputOtpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpRecord.otpHash !== inputOtpHash) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    // Mark OTP record as used
    await this.prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    await this.createAuditLog(user.id, 'VERIFY_OTP_SUCCESS');

    // Return temporary reset token signed with user's current password hash + updatedAt
    // So if the password changes, all active reset tokens are automatically invalidated
    const secretKey = this.configService.get('JWT_SECRET', { infer: true }) + (user.password || '') + user.updatedAt.getTime();
    
    const verificationToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'password_reset' },
      { secret: secretKey, expiresIn: '10m' },
    );

    return { verificationToken };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    let payload: any;
    try {
      payload = this.jwtService.decode(token);
    } catch {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    if (!payload || !payload.sub || payload.type !== 'password_reset') {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    // Verify token using dynamic signature (secret key)
    const secretKey = this.configService.get('JWT_SECRET', { infer: true }) + (user.password || '') + user.updatedAt.getTime();
    try {
      await this.jwtService.verifyAsync(token, { secret: secretKey });
    } catch {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    // Additional backend password requirement validation (double-checking)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException(
        'Password does not meet complexity requirements (min 8 characters, uppercase, lowercase, number, and special character).',
      );
    }

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    // Update user password. This changes user.password, invalidating other active tokens.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.createAuditLog(user.id, 'RESET_PASSWORD_SUCCESS', ipAddress, userAgent);

    // Send security email alert notification
    const name = user.profile?.name || 'Student';
    const browser = userAgent || 'Unknown Browser';
    const ip = ipAddress || 'Unknown IP';
    const time = new Date().toLocaleString();

    await this.mailService.sendPasswordChangedNotification(user.email, name, {
      time,
      browser,
      ip,
    });
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, role };
    const secret = this.configService.get('JWT_SECRET', { infer: true });
    const accessExpires =
      this.configService.get('JWT_ACCESS_EXPIRES', { infer: true }) ?? '15m';
    const refreshExpires =
      this.configService.get('JWT_REFRESH_EXPIRES', { infer: true }) ?? '7d';

    const accessToken = this.jwtService.sign(payload, { secret, expiresIn: accessExpires });
    const refreshToken = uuidv4();

    const days = parseInt(refreshExpires.replace('d', ''), 10) || 7;
    const expiresAt = addDaysToDate(new Date(), days);

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private async createAuditLog(
    userId: string | undefined,
    action: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: userId ?? null,
          action,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          metadata: (metadata as any) ?? {},
        },
      });
    } catch (err) {
      this.logger.error('Failed to create audit log:', err);
    }
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
    isActive: boolean;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
    };
  }
}
