import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, Mail, KeyRound } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useToast } from '../../context/ToastContext';

export default function AdminLoginPage() {
  const { t } = useTranslation();
  const { login } = useAdmin();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '', twoFactor: '' });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(form);
      toast.success(t('common.success'));
      navigate('/control-center-aio-2026/dashboard', { replace: true });
    } catch (err) {
      toast.error(t('admin.login.invalid'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink-900 text-white relative overflow-hidden" data-testid="admin-login-page">
      <div className="absolute inset-0 opacity-30" aria-hidden style={{
        backgroundImage:
          'radial-gradient(circle at 20% 0%, rgba(124,58,237,0.5) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(79,70,229,0.4) 0, transparent 50%)',
      }} />

      <div className="relative flex-1 flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md" data-testid="admin-login-form">
          <div className="flex items-center gap-2 mb-7">
            <div className="h-10 w-10 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">CONTROL CENTER</div>
              <div className="font-display font-semibold text-base">{t('admin.appName')}</div>
            </div>
          </div>

          <h1 className="font-display font-semibold text-3xl tracking-tight">
            {t('admin.login.title')}
          </h1>
          <p className="text-sm text-white/60 mt-1">{t('admin.login.subtitle')}</p>

          <div className="mt-8 space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5">
                {t('admin.login.email')}
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  data-testid="admin-email"
                  type="email"
                  className="w-full rounded-lg bg-white/5 border border-white/15 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                  value={form.email}
                  onChange={onChange('email')}
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5">
                {t('admin.login.password')}
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  data-testid="admin-password"
                  type="password"
                  className="w-full rounded-lg bg-white/5 border border-white/15 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                  value={form.password}
                  onChange={onChange('password')}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5">
                {t('admin.login.twoFactor')}
              </label>
              <div className="relative">
                <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  data-testid="admin-2fa"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="w-full rounded-lg bg-white/5 border border-white/15 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 font-mono tracking-widest"
                  value={form.twoFactor}
                  onChange={onChange('twoFactor')}
                  autoComplete="off"
                />
              </div>
              <p className="mt-1 text-[11px] text-white/40">{t('admin.login.twoFactorHint')}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            data-testid="admin-login-submit"
            className="mt-6 w-full bg-brand-gradient text-white font-medium rounded-lg px-5 py-3 hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? t('common.loading') : t('admin.login.submit')}
          </button>

          <div className="mt-6 text-[11px] text-white/40 text-center">
            {t('admin.login.shield')}
          </div>
        </form>
      </div>
      <footer className="relative px-6 py-4 text-[11px] text-white/30 text-center">
        © {new Date().getFullYear()} AI Operator · Internal use only
      </footer>
    </div>
  );
}
