import { apiUrl } from './auth/api';

export interface AppConfig {
  name: string;
  tagline: string;
  // Public/support contact email (app.contactEmail SystemSetting) - backs
  // the privacy policy page and, eventually, store-listing support email.
  // Empty string, not a hardcoded fallback address, when unset - seeded
  // from CONTACT_EMAIL server-side (settings.constants.ts), so an unset
  // value here means it's genuinely not configured yet, not that this
  // fetch failed.
  contactEmail: string;
}

const FALLBACK: AppConfig = {
  name: 'Hipppie',
  tagline: 'Hipppie — a non-commercial map, wiki, and activity log for Nepal, built by contributors.',
  contactEmail: '',
};

export async function fetchAppConfig(): Promise<AppConfig> {
  try {
    const res = await fetch(apiUrl('/settings/public'));
    if (!res.ok) return FALLBACK;
    const rows: { key: string; value: string }[] = await res.json();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      name: map['app.name'] || FALLBACK.name,
      tagline: map['app.tagline'] || FALLBACK.tagline,
      contactEmail: map['app.contactEmail'] || FALLBACK.contactEmail,
    };
  } catch {
    return FALLBACK;
  }
}
