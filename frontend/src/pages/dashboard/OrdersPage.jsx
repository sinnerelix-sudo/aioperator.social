import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Instagram, ChevronDown, Eye } from 'lucide-react';
import { MOCK_ORDERS } from '../../lib/mockData';
import { formatPrice, formatDateTime } from '../../lib/utils';
import WhatsAppIcon from '../../components/orders/WhatsAppIcon.jsx';
import OrderContactModal from '../../components/orders/OrderContactModal.jsx';
import OrderDetailDrawer from '../../components/orders/OrderDetailDrawer.jsx';
import {
  STATUS_ORDER,
  STATUS_TONES,
  sortOrders,
  applyFilters,
  getCustomerFullName,
  resolvePlatformContact,
} from '../../lib/orderHelpers';

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const statuses = t('dashboard.orders.statuses', { returnObjects: true });

  // Status change is local-only (no backend Order model yet).
  const [orders, setOrders] = useState(() => MOCK_ORDERS);
  const [statusFilters, setStatusFilters] = useState(() => new Set());
  const [dateFilter, setDateFilter] = useState(null); // null | 'today' | 'week'
  const [contactOrder, setContactOrder] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [openStatusFor, setOpenStatusFor] = useState(null);

  const visibleOrders = useMemo(() => {
    return sortOrders(applyFilters(orders, statusFilters, dateFilter));
  }, [orders, statusFilters, dateFilter]);

  const toggleStatus = (s) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const clearAll = () => {
    setStatusFilters(new Set());
    setDateFilter(null);
  };

  const changeOrderStatus = (id, status) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    setOpenStatusFor(null);
  };

  const isEmpty = visibleOrders.length === 0;
  const filtersActive = statusFilters.size > 0 || dateFilter != null;

  return (
    <div data-testid="orders-page">
      {/* Header */}
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
          {t('dashboard.orders.title')}
        </h1>
        <p className="text-sm text-ink-500 mt-1">{t('dashboard.orders.subtitle')}</p>
      </div>

      {/* Filter bar */}
      <div className="mt-5 flex flex-wrap items-center gap-2" data-testid="orders-filter-bar">
        <button
          type="button"
          onClick={clearAll}
          data-testid="orders-filter-all"
          className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition ring-1
            ${!filtersActive
              ? 'bg-ink-900 text-white ring-ink-900'
              : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50'}`}
        >
          {t('dashboard.orders.filters.all')}
        </button>
        {STATUS_ORDER.map((s) => {
          const active = statusFilters.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              data-testid={`orders-filter-status-${s}`}
              className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition ring-1
                ${active
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50'}`}
            >
              {statuses[s]}
            </button>
          );
        })}
        <span className="w-px h-5 bg-ink-200 mx-1" aria-hidden />
        <button
          type="button"
          onClick={() => setDateFilter(dateFilter === 'today' ? null : 'today')}
          data-testid="orders-filter-today"
          className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition ring-1
            ${dateFilter === 'today'
              ? 'bg-emerald-600 text-white ring-emerald-600'
              : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50'}`}
        >
          {t('dashboard.orders.filters.today')}
        </button>
        <button
          type="button"
          onClick={() => setDateFilter(dateFilter === 'week' ? null : 'week')}
          data-testid="orders-filter-week"
          className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition ring-1
            ${dateFilter === 'week'
              ? 'bg-emerald-600 text-white ring-emerald-600'
              : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50'}`}
        >
          {t('dashboard.orders.filters.week')}
        </button>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div
          className="mt-6 p-10 bg-white border border-dashed border-ink-300 rounded-xl text-center"
          data-testid="orders-empty"
        >
          <p className="text-sm text-ink-500">{t('dashboard.orders.empty.filtered')}</p>
        </div>
      )}

      {/* Desktop table */}
      {!isEmpty && (
        <div className="mt-6 hidden md:block bg-white border border-ink-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed" data-testid="orders-table">
              <colgroup>
                <col style={{ width: '78px' }} />
                <col />
                <col />
                <col style={{ width: '82px' }} />
                <col style={{ width: '148px' }} />
                <col style={{ width: '92px' }} />
                <col style={{ width: '98px' }} />
                <col style={{ width: '116px' }} />
                <col style={{ width: '170px' }} />
              </colgroup>
              <thead className="bg-ink-50 text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.id')}</th>
                  <th className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.customer')}</th>
                  <th className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.product')}</th>
                  <th className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.price')}</th>
                  <th className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.platform')}</th>
                  <th className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.status')}</th>
                  <th className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.date')}</th>
                  <th className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.statusChange')}</th>
                  <th
                    className="text-left px-3 py-3 font-semibold sticky right-0 bg-ink-50 z-10 shadow-[inset_1px_0_0_0_rgba(0,0,0,0.06)]"
                  >
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {visibleOrders.map((o) => (
                  <OrderRow
                    key={o.id}
                    order={o}
                    statuses={statuses}
                    locale={i18n.language}
                    onOpenContact={() => setContactOrder(o)}
                    onOpenDetail={() => setDetailOrder(o)}
                    onChangeStatus={(s) => changeOrderStatus(o.id, s)}
                    openStatusMenu={openStatusFor === o.id}
                    setOpenStatusMenu={(v) => setOpenStatusFor(v ? o.id : null)}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile card layout */}
      {!isEmpty && (
        <div className="mt-6 md:hidden space-y-3" data-testid="orders-mobile-list">
          {visibleOrders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              statuses={statuses}
              locale={i18n.language}
              onOpenContact={() => setContactOrder(o)}
              onOpenDetail={() => setDetailOrder(o)}
              onChangeStatus={(s) => changeOrderStatus(o.id, s)}
              openStatusMenu={openStatusFor === o.id}
              setOpenStatusMenu={(v) => setOpenStatusFor(v ? o.id : null)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Modal & Drawer */}
      <OrderContactModal order={contactOrder} onClose={() => setContactOrder(null)} />
      <OrderDetailDrawer order={detailOrder} onClose={() => setDetailOrder(null)} />
    </div>
  );
}

/* -------------------------- Desktop table row -------------------------- */

function OrderRow({
  order, statuses, locale, onOpenContact, onOpenDetail, onChangeStatus,
  openStatusMenu, setOpenStatusMenu, t,
}) {
  const contact = resolvePlatformContact(order);
  const fullName = getCustomerFullName(order, t('dashboard.orders.unnamed'));
  const PlatformIcon = order.platform === 'instagram'
    ? () => <Instagram className="h-4 w-4 text-pink-600 shrink-0" />
    : () => <WhatsAppIcon className="h-4 w-4 shrink-0" />;

  return (
    <tr
      data-testid={`order-row-${order.id}`}
      className="hover:bg-ink-50/60 align-middle"
    >
      <td className="px-3 py-3 font-mono text-xs text-ink-700 whitespace-nowrap">{order.id}</td>
      <td className="px-3 py-3 text-ink-900">
        <span className="font-medium leading-snug break-words hyphens-auto" lang="az">{fullName}</span>
      </td>
      <td className="px-3 py-3 text-ink-700 leading-snug break-words">{order.product}</td>
      <td className="px-3 py-3 font-semibold text-ink-900 whitespace-nowrap tabular-nums">
        {formatPrice(order.price, locale)}
      </td>
      <td className="px-3 py-3 text-ink-700">
        <div className="flex items-center gap-2 min-w-0">
          <PlatformIcon />
          {contact.href ? (
            <a
              href={contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-ink-900 whitespace-nowrap tabular-nums truncate hover:underline"
              title={contact.label}
            >
              {contact.label}
            </a>
          ) : (
            <span className="text-xs text-ink-500 whitespace-nowrap">{contact.label}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${STATUS_TONES[order.status]}`}>
          {statuses[order.status]}
        </span>
      </td>
      <td className="px-3 py-3 text-xs text-ink-500 whitespace-nowrap">
        {formatDateTime(order.date, locale)}
      </td>
      <td className="px-3 py-3">
        <StatusChangeMenu
          current={order.status}
          statuses={statuses}
          open={openStatusMenu}
          setOpen={setOpenStatusMenu}
          onChange={onChangeStatus}
          orderId={order.id}
          t={t}
        />
      </td>
      <td className="px-3 py-3 sticky right-0 bg-white shadow-[inset_1px_0_0_0_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onOpenDetail}
            data-testid={`order-detail-btn-${order.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-700 bg-white hover:bg-ink-50"
          >
            <Eye className="h-3.5 w-3.5" />
            {t('dashboard.orders.actions.viewDetails')}
          </button>
          <button
            type="button"
            onClick={onOpenContact}
            data-testid={`order-contact-btn-${order.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-ink-900 text-white hover:bg-ink-700"
          >
            {t('dashboard.orders.actions.contact')}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ---------------------------- Mobile card ---------------------------- */

function OrderCard({
  order, statuses, locale, onOpenContact, onOpenDetail, onChangeStatus,
  openStatusMenu, setOpenStatusMenu, t,
}) {
  const contact = resolvePlatformContact(order);
  const fullName = getCustomerFullName(order, t('dashboard.orders.unnamed'));
  const PlatformIcon = order.platform === 'instagram'
    ? () => <Instagram className="h-4 w-4 text-pink-600 shrink-0" />
    : () => <WhatsAppIcon className="h-4 w-4 shrink-0" />;

  return (
    <div
      data-testid={`order-card-${order.id}`}
      className="bg-white border border-ink-200 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-ink-500">{order.id}</span>
            <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_TONES[order.status]}`}>
              {statuses[order.status]}
            </span>
          </div>
          <h3 className="font-display font-semibold text-base text-ink-900 mt-1 break-words">{fullName}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold text-ink-900 tabular-nums whitespace-nowrap">{formatPrice(order.price, locale)}</div>
          <div className="text-[11px] text-ink-500 whitespace-nowrap">{formatDateTime(order.date, locale)}</div>
        </div>
      </div>

      <div className="text-sm text-ink-700">{order.product}</div>

      <div className="flex items-center gap-2 text-xs min-w-0">
        <PlatformIcon />
        {contact.href ? (
          <a
            href={contact.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-900 whitespace-nowrap tabular-nums truncate"
          >
            {contact.label}
          </a>
        ) : (
          <span className="text-ink-500">{contact.label}</span>
        )}
      </div>

      <div className="pt-2 border-t border-ink-100 flex flex-wrap items-center gap-2">
        <StatusChangeMenu
          current={order.status}
          statuses={statuses}
          open={openStatusMenu}
          setOpen={setOpenStatusMenu}
          onChange={onChangeStatus}
          orderId={order.id}
          t={t}
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={onOpenDetail}
          data-testid={`order-detail-btn-mobile-${order.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-700 bg-white"
        >
          <Eye className="h-3.5 w-3.5" />
          {t('dashboard.orders.actions.viewDetails')}
        </button>
        <button
          type="button"
          onClick={onOpenContact}
          data-testid={`order-contact-btn-mobile-${order.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-ink-900 text-white"
        >
          {t('dashboard.orders.actions.contact')}
        </button>
      </div>
    </div>
  );
}

/* ------------------------ Status change menu ------------------------ */

function StatusChangeMenu({ current, statuses, open, setOpen, onChange, orderId, t }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, setOpen]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-testid={`order-status-change-${orderId}`}
        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-700 bg-white hover:bg-ink-50"
      >
        {t('dashboard.orders.actions.changeStatus')}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          className="absolute z-20 mt-1 left-0 w-44 rounded-lg bg-white shadow-lg ring-1 ring-ink-200 py-1"
          data-testid={`order-status-menu-${orderId}`}
        >
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              data-testid={`order-status-option-${orderId}-${s}`}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition
                ${s === current ? 'bg-ink-100 text-ink-900' : 'text-ink-700 hover:bg-ink-50'}`}
            >
              {statuses[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
