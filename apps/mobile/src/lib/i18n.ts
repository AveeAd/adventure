// Mirrors apps/public/src/lib/i18n/index.ts's setup (same i18next +
// react-i18next choice, same static-import-only config since only `en`
// ships) minus the SSR/cookie locale-resolution half of that file
// (locale.ts) - there's no server render on mobile, so `lng: 'en'` is
// simply hardcoded rather than resolved per-request.
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import account from '../locales/en/account.json';
import adventurePage from '../locales/en/adventurePage.json';
import auth from '../locales/en/auth.json';
import clubs from '../locales/en/clubs.json';
import common from '../locales/en/common.json';
import discover from '../locales/en/discover.json';
import guides from '../locales/en/guides.json';
import threads from '../locales/en/threads.json';
import tracks from '../locales/en/tracks.json';
import tripReports from '../locales/en/tripReports.json';

export const defaultNS = 'common';

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    ns: ['common', 'auth', 'discover', 'guides', 'adventurePage', 'tripReports', 'account', 'clubs', 'threads', 'tracks'],
    resources: {
      en: { common, auth, discover, guides, adventurePage, tripReports, account, clubs, threads, tracks },
    },
    interpolation: { escapeValue: false }, // React Native has no HTML to escape
    react: { useSuspense: false },
  });
}

export default i18next;
