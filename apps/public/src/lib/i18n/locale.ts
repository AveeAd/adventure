// English-only, but i18n-ready - see I18N.md. SUPPORTED_LOCALES has one
// entry today; adding a second locale means adding its resource bundle
// (see i18n.ts) and appending it here, nothing else in this file changes.
export const SUPPORTED_LOCALES = ['en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isSupportedLocale(value: string | undefined | null): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

const COOKIE_NAME = 'locale';

// Resolved server-side in the root route's loader (SSR) and read from
// document.cookie on client-side navigations, so SSR and the hydrated
// client always agree - the same class of fix as the Intl formatting work
// in lib/format.ts, just for language instead of date/number formatting.
export async function resolveLocale(): Promise<Locale> {
  if (typeof window !== 'undefined') {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
    const value = match?.[1] && decodeURIComponent(match[1]);
    return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
  }
  // Dynamic import: this branch only ever runs server-side, and
  // @tanstack/react-start/server's getCookie only works inside a request's
  // server context - importing it at module scope would be harmless here
  // but this keeps the "server-only" boundary explicit, mirroring
  // lib/auth/api.ts's isServer split.
  const { getCookie } = await import('@tanstack/react-start/server');
  const value = getCookie(COOKIE_NAME);
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}
