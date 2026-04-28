import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export function Footer() {
  const { t } = useTranslation();
  const { lng = 'az' } = useParams();
  return (
    <footer className="border-t border-ink-200 bg-white" data-testid="public-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <Link to={`/${lng}`} className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-brand-gradient flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="font-display font-semibold text-ink-900">{t('common.appName')}</span>
          </Link>
          <p className="text-xs text-ink-500 mt-2 max-w-md">{t('footer.tagline')}</p>
        </div>
        <div className="text-xs text-ink-500">
          © {new Date().getFullYear()} {t('common.appName')}. {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}
