let accessToken: string | null = null;

// In memory only, same rationale as apps/public/src/lib/auth/token-store.ts -
// never persisted, to limit the token-theft surface. The refresh token (the
// thing actually worth persisting across app restarts) lives in
// expo-secure-store instead - see secure-storage.ts.
export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};
