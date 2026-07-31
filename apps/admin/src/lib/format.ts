// I18N.md: fixes a live SSR-class hydration inconsistency risk - every
// date call in this app used to call toLocaleDateString()/toLocaleString()
// with no locale argument, so formatting silently depends on whichever
// locale the browser happens to report. apps/admin has no SSR (Vite SPA),
// so there's no server/client disagreement to fix here specifically, but
// an explicit locale keeps this app's date formatting consistent with
// apps/public's fix and with whatever AntD's ConfigProvider locale is set
// to (see App.tsx), rather than left to drift on its own.
const INTL_LOCALE = 'en-US';

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(INTL_LOCALE, options ?? { dateStyle: 'medium' }).format(d);
}

export function formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(INTL_LOCALE, options ?? { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}
