import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { SUPPORTED_LOCALES } from '../i18n';

export function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { lng } = useParams();

  const change = (next) => {
    i18n.changeLanguage(next);
    localStorage.setItem('locale', next);
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

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1 ${className}`}>
      <Globe className="h-3.5 w-3.5 text-ink-500 ml-2" />
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          onClick={() => change(code)}
          data-testid={`lang-switch-${code}`}
          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
            current === code ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
