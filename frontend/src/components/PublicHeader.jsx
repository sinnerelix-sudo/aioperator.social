import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '../context/AuthContext';

export function PublicHeader() {
  const { t } = useTranslation();
  const { lng = 'az' } = useParams();
  const { isAuthenticated } = useAuth();
  const base = `/${lng}`;

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-black/5"
      data-testid="public-header"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-10 h-16">
        <Link to={base} className="flex items-center gap-2 group" data-testid="header-logo">
          <span className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-brand-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="font-display font-semibold tracking-tight text-ink-900">
            {t('common.appName')}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-ink-700">
          <a href="#features" className="hover:text-ink-900 transition-colors">{t('nav.features')}</a>
          <a href="#pricing" className="hover:text-ink-900 transition-colors">{t('nav.pricing')}</a>
          <a href="#faq" className="hover:text-ink-900 transition-colors">{t('nav.faq')}</a>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <LanguageSwitcher compact />
          {isAuthenticated ? (
            <Link
              to={`${base}/dashboard`}
              data-testid="header-dashboard-btn"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-gradient text-white hover:opacity-90 transition-opacity"
            >
              {t('common.dashboard')}
            </Link>
          ) : (
            <>
              <Link
                to={`${base}/login`}
                data-testid="header-login-btn"
                className="text-sm font-medium text-ink-700 hover:text-ink-900 transition-colors px-3 py-2"
              >
                {t('common.login')}
              </Link>
              <Link
                to={`${base}/register`}
                data-testid="header-register-btn"
                className="text-sm font-medium px-4 py-2 rounded-lg bg-ink-900 text-white hover:bg-ink-700 transition-colors"
              >
                {t('common.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
