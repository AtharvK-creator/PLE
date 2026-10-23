import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '@ple/types';
import { EnvConfig } from '../../../config/env.validation';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService<EnvConfig>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          // Prefer httpOnly cookie; fall back to Authorization Bearer header
          const cookieToken = request?.cookies?.refresh_token as string | undefined;
          if (cookieToken) return cookieToken;
          const header = request?.headers?.authorization;
          if (header?.startsWith('Bearer ')) return header.slice(7);
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', { infer: true }),
      passReqToCallback: true,
    });
  }

  /**
   * Passport calls this after verifying the JWT signature.
   * We attach the raw refresh token string so AuthService can rotate it.
   */
  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<JwtPayload & { refreshToken: string }> {
    const refreshToken =
      (req.cookies?.refresh_token as string | undefined) ??
      req.headers.authorization?.replace('Bearer ', '') ??
      '';
    if (!refreshToken) throw new UnauthorizedException('Refresh token not found');
    return { ...payload, refreshToken };
  }
}
