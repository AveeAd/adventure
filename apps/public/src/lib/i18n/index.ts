// i18next + react-i18next - see I18N.md for why (Refine's i18nProvider
// contract in apps/admin is shaped around exactly this library's t/
// changeLanguage, so using the same library in both apps costs nothing extra).
// Only `en` ships; SUPPORTED_LOCALES/resources both have exactly one entry
// today, extended when a second locale actually lands (see locale.ts).
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import account from '../../locales/en/account.json';
import adventurePage from '../../locales/en/adventurePage.json';
import clubs from '../../locales/en/clubs.json';
import common from '../../locales/en/common.json';
import discover from '../../locales/en/discover.json';
import groups from '../../locales/en/groups.json';
import guides from '../../locales/en/guides.json';
import tripReports from '../../locales/en/tripReports.json';

export const defaultNS = 'common';

// A single module-scope instance, not one per request: language never
// varies request-to-request while only `en` ships, so the usual SSR
// per-request-i18next-instance dance buys nothing yet. Revisit once a
// second locale needs it.
if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    ns: ['common', 'discover', 'guides', 'adventurePage', 'groups', 'tripReports', 'account', 'clubs'],
    resources: {
      en: { common, discover, guides, adventurePage, groups, tripReports, account, clubs },
    },
    interpolation: { escapeValue: false }, // React already escapes
    react: { useSuspense: false },
  });
}

export default i18next;
