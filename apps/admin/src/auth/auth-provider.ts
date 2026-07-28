import type { AuthProvider } from '@refinedev/core';
import { tokenStore } from './token-store';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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
    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    if (tokenStore.get()) {
      return { authenticated: true };
    }
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
        return { authenticated: true };
      }
    } catch {
      // fall through to unauthenticated
    }
    return { authenticated: false, redirectTo: '/login' };
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
