import { UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Sign in with Apple has no browser-redirect flow on this app (unlike
// Google's - Apple sign-in only needs to exist for the iOS app, see
// MOBILE_PLAN.md Phase 7), so there's no passport strategy: the native
// AuthenticationServices sheet on-device hands apps/mobile an identity
// token directly, and this verifies it server-side the same way
// AuthService.handleGoogleMobileLogin verifies a Google ID token - never
// trust what the client claims about itself.
const APPLE_ISSUER = 'https://appleid.apple.com';
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export interface AppleProfile {
  appleId: string;
  email: string;
  emailVerified: boolean;
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  audience: string,
): Promise<AppleProfile> {
  const { payload } = await jwtVerify(identityToken, appleJwks, {
    issuer: APPLE_ISSUER,
    audience,
  }).catch(() => {
    throw new UnauthorizedException('Invalid Apple token');
  });

  const email = typeof payload.email === 'string' ? payload.email : undefined;
  if (!email) {
    throw new UnauthorizedException('Apple token has no email');
  }

  // Apple encodes email_verified as either a boolean or the string "true"/
  // "false" depending on token version - coerce rather than trust the type.
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

  return {
    appleId: payload.sub!,
    email,
    emailVerified,
  };
}
