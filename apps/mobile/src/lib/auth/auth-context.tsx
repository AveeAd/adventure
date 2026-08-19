import type { CurrentUser } from '@adventure/api-types';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  completeAppleMobileLogin,
  completeGoogleMobileLogin,
  deleteAccount as deleteAccountRequest,
  fetchCurrentUser,
  logout,
} from './session';
import { signInWithGoogle, signOutFromGoogle } from './google-signin';
import { signInWithApple as appleNativeSignIn } from './apple-signin';

interface AuthState {
  status: 'loading' | 'signed-out' | 'signed-in';
  user: CurrentUser | null;
  signIn: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetchCurrentUser()
      .then((current) => {
        setUser(current);
        setStatus(current ? 'signed-in' : 'signed-out');
      })
      .catch(() => setStatus('signed-out'));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      signIn: async () => {
        const idToken = await signInWithGoogle();
        if (!idToken) {
          return;
        }
        const current = await completeGoogleMobileLogin(idToken);
        setUser(current);
        setStatus('signed-in');
      },
      signInWithApple: async () => {
        const result = await appleNativeSignIn();
        if (!result) {
          return;
        }
        const current = await completeAppleMobileLogin(result.identityToken, result.fullName);
        setUser(current);
        setStatus('signed-in');
      },
      signOut: async () => {
        await Promise.all([logout(), signOutFromGoogle()]);
        setUser(null);
        setStatus('signed-out');
      },
      deleteAccount: async () => {
        await Promise.all([deleteAccountRequest(), signOutFromGoogle()]);
        setUser(null);
        setStatus('signed-out');
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
