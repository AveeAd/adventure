// i18next + react-i18next - see I18N.md. Refine's i18nProvider contract is
// shaped around exactly this library's t/changeLanguage, so apps/admin
// gets first-class integration for almost nothing. Only `en` ships today.
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import common from '../../locales/en/common.json';
import dashboard from '../../locales/en/dashboard.json';
import resourcesNs from '../../locales/en/resources.json';

export const defaultNS = 'common';

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    ns: ['common', 'resources', 'dashboard'],
    resources: {
      en: { common, resources: resourcesNs, dashboard },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18next;
