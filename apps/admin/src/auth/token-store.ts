let accessToken: string | null = null;

// in memory only, never localStorage - reduces XSS token-theft surface
export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};
