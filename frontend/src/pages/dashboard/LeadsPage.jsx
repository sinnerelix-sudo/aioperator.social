import { useTranslation } from 'react-i18next';
import { Instagram, MessageCircle, TrendingUp } from 'lucide-react';
import { MOCK_LEADS, LEAD_STAGES } from '../../lib/mockData';
import { formatPrice, formatDateTime } from '../../lib/utils';

export default function LeadsPage() {
  const { t, i18n } = useTranslation();
  const stages = t('dashboard.leads.stages', { returnObjects: true });
  const grouped = LEAD_STAGES.reduce((acc, s) => {
    acc[s] = MOCK_LEADS.filter((l) => l.stage === s);
    return acc;
  }, {});

  return (
    <div data-testid="leads-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
          {t('dashboard.leads.title')}
        </h1>
        <p className="text-sm text-ink-500 mt-1">{t('dashboard.leads.subtitle')}</p>
      </div>

      <div className="mt-6 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto pb-2">
        <div className="grid grid-flow-col auto-cols-[260px] sm:auto-cols-[280px] gap-3">
          {LEAD_STAGES.map((s) => (
            <div key={s} className="bg-ink-50/70 border border-ink-200 rounded-xl p-3 flex flex-col" data-testid={`lead-column-${s}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-700">
                  {stages[s]}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-ink-200 text-ink-500">
                  {grouped[s].length}
                </span>
              </div>
              <div className="space-y-2 flex-1 min-h-[80px]">
                {grouped[s].map((lead) => {
                  const Channel = lead.platform === 'instagram' ? Instagram : MessageCircle;
                  return (
                    <div
                      key={lead.id}
                      data-testid={`lead-card-${lead.id}`}
                      className="bg-white border border-ink-200 rounded-lg p-3 hover:border-brand-600/40 hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm text-ink-900 truncate">{lead.name}</div>
                        <Channel className="h-3.5 w-3.5 text-ink-500 shrink-0" />
                      </div>
                      <div className="text-xs text-ink-500 mt-1 truncate">{lead.product}</div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1 text-brand-600 font-semibold">
                          <TrendingUp className="h-3 w-3" />
                          {lead.score}
                        </span>
                        <span className="text-ink-700 font-medium">{formatPrice(lead.value, i18n.language)}</span>
                      </div>
                      <div className="mt-1.5 text-[10px] text-ink-500">
                        {formatDateTime(lead.lastActiveAt, i18n.language)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
