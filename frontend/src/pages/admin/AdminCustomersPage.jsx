import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Eye } from 'lucide-react';
import { MOCK_CUSTOMERS } from '../../lib/mockData';
import { formatNumber, formatPrice, formatDateTime } from '../../lib/utils';

const STATUS_TONE = {
  active: 'bg-emerald-500/20 text-emerald-300',
  trial: 'bg-blue-500/20 text-blue-300',
  inactive: 'bg-white/10 text-white/60',
  suspended: 'bg-red-500/20 text-red-300',
};

const RISK_TONE = {
  normal: 'bg-emerald-500/20 text-emerald-300',
  medium: 'bg-amber-500/20 text-amber-300',
  high: 'bg-orange-500/20 text-orange-300',
  critical: 'bg-red-500/20 text-red-300',
};

export default function AdminCustomersPage() {
  const { t, i18n } = useTranslation();
  const cols = t('admin.customers.columns', { returnObjects: true });
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const customers = MOCK_CUSTOMERS.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${c.firstName} ${c.lastName} ${c.company} ${c.email}`.toLowerCase().includes(q);
    const matchPlan = !planFilter || c.plan === planFilter;
    return matchSearch && matchPlan;
  });

  return (
    <div className="text-white" data-testid="admin-customers-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">{t('admin.customers.title')}</h1>
        <p className="text-sm text-white/60 mt-1">{t('admin.customers.subtitle')}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            data-testid="admin-customers-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.customers.search')}
            className="w-full rounded-lg bg-white/5 border border-white/15 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          data-testid="admin-customers-plan-filter"
          className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-white"
        >
          <option value="">{t('common.all')}</option>
          <option value="instagram">Instagram</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="combo">Combo</option>
          <option value="business">Business</option>
        </select>
      </div>

      <div className="mt-4 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{cols.name}</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{cols.company}</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{cols.plan}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.bots}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.messageLimit}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.messagesUsed}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.messagesRemaining}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.tokens}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.cost}</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{cols.status}</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">{cols.lastActive}</th>
                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">{cols.view}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {customers.map((c) => (
                <tr key={c.id} data-testid={`admin-customer-row-${c.id}`} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{c.firstName} {c.lastName}</td>
                  <td className="px-4 py-3 text-white/70 whitespace-nowrap">{c.company}</td>
                  <td className="px-4 py-3 capitalize whitespace-nowrap">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${RISK_TONE[c.risk] || ''}`}>{c.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{c.bots}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(c.messageLimit, i18n.language)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatNumber(c.messagesUsed, i18n.language)}</td>
                  <td className="px-4 py-3 text-right text-white/60">{formatNumber(c.messageLimit - c.messagesUsed, i18n.language)}</td>
                  <td className="px-4 py-3 text-right text-white/60">{formatNumber(c.estimatedTokens, i18n.language)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-300">${c.estimatedCost.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full capitalize ${STATUS_TONE[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/50 whitespace-nowrap">{formatDateTime(c.lastActiveAt, i18n.language)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/control-center-aio-2026/dashboard/customers/${c.id}`}
                      data-testid={`admin-customer-view-${c.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-300 hover:text-brand-200"
                    >
                      <Eye className="h-3 w-3" />
                      {cols.view}
                    </Link>
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
