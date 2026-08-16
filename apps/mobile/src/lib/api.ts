import Constants from 'expo-constants';

// No SSR branch here (contrast apps/public/src/lib/auth/api.ts) - apps/mobile
// always runs as a "client", talking to the containerized API over the
// host's LAN IP per MOBILE_PLAN.md ("apps/mobile cannot run in Docker").
// Set EXPO_PUBLIC_API_URL in apps/mobile/.env to that LAN address, e.g.
// http://192.168.1.23:3000 - localhost resolves to the device/simulator
// itself, not the host machine.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export function apiUrl(path: string): string {
  return `${API_URL}/api/v1${path}`;
}

// Sent on every request so the Phase 7 min-version gate (MOBILE_PLAN.md) has
// something to read once it exists; unused by the API until then.
export const CLIENT_VERSION_HEADER = 'X-Client-Version';
export const CLIENT_VERSION = Constants.expoConfig?.version ?? '0.0.0';
