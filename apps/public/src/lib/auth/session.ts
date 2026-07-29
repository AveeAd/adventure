import { API_URL, apiUrl } from './api';
import { tokenStore } from './token-store';

// Matches AuthenticatedUser from apps/api/src/auth/decorators/current-user.decorator.ts
export interface CurrentUser {
  userId: string;
  email: string;
  role: string;
}

// Mirrors apps/admin's authProvider.check(): the access token only lives in
// memory (never localStorage), so a fresh page load has none - fall back to
// the httpOnly refresh cookie once before deciding the visitor is anonymous.
export async function checkAuth(): Promise<boolean> {
  if (tokenStore.get()) {
    return true;
  }
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const { accessToken } = await res.json();
      tokenStore.set(accessToken);
      return true;
    }
  } catch {
    // fall through to unauthenticated
  }
  return false;
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const authenticated = await checkAuth();
  if (!authenticated) {
    return null;
  }
  const res = await fetch(apiUrl('/auth/me'), {
    headers: { Authorization: `Bearer ${tokenStore.get()}` },
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined);
  tokenStore.set(null);
}
