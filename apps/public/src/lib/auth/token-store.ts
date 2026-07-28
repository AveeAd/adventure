let accessToken: string | null = null;

// in memory only, client-side only - never touches SSR (each server
// request is a stateless Node process with no browser memory to read from)
// and never localStorage, to limit XSS token-theft surface
export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};
