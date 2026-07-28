import { BadRequestException } from '@nestjs/common';

interface OAuthState {
  redirectUrl: string;
}

export function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

export function decodeState(state: string | undefined): OAuthState {
  if (!state) {
    throw new BadRequestException('Missing state');
  }
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (typeof parsed?.redirectUrl !== 'string') {
      throw new Error('malformed');
    }
    return parsed;
  } catch {
    throw new BadRequestException('Invalid state');
  }
}
