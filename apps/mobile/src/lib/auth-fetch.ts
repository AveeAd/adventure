import { apiUrl, CLIENT_VERSION, CLIENT_VERSION_HEADER } from './api';
import { tokenStore } from './auth/token-store';
import { checkUpgradeRequired } from './version-gate';

// Mirrors apps/public/src/lib/auth/auth-fetch.ts. No `credentials: 'include'`
// here - there's no cookie jar on RN, auth travels entirely via the
// Authorization header (see lib/auth/session.ts).
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set(CLIENT_VERSION_HEADER, CLIENT_VERSION);
  const res = await fetch(apiUrl(path), { ...init, headers });
  await checkUpgradeRequired(res);
  return res;
}

async function authFetchJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await authFetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export const authGet = <T>(path: string) => authFetchJson<T>(path, 'GET');
export const authPost = <T>(path: string, body?: unknown) => authFetchJson<T>(path, 'POST', body);
export const authPatch = <T>(path: string, body?: unknown) =>
  authFetchJson<T>(path, 'PATCH', body);
export const authDelete = <T>(path: string, body?: unknown) => authFetchJson<T>(path, 'DELETE', body);

// No Content-Type header on purpose - fetch sets the multipart boundary
// itself when the body is a FormData instance.
export async function authUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await authFetch(path, { method: 'POST', body: formData });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json();
}
