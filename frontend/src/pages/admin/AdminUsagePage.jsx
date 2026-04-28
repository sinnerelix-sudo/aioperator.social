import { useTranslation } from 'react-i18next';
import { MOCK_CUSTOMERS } from '../../lib/mockData';
import { formatNumber } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

const RISK_TONE = {
  normal: 'bg-emerald-500/20 text-emerald-300',
  medium: 'bg-amber-500/20 text-amber-300',
  high: 'bg-orange-500/20 text-orange-300',
  critical: 'bg-red-500/20 text-red-300',
};

function classifyRisk(c) {
  const pct = (c.messagesUsed / c.messageLimit) * 100;
  if (pct >= 95) return 'critical';
  if (pct >= 80) return 'high';
  if (pct >= 60) return 'medium';
  return 'normal';
}

function recommendedPlan(c) {
  const pct = (c.messagesUsed / c.messageLimit) * 100;
  if (pct < 70) return c.plan;
  if (c.plan === 'instagram' || c.plan === 'whatsapp') return 'combo';
  if (c.plan === 'combo') return 'business';
  return 'business+';
}

export default function AdminUsagePage() {
  const { t, i18n } = useTranslation();
  const cols = t('admin.usage.columns', { returnObjects: true });
  const risks = t('admin.usage.risks', { returnObjects: true });
  const toast = useToast();

  return (
    <div className="text-white" data-testid="admin-usage-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">{t('admin.usage.title')}</h1>
        <p className="text-sm text-white/60 mt-1">{t('admin.usage.subtitle')}</p>
      </div>

      <div className="mt-6 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{cols.customer}</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{cols.plan}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.messageLimit}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.messagesUsed}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.messagesRemaining}</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{cols.percent}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.tokens}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.cost}</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{cols.risk}</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{cols.recommended}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.custom}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {MOCK_CUSTOMERS.map((c) => {
                const risk = classifyRisk(c);
                const pct = (c.messagesUsed / c.messageLimit) * 100;
                const rec = recommendedPlan(c);
                return (
                  <tr key={c.id} data-testid={`admin-usage-row-${c.id}`} className="hover:bg-white/5">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-[11px] text-white/50">{c.company}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{c.plan}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(c.messageLimit, i18n.language)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(c.messagesUsed, i18n.language)}</td>
                    <td className="px-4 py-3 text-right text-white/60">{formatNumber(c.messageLimit - c.messagesUsed, i18n.language)}</td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-white/70">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-white/70">{formatNumber(c.estimatedTokens, i18n.language)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-300">${c.estimatedCost.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${RISK_TONE[risk]}`}>
                        {risks[risk]}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {rec !== c.plan ? (
                        <span className="text-brand-300 font-semibold">{rec}</span>
                      ) : (
                        <span className="text-white/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toast.info(t('admin.usage.setCustom'))}
                        data-testid={`admin-usage-custom-${c.id}`}
                        className="text-[11px] font-semibold text-brand-300 hover:text-brand-200"
                      >
                        {t('admin.usage.setCustom')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
