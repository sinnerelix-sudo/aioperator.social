import { useTranslation } from 'react-i18next';
import { Instagram, MessageCircle } from 'lucide-react';
import { MOCK_ORDERS } from '../../lib/mockData';
import { formatPrice, formatDateTime } from '../../lib/utils';

const STATUS_TONES = {
  new: 'bg-slate-100 text-slate-700',
  confirmed: 'bg-blue-50 text-blue-700',
  preparing: 'bg-amber-50 text-amber-800',
  shipped: 'bg-violet-50 text-violet-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const statuses = t('dashboard.orders.statuses', { returnObjects: true });

  return (
    <div data-testid="orders-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
          {t('dashboard.orders.title')}
        </h1>
        <p className="text-sm text-ink-500 mt-1">{t('dashboard.orders.subtitle')}</p>
      </div>

      <div className="mt-6 bg-white border border-ink-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-ink-50 text-[11px] uppercase tracking-wider text-ink-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">{t('dashboard.orders.id')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('dashboard.orders.customer')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('dashboard.orders.product')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('dashboard.orders.price')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('dashboard.orders.platform')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('dashboard.orders.status')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('dashboard.orders.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {MOCK_ORDERS.map((o) => {
                const Channel = o.platform === 'instagram' ? Instagram : MessageCircle;
                return (
                  <tr key={o.id} data-testid={`order-row-${o.id}`} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-ink-700">{o.id}</td>
                    <td className="px-4 py-3 text-ink-900">{o.customer}</td>
                    <td className="px-4 py-3 text-ink-700">{o.product}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{formatPrice(o.price, i18n.language)}</td>
                    <td className="px-4 py-3 text-ink-700">
                      <span className="inline-flex items-center gap-1 capitalize">
                        <Channel className="h-3.5 w-3.5 text-ink-500" /> {o.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${STATUS_TONES[o.status]}`}>
                        {statuses[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                      {formatDateTime(o.date, i18n.language)}
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
