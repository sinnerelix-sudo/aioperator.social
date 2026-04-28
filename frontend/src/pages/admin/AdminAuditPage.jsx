import { useTranslation } from 'react-i18next';
import { MOCK_AUDIT_LOGS } from '../../lib/mockData';
import { formatDateTime } from '../../lib/utils';

export default function AdminAuditPage() {
  const { t, i18n } = useTranslation();
  const cols = t('admin.audit.columns', { returnObjects: true });
  const actions = t('admin.audit.actions', { returnObjects: true });
  const statuses = t('admin.audit.statuses', { returnObjects: true });

  return (
    <div className="text-white" data-testid="admin-audit-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">{t('admin.audit.title')}</h1>
        <p className="text-sm text-white/60 mt-1">{t('admin.audit.subtitle')}</p>
      </div>

      <div className="mt-6 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">{cols.actor}</th>
                <th className="text-left px-4 py-3 font-semibold">{cols.action}</th>
                <th className="text-left px-4 py-3 font-semibold">{cols.target}</th>
                <th className="text-left px-4 py-3 font-semibold">{cols.ip}</th>
                <th className="text-left px-4 py-3 font-semibold">{cols.at}</th>
                <th className="text-left px-4 py-3 font-semibold">{cols.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {MOCK_AUDIT_LOGS.map((l) => (
                <tr key={l.id} data-testid={`admin-audit-row-${l.id}`} className="hover:bg-white/5">
                  <td className="px-4 py-3 break-all">{l.actor}</td>
                  <td className="px-4 py-3">{actions[l.action] || l.action}</td>
                  <td className="px-4 py-3 text-white/70 font-mono text-xs">{l.target}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.ip}</td>
                  <td className="px-4 py-3 text-[11px] text-white/60 whitespace-nowrap">{formatDateTime(l.at, i18n.language)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${l.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                      {statuses[l.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
