import { apiUrl } from './auth/api';

export interface AppConfig {
  name: string;
  tagline: string;
}

const FALLBACK: AppConfig = {
  name: 'Hipppie',
  tagline: 'Hipppie — a non-commercial map, wiki, and activity log for Nepal, built by contributors.',
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
    };
  } catch {
    return FALLBACK;
  }
}
