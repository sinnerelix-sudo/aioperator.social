import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { PLANS, formatPrice, formatDate } from '../../lib/utils';
import { subscriptionApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Check } from 'lucide-react';

export default function SubscriptionPage() {
  const { t, i18n } = useTranslation();
  const { subscription, refresh } = useAuth();
  const toast = useToast();

  const plans = t('pricing.plans', { returnObjects: true });

  const onSelect = async (planId) => {
    try {
      await subscriptionApi.selectPlan(planId);
      toast.success(t('common.success'));
      await refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('errors.generic'));
    }
  };

  return (
    <div data-testid="subscription-page">
      <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
        {t('dashboard.subscription.title')}
      </h1>

      {subscription && (
        <div className="mt-6 rounded-2xl bg-brand-gradient text-white p-6 sm:p-8" data-testid="subscription-current">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            {t('dashboard.subscription.current')}
          </div>
          <div className="mt-1 font-display font-semibold text-2xl">
            {plans[subscription.plan]?.name || subscription.plan}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
            <div>
              <span className="text-white/60">{t('dashboard.subscription.botLimit')}:</span>{' '}
              <strong className="text-white">{subscription.botLimit}</strong>
            </div>
            <div>
              <span className="text-white/60">{t('dashboard.subscription.expiresAt')}:</span>{' '}
              <strong className="text-white">{formatDate(subscription.expiresAt, i18n.language)}</strong>
            </div>
            {subscription.isTrial && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/20 text-white tracking-wider">
                {t('dashboard.subscription.trial')}
              </span>
            )}
          </div>
          <div className="mt-4 text-xs text-white/80">
            {t('dashboard.subscription.noticeTrial')}
          </div>
        </div>
      )}

      <h2 className="mt-10 font-display font-semibold text-xl text-ink-900">{t('dashboard.subscription.upgrade')}</h2>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((p) => {
          const meta = plans[p.id];
          const active = subscription?.plan === p.id;
          return (
            <div
              key={p.id}
              data-testid={`subscription-plan-${p.id}`}
              className={`rounded-2xl border p-5 bg-white ${
                active ? 'border-brand-600/40 popular-glow' : 'border-ink-200'
              }`}
            >
              <h3 className="font-display font-semibold text-base text-ink-900">{meta.name}</h3>
              <p className="text-xs text-ink-500 mt-1">{meta.desc}</p>
              <div className="mt-3 font-display font-bold text-2xl text-ink-900">
                {formatPrice(p.price, i18n.language)}
                <span className="text-xs font-normal text-ink-500">{t('common.perMonth')}</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {meta.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-700">
                    <Check className="h-3.5 w-3.5 text-brand-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onSelect(p.id)}
                disabled={active}
                data-testid={`subscription-select-${p.id}`}
                className={`mt-4 w-full font-medium rounded-lg py-2 text-sm transition ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 cursor-default'
                    : 'bg-ink-900 text-white hover:bg-ink-700'
                }`}
              >
                {active ? t('dashboard.subscription.active') : t('common.selectPlan')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
