import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, Package, MessageSquare, Target, ShoppingBag, CreditCard, TrendingUp, ArrowRight, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { botsApi, productsApi, activitiesApi } from '../../lib/api';
import { formatNumber, getPlan } from '../../lib/utils';
import { MOCK_LEADS, MOCK_ORDERS } from '../../lib/mockData';
import { UsageBar } from '../../components/UsageBar';

export default function OverviewPage() {
  const { t, i18n } = useTranslation();
  const { lng = 'az' } = useParams();
  const { user, subscription } = useAuth();
  const [stats, setStats] = useState({ bots: 0, products: 0, activities: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [bots, products, acts] = await Promise.all([
          botsApi.list(),
          productsApi.list(),
          activitiesApi.list(5),
        ]);
        if (!cancel) {
          setStats({
            bots: bots.data.bots.length,
            products: products.data.products.length,
            activities: acts.data.activities,
          });
        }
      } catch (err) {
        console.error('overview load', err);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const usage = {
    used: subscription?.usedMessages ?? 129,
    limit: subscription?.monthlyMessageLimit ?? getPlan(subscription?.plan).messageLimit,
    remaining:
      (subscription?.monthlyMessageLimit ?? getPlan(subscription?.plan).messageLimit) -
      (subscription?.usedMessages ?? 129),
  };
  const plansT = t('pricing.plans', { returnObjects: true });

  const kpis = [
    { id: 'messagesUsed', icon: MessageSquare, value: formatNumber(usage.used, i18n.language), label: t('dashboard.overview.kpis.messagesUsed') },
    { id: 'messageLimit', icon: TrendingUp, value: formatNumber(usage.limit, i18n.language), label: t('dashboard.overview.kpis.messageLimit') },
    { id: 'messagesRemaining', icon: TrendingUp, value: formatNumber(usage.remaining, i18n.language), label: t('dashboard.overview.kpis.messagesRemaining') },
    { id: 'bots', icon: Bot, value: stats.bots, label: t('dashboard.overview.kpis.bots') },
    { id: 'leads', icon: Target, value: MOCK_LEADS.filter((l) => !['lost'].includes(l.stage)).length, label: t('dashboard.overview.kpis.leads') },
    { id: 'orders', icon: ShoppingBag, value: MOCK_ORDERS.length, label: t('dashboard.overview.kpis.orders') },
    { id: 'products', icon: Package, value: stats.products, label: t('dashboard.overview.kpis.products') || 'Məhsullar' },
    { id: 'plan', icon: CreditCard, value: plansT[subscription?.plan]?.name || '—', label: t('dashboard.overview.kpis.plan'), small: true },
  ];

  return (
    <div data-testid="overview-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
          {t('dashboard.overview.welcome', { name: user?.firstName || '' })}
        </h1>
        <p className="text-sm text-ink-500 mt-1">{t('dashboard.overview.subtitle')}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.id} data-testid={`kpi-${k.id}`} className="bg-white border border-ink-200 rounded-xl p-4 sm:p-5">
              <div className="h-9 w-9 rounded-lg bg-brand-gradient-soft flex items-center justify-center">
                <Icon className="h-4 w-4 text-brand-600" />
              </div>
              <div className={`mt-3 font-display font-semibold text-ink-900 ${k.small ? 'text-base sm:text-lg' : 'text-2xl sm:text-3xl'}`}>
                {k.value}
              </div>
              <div className="text-xs text-ink-500 mt-0.5">{k.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-ink-200 rounded-xl p-5 sm:p-6">
          <UsageBar used={usage.used} limit={usage.limit} />
          <Link
            to={`/${lng}/dashboard/subscription`}
            data-testid="overview-usage-link"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:underline"
          >
            {t('dashboard.usage.title')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="bg-brand-gradient rounded-xl p-5 sm:p-6 text-white" data-testid="overview-plan-card">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            {t('dashboard.subscription.current')}
          </div>
          <div className="mt-1 font-display font-semibold text-xl">
            {plansT[subscription?.plan]?.name || '—'}
          </div>
          <div className="mt-3 text-xs text-white/80">{t('dashboard.subscription.noticeTrial')}</div>
          <Link to={`/${lng}/dashboard/bots/new`} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white bg-white/15 hover:bg-white/25 transition px-3 py-2 rounded-lg" data-testid="overview-create-bot-link">
            <Plus className="h-4 w-4" />
            {t('dashboard.bots.createNew')}
          </Link>
        </div>
      </div>

      <div className="mt-8 bg-white border border-ink-200 rounded-xl p-5 sm:p-6">
        <h2 className="font-display font-semibold text-lg text-ink-900">{t('dashboard.activity.title')}</h2>
        {loading ? (
          <div className="mt-3 text-sm text-ink-500">{t('common.loading')}</div>
        ) : stats.activities.length === 0 ? (
          <div className="mt-3 text-sm text-ink-500">{t('dashboard.overview.noActivity')}</div>
        ) : (
          <ul className="mt-4 divide-y divide-ink-200">
            {stats.activities.map((a) => (
              <li key={a.id} className="py-3 flex items-start justify-between gap-4 text-sm">
                <span className="text-ink-700">{a.message}</span>
                <span className="text-xs text-ink-500 shrink-0">
                  {new Date(a.createdAt).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'az-AZ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
