import { createIsomorphicFn } from '@tanstack/react-start';

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

// createIsomorphicFn, not a runtime typeof-window branch: the root loader
// runs on both server (SSR) and client (client-side navigation), so both
// branches are reachable from the client bundle's module graph. A runtime
// check still statically references '@tanstack/react-start/server' from
// client-reachable code, which Vinxi's import-protection plugin rejects at
// build time regardless of the guard. createIsomorphicFn's compiler pass
// deletes the untaken branch's AST (imports included) before that check
// ever runs - see the "Import denied in client environment" build error
// this replaced for the full explanation.
const readLocaleCookie = createIsomorphicFn()
  .client(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
    return match?.[1] && decodeURIComponent(match[1]);
  })
  .server(async () => {
    const { getCookie } = await import('@tanstack/react-start/server');
    return getCookie(COOKIE_NAME);
  });

// Resolved server-side in the root route's loader (SSR) and read from
// document.cookie on client-side navigations, so SSR and the hydrated
// client always agree - the same class of fix as the Intl formatting work
// in lib/format.ts, just for language instead of date/number formatting.
export async function resolveLocale(): Promise<Locale> {
  const value = await readLocaleCookie();
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}
