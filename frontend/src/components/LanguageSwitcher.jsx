import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { SUPPORTED_LOCALES } from '../i18n';

/**
 * AZ/TR language switcher.
 *
 * `compact` prop tightens padding and hides the Globe icon on small screens,
 * so the switcher can safely live in the mobile public header alongside the
 * logo + CTA button without overflowing narrow viewports (~360px).
 */
export function LanguageSwitcher({ className = '', compact = false }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { lng } = useParams();

  const change = (next) => {
    i18n.changeLanguage(next);
    try { localStorage.setItem('locale', next); } catch { /* noop */ }
    // swap leading segment
    const path = window.location.pathname;
    const parts = path.split('/');
    if (SUPPORTED_LOCALES.includes(parts[1])) {
      parts[1] = next;
      navigate(parts.join('/') || `/${next}`);
    } else {
      navigate(`/${next}${path}`);
    }
  };

  const current = lng || i18n.language || 'az';
  const wrapperPad = compact ? 'p-0.5 sm:p-1' : 'p-1';
  const btnPad = compact ? 'px-2 py-0.5 sm:px-2.5 sm:py-1' : 'px-2.5 py-1';

  return (
    <div
      data-testid="language-switcher"
      className={`inline-flex items-center gap-0.5 sm:gap-1 rounded-full border border-ink-200 bg-white ${wrapperPad} ${className}`}
    >
      <Globe className={`h-3.5 w-3.5 text-ink-500 ${compact ? 'hidden sm:inline ml-2' : 'ml-2'}`} />
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          onClick={() => change(code)}
          data-testid={`lang-switch-${code}`}
          aria-pressed={current === code}
          className={`text-[11px] sm:text-xs font-semibold rounded-full transition-colors ${btnPad} ${
            current === code ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
