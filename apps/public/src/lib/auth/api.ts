const isServer = typeof window === 'undefined';

// SSR loaders run inside this app's own container, where "localhost" is the
// container's own network namespace, not the api service - they need the
// compose network address. Browser code (client-side nav, and the Google
// OAuth redirect, which is always a real page navigation on the host) needs
// the host-exposed port instead.
const SERVER_API_URL = 'http://api:3000';
const CLIENT_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const API_URL = isServer ? SERVER_API_URL : CLIENT_API_URL;

export function apiUrl(path: string): string {
  return `${API_URL}/api/v1${path}`;
}
