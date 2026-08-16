import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new UnauthorizedException('Google account has no email'), false);
      return;
    }
    // passport-google-oauth20's typings don't surface email_verified, but
    // Google's raw profile payload always includes it - see AuthService's
    // auto-link check, which only trusts a provider-asserted verified email.
    const emailVerified = (profile._json as { email_verified?: boolean })?.email_verified ?? false;
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      emailVerified,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, googleProfile);
  }
}
