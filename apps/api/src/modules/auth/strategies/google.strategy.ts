import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { EnvConfig } from '../../../config/env.validation';

export interface GoogleUser {
  email: string;
  name: string;
  googleId: string;
  avatarUrl?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService<EnvConfig>) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID', { infer: true }),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL', { infer: true }),
      scope: ['email', 'profile'],
    });
  }

  /**
   * Passport calls this after a successful Google OAuth exchange.
   * We extract the minimal user data we need and pass it to `done`.
   */
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    const name =
      profile.displayName ||
      `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim();
    const avatarUrl = profile.photos?.[0]?.value;

    if (!email) {
      done(new Error('No email returned from Google profile'), undefined);
      return;
    }

    const user: GoogleUser = {
      email,
      name,
      googleId: profile.id,
      avatarUrl,
    };

    done(null, user);
  }
}
