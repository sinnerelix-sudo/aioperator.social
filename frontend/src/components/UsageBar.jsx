import { useTranslation } from 'react-i18next';
import { formatNumber } from '../lib/utils';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export function UsageBar({ used, limit, compact = false }) {
  const { t, i18n } = useTranslation();
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const remainingPercent = Math.max(0, 100 - percent);
  const tone = percent >= 95 ? 'critical' : percent >= 80 ? 'warning' : 'ok';

  const barColor =
    tone === 'critical' ? 'bg-red-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-brand-gradient';

  return (
    <div data-testid="usage-bar" className={compact ? '' : 'space-y-3'}>
      {!compact && (
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-base text-ink-900">
              {t('dashboard.usage.barTitle')}
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              {t('dashboard.usage.barSubtitle', {
                used: formatNumber(used, i18n.language),
                limit: formatNumber(limit, i18n.language),
              })}
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-xs font-semibold mb-1">
        <span className="text-ink-700" data-testid="usage-percent">
          {t('dashboard.usage.percentUsed')}: {percent.toFixed(2)}%
        </span>
        <span className="text-ink-500">
          {t('dashboard.usage.percentLeft')}: {remainingPercent.toFixed(2)}%
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-ink-100 overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full ${barColor} transition-all duration-700`}
          style={{ width: `${percent}%` }}
          data-testid="usage-bar-fill"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-ink-500 mt-1">
        <span>{formatNumber(used, i18n.language)} / {formatNumber(limit, i18n.language)} {i18n.language === 'tr' ? 'mesaj' : 'mesaj'}</span>
        <span className="text-ink-700 font-medium">
          {formatNumber(Math.max(0, limit - used), i18n.language)} {i18n.language === 'tr' ? 'kaldı' : 'qaldı'}
        </span>
      </div>

      {tone !== 'ok' && (
        <div
          data-testid={`usage-warning-${tone}`}
          className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
            tone === 'critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
          }`}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {tone === 'critical'
              ? t('dashboard.usage.warningCritical')
              : t('dashboard.usage.warningHigh')}
          </span>
        </div>
      )}

      {tone === 'ok' && !compact && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Sağlam istifadə</span>
        </div>
      )}
    </div>
  );
}
