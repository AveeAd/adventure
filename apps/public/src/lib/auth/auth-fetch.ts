import { apiUrl } from './api';
import { tokenStore } from './token-store';

// Attaches the in-memory access token when present. Callers that require
// auth should already have gone through the beforeLoad guard (require-auth.ts)
// so a missing token here means the request will 401 and the caller's
// onError/catch handles it - this helper doesn't redirect on its own.
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(apiUrl(path), { ...init, headers, credentials: 'include' });
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

export const authPost = <T>(path: string, body?: unknown) => authFetchJson<T>(path, 'POST', body);
export const authPatch = <T>(path: string, body?: unknown) => authFetchJson<T>(path, 'PATCH', body);
export const authDelete = <T>(path: string) => authFetchJson<T>(path, 'DELETE');

// No Content-Type header here on purpose - the browser sets the multipart
// boundary itself when the body is a FormData instance.
export async function authUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await authFetch(path, { method: 'POST', body: formData });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json();
}
