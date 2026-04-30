import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { LogOut, ExternalLink, Save, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { meApi } from '../../lib/api';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { lng = 'az' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout, refresh } = useAuth();

  const [form, setForm] = useState({
    storeSlug: '',
    storeName: '',
    instagramHandle: '',
    whatsappNumber: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        storeSlug: user.storeSlug || '',
        storeName: user.storeName || '',
        instagramHandle: user.instagramHandle || '',
        whatsappNumber: user.whatsappNumber || '',
      });
    }
  }, [user]);

  const onChange = (k) => (e) => {
    const v = k === 'storeSlug' ? e.target.value.toLowerCase().replace(/\s+/g, '') : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const onLogout = () => {
    logout();
    toast.info(t('common.logout'));
    navigate(`/${lng}`);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await meApi.updateStore(form);
      await refresh();
      toast.success(t('dashboard.settings.store.saved'));
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'slug_taken') toast.error(t('dashboard.settings.store.slugTaken'));
      else if (code === 'invalid_slug' || code === 'reserved_slug')
        toast.error(t('dashboard.settings.store.invalidSlug'));
      else toast.error(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const domain = typeof window !== 'undefined' ? window.location.host : 'aioperator.social';
  const storeUrl = form.storeSlug
    ? `${window?.location?.protocol || 'https:'}//${domain}/${form.storeSlug}`
    : '';

  return (
    <div data-testid="settings-page">
      <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
        {t('dashboard.settings.title')}
      </h1>

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-ink-200 rounded-xl p-6">
          <h2 className="font-display font-semibold text-base text-ink-900">
            {t('dashboard.settings.profile')}
          </h2>
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
          <h2 className="font-display font-semibold text-base text-ink-900">
            {t('dashboard.settings.language')}
          </h2>
          <p className="text-sm text-ink-500 mt-2">AZ / TR</p>
          <div className="mt-3">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white border border-ink-200 rounded-xl p-6" data-testid="settings-store">
        <div className="flex items-start gap-3">
          <span className="h-9 w-9 rounded-lg bg-brand-gradient-soft flex items-center justify-center shrink-0">
            <Store className="h-4 w-4 text-brand-600" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-base text-ink-900">
              {t('dashboard.settings.store.title')}
            </h2>
            <p className="text-sm text-ink-500 mt-1">{t('dashboard.settings.store.subtitle')}</p>
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label-base">{t('dashboard.settings.store.slugLabel')}</label>
            <div className="flex rounded-lg border border-ink-200 bg-ink-50 overflow-hidden focus-within:border-brand-600">
              <span className="px-3 py-2 text-xs text-ink-500 bg-ink-100 select-none whitespace-nowrap">
                {domain}/
              </span>
              <input
                className="flex-1 px-3 py-2 bg-transparent outline-none text-sm"
                value={form.storeSlug}
                onChange={onChange('storeSlug')}
                placeholder="reshad_12"
                data-testid="store-slug-input"
                maxLength={32}
              />
            </div>
            <p className="text-[11px] text-ink-500 mt-1">{t('dashboard.settings.store.slugHint')}</p>
          </div>
          <div>
            <label className="label-base">{t('dashboard.settings.store.storeName')}</label>
            <input
              className="input-base"
              value={form.storeName}
              onChange={onChange('storeName')}
              data-testid="store-name-input"
            />
          </div>
          <div>
            <label className="label-base">{t('dashboard.settings.store.instagramHandle')}</label>
            <input
              className="input-base"
              value={form.instagramHandle}
              onChange={onChange('instagramHandle')}
              placeholder="@brand_az"
              data-testid="store-ig-input"
            />
          </div>
          <div>
            <label className="label-base">{t('dashboard.settings.store.whatsappNumber')}</label>
            <input
              className="input-base"
              value={form.whatsappNumber}
              onChange={onChange('whatsappNumber')}
              placeholder="+994501112233"
              data-testid="store-wa-input"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
          {storeUrl ? (
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
              data-testid="store-preview-link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {storeUrl}
            </a>
          ) : (
            <span className="text-[11px] text-ink-500">{t('dashboard.settings.store.previewLabel')}</span>
          )}
          <button
            onClick={onSave}
            disabled={saving || !form.storeSlug}
            className="btn-primary disabled:opacity-50"
            data-testid="store-save-btn"
          >
            <Save className="h-4 w-4" />
            {saving ? t('common.loading') : t('dashboard.settings.store.save')}
          </button>
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
