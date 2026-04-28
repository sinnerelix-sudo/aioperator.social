import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import az from './locales/az.json';
import tr from './locales/tr.json';

const SUPPORTED = ['az', 'tr'];

function detectInitialLocale() {
  // 1. URL prefix /az or /tr
  if (typeof window !== 'undefined') {
    const seg = window.location.pathname.split('/')[1];
    if (SUPPORTED.includes(seg)) return seg;
    // 2. localStorage
    const saved = window.localStorage.getItem('locale');
    if (SUPPORTED.includes(saved)) return saved;
  }
  return 'az';
}

i18n.use(initReactI18next).init({
  resources: {
    az: { translation: az },
    tr: { translation: tr },
  },
  lng: detectInitialLocale(),
  fallbackLng: 'az',
  supportedLngs: SUPPORTED,
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export const SUPPORTED_LOCALES = SUPPORTED;
export default i18n;
