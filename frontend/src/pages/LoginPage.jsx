import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const { lng = 'az' } = useParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(`/${lng}/dashboard`, { replace: true });
  }, [isAuthenticated, lng, navigate]);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error(t('auth.errors.required'));
      return;
    }
    setSubmitting(true);
    try {
      await login(form);
      toast.success(t('auth.success.login'));
      navigate(`/${lng}/dashboard`, { replace: true });
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'invalid_credentials') toast.error(t('auth.errors.invalidCredentials'));
      else toast.error(err?.response?.data?.message || t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col" data-testid="login-page">
      <div className="px-6 sm:px-10 py-6 flex items-center justify-between border-b border-ink-200">
        <Link to={`/${lng}`} className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="font-display font-semibold text-ink-900">{t('common.appName')}</span>
        </Link>
        <Link to={`/${lng}/register`} className="text-sm text-brand-600 font-medium" data-testid="login-register-link">
          {t('auth.registerLink')}
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl border border-ink-200 p-8 shadow-soft" data-testid="login-form">
          <h1 className="font-display font-semibold text-3xl tracking-tight text-ink-900">
            {t('auth.loginTitle')}
          </h1>
          <p className="text-sm text-ink-500 mt-1">{t('auth.loginSubtitle')}</p>

          <div className="mt-7">
            <label className="label-base">{t('auth.email')}</label>
            <input
              data-testid="login-email"
              type="email"
              className="input-base"
              value={form.email}
              onChange={onChange('email')}
              autoComplete="email"
            />
          </div>
          <div className="mt-3">
            <label className="label-base">{t('auth.password')}</label>
            <input
              data-testid="login-password"
              type="password"
              className="input-base"
              value={form.password}
              onChange={onChange('password')}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            data-testid="login-submit"
            className="btn-primary w-full mt-6 py-3"
          >
            {submitting ? t('common.loading') : t('auth.submitLogin')}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="mt-6 text-sm text-ink-500 text-center">
            {t('auth.noAccount')}{' '}
            <Link to={`/${lng}/register`} className="text-brand-600 font-medium hover:underline">
              {t('auth.registerLink')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
