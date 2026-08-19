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

// Sent on every request so the Phase 7 min-version gate can 426 stale
// clients - see apps/api/src/settings/min-version.middleware.ts and
// lib/version-gate.ts.
export const CLIENT_VERSION_HEADER = 'X-Client-Version';
export const CLIENT_VERSION = Constants.expoConfig?.version ?? '0.0.0';

// Store listing URLs for the "Update" button on the blocked screen
// (components/UpdateRequiredScreen.tsx). Unset until the app is actually
// published (EAS Submit, still a later Phase 7 item) - the screen degrades
// to text-only instructions rather than a dead link in the meantime.
export const IOS_STORE_URL = process.env.EXPO_PUBLIC_IOS_STORE_URL ?? null;
export const ANDROID_STORE_URL = process.env.EXPO_PUBLIC_ANDROID_STORE_URL ?? null;
