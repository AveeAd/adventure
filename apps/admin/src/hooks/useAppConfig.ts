import { useEffect, useState } from 'react';
import { API_URL } from '../auth/auth-provider';

export interface AppConfig {
  name: string;
  tagline: string;
}

const FALLBACK: AppConfig = {
  name: 'Adventure Nepal',
  tagline: 'Adventure Nepal — a non-commercial map, wiki, and activity log for Nepal, built by contributors.',
};

// Plain fetch, not Refine's useCustom - this needs to work on the
// pre-login LoginPage too, and useCustom goes through the authenticated
// axios data provider.
export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/v1/settings/public`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((rows: { key: string; value: string }[]) => {
        if (cancelled) return;
        const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        setConfig({
          name: map['app.name'] || FALLBACK.name,
          tagline: map['app.tagline'] || FALLBACK.tagline,
        });
      })
      .catch(() => {
        /* keep FALLBACK */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
