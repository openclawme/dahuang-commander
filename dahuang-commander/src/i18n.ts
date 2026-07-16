import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import zhTranslation from './locales/zh.json';

// Determine initial language based on the URL path
const getInitialLanguage = () => {
  const path = window.location.pathname;
  if (path.startsWith('/commander/en') || path.startsWith('/en')) {
    return 'en';
  }
  return 'zh';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      zh: {
        translation: zhTranslation,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
