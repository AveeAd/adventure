import type { TFunction } from 'i18next';

// I18N.md: fixes a live SSR hydration bug. Every date/number call in this
// repo used to call toLocaleDateString()/toLocaleString() with no locale
// argument - under SSR the server formats with the *container's* locale
// and the client re-formats with the *visitor's*, so server HTML and
// hydrated HTML can disagree. Passing an explicit Intl locale here (not the
// UI language - see lib/i18n/locale.ts for that) makes server and client
// agree regardless of either environment's own default. Hardcoded to
// 'en-US' while only `en` ships; thread a real locale through here once a
// second one exists.
const INTL_LOCALE = 'en-US';

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(INTL_LOCALE, options ?? { dateStyle: 'medium' }).format(d);
}

export function formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(INTL_LOCALE, options ?? { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(INTL_LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(INTL_LOCALE).format(value);
}

// One of I18N.md's two named "natural first extraction" enum-label maps -
// moved into common.json's rateUnit namespace. Takes a TFunction rather
// than being a component itself, since it's called from plain JS spots
// (e.g. inside a template literal), not always a component body. Always
// reads from the `common` namespace explicitly (`common:rateUnit.X`),
// regardless of which namespace the caller's own `t` is scoped to.
export function formatRateUnit(t: TFunction, rateUnit: string | null): string {
  if (!rateUnit) return '';
  return t(`common:rateUnit.${rateUnit}`, { defaultValue: rateUnit });
}
