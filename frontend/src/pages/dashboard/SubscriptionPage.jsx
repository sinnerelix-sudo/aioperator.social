import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PLANS, formatPrice, formatDate, mockUsageForUser, formatNumber } from '../../lib/utils';
import { subscriptionApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { UsageBar } from '../../components/UsageBar';

export default function SubscriptionPage() {
  const { t, i18n } = useTranslation();
  const { user, subscription, refresh } = useAuth();
  const toast = useToast();
  const plans = t('pricing.plans', { returnObjects: true });

  const usage = mockUsageForUser(user?.id || '', subscription?.plan || 'instagram');

  // Recommend a higher plan if usage > 70%
  const currentIdx = PLANS.findIndex((p) => p.id === subscription?.plan);
  const usePercent = usage.limit ? (usage.used / usage.limit) * 100 : 0;
  const recommended = usePercent > 70 && currentIdx >= 0 && currentIdx < PLANS.length - 1
    ? PLANS[currentIdx + 1]
    : null;

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
        {t('dashboard.usage.title')}
      </h1>
      <p className="text-sm text-ink-500 mt-1">{t('dashboard.usage.subtitle')}</p>

      {/* Current plan summary */}
      <div className="mt-6 grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="bg-white border border-ink-200 rounded-xl p-5 sm:p-7">
          <UsageBar used={usage.used} limit={usage.limit} />
          <dl className="mt-6 grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-500 font-semibold">{t('dashboard.usage.used')}</dt>
              <dd className="mt-1 font-display font-semibold text-ink-900 text-lg">{formatNumber(usage.used, i18n.language)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-500 font-semibold">{t('dashboard.usage.remaining')}</dt>
              <dd className="mt-1 font-display font-semibold text-ink-900 text-lg">{formatNumber(usage.remaining, i18n.language)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink-500 font-semibold">{t('dashboard.usage.monthlyLimit')}</dt>
              <dd className="mt-1 font-display font-semibold text-ink-900 text-lg">{formatNumber(usage.limit, i18n.language)}</dd>
            </div>
            <div className="sm:col-span-3 pt-3 border-t border-ink-200">
              <dt className="text-xs uppercase tracking-wider text-ink-500 font-semibold">{t('dashboard.usage.renewalDate')}</dt>
              <dd className="mt-1 text-ink-900 font-medium">{formatDate(subscription?.expiresAt, i18n.language)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-brand-gradient rounded-xl p-5 sm:p-6 text-white" data-testid="subscription-current-card">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            {t('dashboard.usage.currentPlan')}
          </div>
          <div className="mt-1 font-display font-semibold text-2xl">{plans[subscription?.plan]?.name || '—'}</div>
          <div className="mt-2 text-xs text-white/80">{t('dashboard.usage.noticeTrial')}</div>
          {recommended && (
            <div className="mt-5 p-3 rounded-lg bg-white/15 backdrop-blur" data-testid="subscription-recommend">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                {t('dashboard.usage.recommendedPlan')}
              </div>
              <div className="mt-1 text-base font-semibold">{plans[recommended.id]?.name}</div>
              <button
                onClick={() => onSelect(recommended.id)}
                className="mt-2 text-xs font-medium px-3 py-1.5 rounded-md bg-white text-ink-900 hover:bg-ink-100 transition"
                data-testid="subscription-recommend-cta"
              >
                {t('dashboard.usage.upgrade')}
              </button>
            </div>
          )}
        </div>
      </div>

      <h2 className="mt-10 font-display font-semibold text-xl text-ink-900">{t('dashboard.subscription.upgrade')}</h2>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((p) => {
          const meta = plans[p.id];
          const active = subscription?.plan === p.id;
          return (
            <div
              key={p.id}
              data-testid={`subscription-plan-${p.id}`}
              className={`rounded-2xl border p-5 bg-white ${active ? 'border-brand-600/40 popular-glow' : 'border-ink-200'}`}
            >
              <h3 className="font-display font-semibold text-base text-ink-900">{meta.name}</h3>
              <p className="text-xs text-ink-500 mt-1">{meta.desc}</p>
              <div className="mt-3 font-display font-bold text-2xl text-ink-900">
                {formatPrice(p.price, i18n.language)}
                <span className="text-xs font-normal text-ink-500">{t('common.perMonth')}</span>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-brand-600">
                {formatNumber(p.messageLimit, i18n.language)} {i18n.language === 'tr' ? 'mesaj/ay' : 'mesaj/ay'}
              </div>
              <ul className="mt-3 space-y-1.5">
                {meta.features.slice(0, 5).map((f, i) => (
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
                  active ? 'bg-emerald-50 text-emerald-700 cursor-default' : 'bg-ink-900 text-white hover:bg-ink-700'
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
