import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PLANS, formatPrice } from '../lib/utils';

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { lng = 'az' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const toast = useToast();

  const initialPlan = params.get('plan') || 'instagram';
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    plan: PLANS.find((p) => p.id === initialPlan) ? initialPlan : 'instagram',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(`/${lng}/dashboard`, { replace: true });
  }, [isAuthenticated, lng, navigate]);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password) {
      toast.error(t('auth.errors.required'));
      return;
    }
    if (form.password.length < 6) {
      toast.error(t('auth.errors.password'));
      return;
    }
    setSubmitting(true);
    try {
      await register({ ...form, locale: i18n.language });
      toast.success(t('auth.success.register'));
      navigate(`/${lng}/dashboard`, { replace: true });
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'email_exists') toast.error(t('auth.errors.emailExists'));
      else toast.error(err?.response?.data?.message || t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const plans = t('pricing.plans', { returnObjects: true });
  const planMeta = PLANS.find((p) => p.id === form.plan);

  return (
    <div className="min-h-screen bg-ink-50 grid lg:grid-cols-2" data-testid="register-page">
      <div className="hidden lg:flex flex-col justify-between bg-brand-gradient p-12 text-white relative overflow-hidden">
        <Link to={`/${lng}`} className="flex items-center gap-2 relative z-10">
          <span className="h-9 w-9 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display font-semibold text-lg">{t('common.appName')}</span>
        </Link>
        <div className="relative z-10">
          <h2 className="font-display font-semibold text-4xl tracking-tight leading-tight">
            {t('auth.registerSubtitle')}
          </h2>
          <p className="mt-4 text-white/80 max-w-md">{t('hero.subtitle')}</p>
        </div>
        <div className="relative z-10 text-xs text-white/60">© {new Date().getFullYear()} {t('common.appName')}</div>
        <div
          className="absolute inset-0 opacity-30"
          aria-hidden
          style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, white 0, transparent 40%)' }}
        />
      </div>

      <div className="flex flex-col">
        <div className="px-6 sm:px-10 py-6 flex items-center justify-between border-b border-ink-200 lg:hidden">
          <Link to={`/${lng}`} className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="font-display font-semibold text-ink-900">{t('common.appName')}</span>
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <form onSubmit={onSubmit} className="w-full max-w-md" data-testid="register-form">
            <h1 className="font-display font-semibold text-3xl tracking-tight text-ink-900">
              {t('auth.registerTitle')}
            </h1>
            <p className="text-sm text-ink-500 mt-1">{t('auth.registerSubtitle')}</p>

            <div className="grid grid-cols-2 gap-3 mt-7">
              <div>
                <label className="label-base">{t('auth.firstName')}</label>
                <input
                  data-testid="register-firstName"
                  className="input-base"
                  value={form.firstName}
                  onChange={onChange('firstName')}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="label-base">{t('auth.lastName')}</label>
                <input
                  data-testid="register-lastName"
                  className="input-base"
                  value={form.lastName}
                  onChange={onChange('lastName')}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="label-base">{t('auth.email')}</label>
              <input
                data-testid="register-email"
                type="email"
                className="input-base"
                value={form.email}
                onChange={onChange('email')}
                autoComplete="email"
              />
            </div>
            <div className="mt-3">
              <label className="label-base">{t('auth.phone')}</label>
              <input
                data-testid="register-phone"
                className="input-base"
                value={form.phone}
                onChange={onChange('phone')}
                placeholder="+994 50 000 00 00"
                autoComplete="tel"
              />
            </div>
            <div className="mt-3">
              <label className="label-base">{t('auth.password')}</label>
              <input
                data-testid="register-password"
                type="password"
                className="input-base"
                value={form.password}
                onChange={onChange('password')}
                autoComplete="new-password"
              />
            </div>
            <div className="mt-3">
              <label className="label-base">{t('auth.selectedPlan')}</label>
              <select
                data-testid="register-plan"
                className="input-base"
                value={form.plan}
                onChange={onChange('plan')}
              >
                {PLANS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {plans[p.id].name} — {formatPrice(p.price, i18n.language)}
                  </option>
                ))}
              </select>
              {planMeta && (
                <div className="mt-2 text-xs text-ink-500">
                  {plans[planMeta.id].desc} · {planMeta.botLimit} bot
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="register-submit"
              className="btn-primary w-full mt-6 py-3"
            >
              {submitting ? t('common.loading') : t('auth.submitRegister')}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>

            <p className="mt-6 text-sm text-ink-500 text-center">
              {t('auth.haveAccount')}{' '}
              <Link to={`/${lng}/login`} className="text-brand-600 font-medium hover:underline" data-testid="register-login-link">
                {t('auth.loginLink')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
