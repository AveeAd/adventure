import type { AuthProvider } from '@refinedev/core';
import { roleStore } from './role-store';
import { tokenStore } from './token-store';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type Role = 'ADMIN' | 'MODERATOR' | 'USER';

// MILESTONE_3.md §2.1: admin-site login is allowed for ADMIN and MODERATOR
// only. Nothing on the backend rejects a plain USER's OAuth login (it's a
// shared Google flow with apps/public), so the gate has to live here -
// every other admin endpoint already 403s a USER via @Roles, but the app
// shell itself would otherwise still load for them.
const ADMIN_SITE_ROLES: Role[] = ['ADMIN', 'MODERATOR'];

async function fetchIdentityRole(token: string): Promise<string | null> {
  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return null;
  }
  const identity = await res.json();
  return identity?.role ?? null;
}

export const authProvider: AuthProvider = {
  login: async () => {
    const redirectUrl = window.location.origin;
    window.location.href = `${API_URL}/api/v1/auth/google?redirectUrl=${encodeURIComponent(redirectUrl)}`;
    return { success: true };
  },

  logout: async () => {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
    tokenStore.set(null);
    roleStore.set(null);
    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    let token = tokenStore.get();
    if (!token) {
      // no in-memory token (e.g. fresh page load) - try a silent refresh
      // using the httpOnly cookie before giving up
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const { accessToken } = await res.json();
          tokenStore.set(accessToken);
          token = accessToken;
        }
      } catch {
        // fall through to unauthenticated
      }
    }
    if (!token) {
      return { authenticated: false, redirectTo: '/login' };
    }

    const role = await fetchIdentityRole(token);
    if (!role || !ADMIN_SITE_ROLES.includes(role as Role)) {
      tokenStore.set(null);
      roleStore.set(null);
      return {
        authenticated: false,
        redirectTo: '/login',
        error: { name: 'Forbidden', message: 'This account is not permitted to access the admin site.' },
      };
    }
    roleStore.set(role as Role);
    return { authenticated: true };
  },

  onError: async (error) => {
    const status = error?.statusCode ?? error?.response?.status;
    if (status === 401) {
      tokenStore.set(null);
      return { logout: true, redirectTo: '/login', error };
    }
    return { error };
  },

  getIdentity: async () => {
    const token = tokenStore.get();
    if (!token) {
      return null;
    }
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  },
};
