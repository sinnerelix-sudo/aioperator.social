import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { lng = 'az' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    toast.info(t('common.logout'));
    navigate(`/${lng}`);
  };

  return (
    <div data-testid="settings-page">
      <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
        {t('dashboard.settings.title')}
      </h1>

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-ink-200 rounded-xl p-6">
          <h2 className="font-display font-semibold text-base text-ink-900">{t('dashboard.settings.profile')}</h2>
          <dl className="mt-4 grid grid-cols-3 gap-y-2 text-sm">
            <dt className="text-ink-500">{t('auth.firstName')}</dt>
            <dd className="col-span-2 text-ink-900 font-medium">{user?.firstName}</dd>
            <dt className="text-ink-500">{t('auth.lastName')}</dt>
            <dd className="col-span-2 text-ink-900 font-medium">{user?.lastName}</dd>
            <dt className="text-ink-500">{t('auth.email')}</dt>
            <dd className="col-span-2 text-ink-900 font-medium break-all">{user?.email}</dd>
            <dt className="text-ink-500">{t('auth.phone')}</dt>
            <dd className="col-span-2 text-ink-900 font-medium">{user?.phone}</dd>
          </dl>
        </div>

        <div className="bg-white border border-ink-200 rounded-xl p-6">
          <h2 className="font-display font-semibold text-base text-ink-900">{t('dashboard.settings.language')}</h2>
          <p className="text-sm text-ink-500 mt-2">AZ / TR</p>
          <div className="mt-3">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <button
        onClick={onLogout}
        data-testid="settings-logout-btn"
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        {t('dashboard.settings.logout')}
      </button>
    </div>
  );
}
