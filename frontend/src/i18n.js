import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import az from './locales/az.json';
import tr from './locales/tr.json';

const SUPPORTED = ['az', 'tr'];

/**
 * Resolve the initial UI locale using a strict priority chain.
 *
 * 1. URL prefix  →  `/az/...` or `/tr/...` (strongest — user explicit)
 * 2. localStorage "locale" key  →  user's previous manual choice
 * 3. Browser language  →  navigator.languages / navigator.language
 *    (matches the primary BCP-47 subtag: `tr` / `az`)
 * 4. Timezone  →  Intl `Europe/Istanbul` = tr, `Asia/Baku` = az
 * 5. Default fallback  →  `az`
 *
 * NO geolocation / permission-prompting APIs are used.
 */
export function detectInitialLocale() {
  if (typeof window === 'undefined') return 'az';

  // 1. URL
  try {
    const seg = window.location.pathname.split('/')[1];
    if (SUPPORTED.includes(seg)) return seg;
  } catch { /* noop */ }

  // 2. localStorage
  try {
    const saved = window.localStorage.getItem('locale');
    if (SUPPORTED.includes(saved)) return saved;
  } catch { /* noop */ }

  // 3. Browser language(s)
  try {
    const langs = [
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
      navigator.language || '',
    ].filter(Boolean);
    for (const l of langs) {
      const code = String(l).toLowerCase().split('-')[0];
      if (code === 'tr') return 'tr';
      if (code === 'az') return 'az';
    }
  } catch { /* noop */ }

  // 4. Timezone hint
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Europe/Istanbul') return 'tr';
    if (tz === 'Asia/Baku') return 'az';
  } catch { /* noop */ }

  // 5. Default
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
