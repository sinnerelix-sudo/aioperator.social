import { useTranslation } from 'react-i18next';
import { Users, UserCheck, Sparkles, MessageSquare, Cpu, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  aggregateAdminStats,
  MOCK_CUSTOMERS,
  MOCK_REVENUE_TIMELINE,
  MOCK_USAGE_TIMELINE,
} from '../../lib/mockData';
import { formatNumber, formatPrice } from '../../lib/utils';

export default function AdminOverviewPage() {
  const { t, i18n } = useTranslation();
  const stats = aggregateAdminStats();

  const kpis = [
    { id: 'totalCustomers', icon: Users, value: formatNumber(stats.totalCustomers, i18n.language), label: t('admin.overview.kpis.totalCustomers') },
    { id: 'activeCustomers', icon: UserCheck, value: formatNumber(stats.activeCustomers, i18n.language), label: t('admin.overview.kpis.activeCustomers'), tone: 'emerald' },
    { id: 'trialCustomers', icon: Sparkles, value: formatNumber(stats.trialCustomers, i18n.language), label: t('admin.overview.kpis.trialCustomers') },
    { id: 'totalMessages', icon: MessageSquare, value: formatNumber(stats.totalMessages, i18n.language), label: t('admin.overview.kpis.totalMessages') },
    { id: 'totalTokens', icon: Cpu, value: formatNumber(stats.totalTokens, i18n.language), label: t('admin.overview.kpis.totalTokens') },
    { id: 'estimatedCost', icon: DollarSign, value: `$${formatNumber(stats.estimatedCost, i18n.language)}`, label: t('admin.overview.kpis.estimatedCost'), tone: 'amber' },
    { id: 'monthlyRevenue', icon: TrendingUp, value: formatPrice(stats.monthlyRevenue, i18n.language), label: t('admin.overview.kpis.monthlyRevenue'), tone: 'brand' },
  ];

  const top = [...MOCK_CUSTOMERS].sort((a, b) => b.estimatedCost - a.estimatedCost).slice(0, 5);
  const atRisk = MOCK_CUSTOMERS.filter((c) => c.risk === 'critical' || c.risk === 'high');
  const planDistribution = MOCK_CUSTOMERS.reduce((acc, c) => {
    acc[c.plan] = (acc[c.plan] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="text-white space-y-8" data-testid="admin-overview-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">{t('admin.overview.title')}</h1>
        <p className="text-sm text-white/60 mt-1">{t('admin.overview.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const tone =
            k.tone === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/5' :
            k.tone === 'amber' ? 'border-amber-500/30 bg-amber-500/5' :
            k.tone === 'brand' ? 'border-brand-500/30 bg-brand-500/5' : 'border-white/10 bg-white/5';
          return (
            <div key={k.id} data-testid={`admin-kpi-${k.id}`} className={`rounded-xl border ${tone} p-4 sm:p-5`}>
              <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="mt-3 font-display font-semibold text-2xl">{k.value}</div>
              <div className="text-xs text-white/60 mt-1">{k.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6">
          <h2 className="font-display font-semibold text-base">{t('admin.overview.revenueChart')}</h2>
          <SimpleBarChart data={MOCK_REVENUE_TIMELINE.map((m) => ({ label: m.month, value: m.revenue }))} unit="₼" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6">
          <h2 className="font-display font-semibold text-base">{t('admin.overview.usageChart')}</h2>
          <SimpleBarChart
            data={MOCK_USAGE_TIMELINE.map((m) => ({ label: m.month, value: m.messages }))}
            unit=" msg"
            colorClass="bg-emerald-500"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6">
          <h2 className="font-display font-semibold text-base">{t('admin.overview.topCustomers')}</h2>
          <ul className="mt-3 divide-y divide-white/10">
            {top.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.firstName} {c.lastName}</div>
                  <div className="text-[11px] text-white/50">{c.company}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${c.estimatedCost.toFixed(2)}</div>
                  <div className="text-[11px] text-white/50">{formatNumber(c.estimatedTokens, i18n.language)} tokens</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6">
          <h2 className="font-display font-semibold text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            {t('admin.overview.atRiskCustomers')}
          </h2>
          {atRisk.length === 0 ? (
            <div className="mt-3 text-sm text-white/50">—</div>
          ) : (
            <ul className="mt-3 divide-y divide-white/10">
              {atRisk.map((c) => {
                const pct = (c.messagesUsed / c.messageLimit) * 100;
                return (
                  <li key={c.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                    <div>
                      <div className="font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-[11px] text-white/50">{c.company} · {c.plan}</div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${pct >= 95 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {pct.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6">
        <h2 className="font-display font-semibold text-base">{t('admin.overview.planDistribution')}</h2>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['instagram', 'whatsapp', 'combo', 'business'].map((p) => (
            <div key={p} className="rounded-lg border border-white/10 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">{p}</div>
              <div className="font-display font-semibold text-2xl mt-1">{planDistribution[p] || 0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimpleBarChart({ data, unit = '', colorClass = 'bg-brand-500' }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="mt-5 flex items-end gap-3 h-44">
      {data.map((d) => {
        const h = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
            <div className="text-[10px] text-white/60 font-medium">{d.value.toLocaleString()}{unit}</div>
            <div className="w-full bg-white/5 rounded-t-md relative" style={{ height: `${h}%`, minHeight: 4 }}>
              <div className={`absolute inset-0 rounded-t-md ${colorClass} opacity-90`} />
            </div>
            <div className="text-[11px] text-white/60">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}
