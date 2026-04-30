import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Instagram, ChevronDown, Eye, TrendingUp, CalendarDays, CalendarRange, Receipt, Crown } from 'lucide-react';
import { MOCK_ORDERS } from '../../lib/mockData';
import { formatPrice, formatDateTime } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext.jsx';
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
  computeOrderKpis,
} from '../../lib/orderHelpers';

/**
 * Build a "view this product" link for a given product name.
 * Priority:
 *   1. Seller's public storefront (/{storeSlug}) — opens in new tab, has `#product-<slug>` anchor
 *   2. Dashboard products page (/<lng>/dashboard/products?q=<encoded>)
 */
function productHref(productName, { storeSlug, lng }) {
  const anchor = String(productName || '')
    .toLowerCase()
    .replace(/[^a-z0-9əıöüğşç]+/gi, '-')
    .replace(/^-|-$/g, '');
  if (storeSlug) {
    return { to: `/${storeSlug}${anchor ? `#product-${anchor}` : ''}`, external: true };
  }
  const q = productName ? `?q=${encodeURIComponent(productName)}` : '';
  return { to: `/${lng || 'az'}/dashboard/products${q}`, external: false };
}

/**
 * Reactively report whether the current viewport is considered mobile
 * (below Tailwind's `md` breakpoint = 768px). Used to conditionally render
 * the desktop table vs the mobile card layout so that only ONE set of
 * interactive elements (buttons, status-change portals, etc.) is mounted
 * at any given time — avoiding testID collisions and shared-state quirks.
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return isMobile;
}

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const statuses = t('dashboard.orders.statuses', { returnObjects: true });
  const productLinkCtx = { storeSlug: user?.storeSlug || '', lng: i18n.language };

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

  // KPIs are computed over ALL orders (not filtered ones) so the seller always
  // sees the true business picture independent of the filter state.
  const kpis = useMemo(() => computeOrderKpis(orders), [orders]);

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

      {/* KPI strip */}
      <KpiStrip kpis={kpis} locale={i18n.language} t={t} />

      {/* Filter bar */}
      <div className="mt-5 flex flex-wrap items-center gap-2" data-testid="orders-filter-bar">
        <button
          type="button"
          onClick={clearAll}
          data-testid="orders-filter-all"
          className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition ring-1 whitespace-nowrap
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
              className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition ring-1 whitespace-nowrap
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
          className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition ring-1 whitespace-nowrap
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
          className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition ring-1 whitespace-nowrap
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
      {!isEmpty && !isMobile && (
        <div className="mt-6 bg-white border border-ink-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm border-separate border-spacing-0"
              style={{ minWidth: '1180px' }}
              data-testid="orders-table"
            >
              <thead className="bg-ink-50 text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th style={{ width: '82px' }} className="text-left px-3 py-3 font-semibold whitespace-nowrap">{t('dashboard.orders.id')}</th>
                  <th style={{ minWidth: '140px' }} className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.customer')}</th>
                  <th style={{ minWidth: '150px' }} className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.product')}</th>
                  <th style={{ width: '88px' }} className="text-left px-3 py-3 font-semibold whitespace-nowrap">{t('dashboard.orders.price')}</th>
                  <th style={{ width: '230px' }} className="text-left px-3 py-3 font-semibold whitespace-nowrap">{t('dashboard.orders.platform')}</th>
                  <th style={{ width: '110px' }} className="text-left px-3 py-3 font-semibold">{t('dashboard.orders.status')}</th>
                  <th style={{ width: '132px' }} className="text-left px-3 py-3 font-semibold whitespace-nowrap">{t('dashboard.orders.date')}</th>
                  <th style={{ width: '150px' }} className="text-left px-3 py-3 font-semibold whitespace-nowrap">{t('dashboard.orders.statusChange')}</th>
                  <th
                    style={{ width: '180px' }}
                    className="text-left px-3 py-3 font-semibold sticky right-0 bg-ink-50 z-10 shadow-[inset_1px_0_0_0_rgba(0,0,0,0.06)] whitespace-nowrap"
                  >
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
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
                    productLinkCtx={productLinkCtx}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile card layout */}
      {!isEmpty && isMobile && (
        <div className="mt-6 space-y-3" data-testid="orders-mobile-list">
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
              productLinkCtx={productLinkCtx}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Modal & Drawer */}
      <OrderContactModal order={contactOrder} onClose={() => setContactOrder(null)} />
      <OrderDetailDrawer order={detailOrder} onClose={() => setDetailOrder(null)} productLinkCtx={productLinkCtx} />
    </div>
  );
}

/* -------------------------- KPI strip -------------------------- */

function KpiStrip({ kpis, locale, t }) {
  const noSales = kpis.today === 0 && kpis.week === 0 && kpis.month === 0;
  const items = [
    {
      key: 'today',
      icon: <CalendarDays className="h-4 w-4" />,
      label: t('dashboard.orders.kpis.today'),
      value: formatPrice(kpis.today, locale),
      bg: 'bg-gradient-to-br from-emerald-50 to-white',
      ring: 'ring-emerald-200',
      iconTone: 'text-emerald-700',
    },
    {
      key: 'week',
      icon: <CalendarRange className="h-4 w-4" />,
      label: t('dashboard.orders.kpis.week'),
      value: formatPrice(kpis.week, locale),
      bg: 'bg-gradient-to-br from-blue-50 to-white',
      ring: 'ring-blue-200',
      iconTone: 'text-blue-700',
    },
    {
      key: 'month',
      icon: <TrendingUp className="h-4 w-4" />,
      label: t('dashboard.orders.kpis.month'),
      value: formatPrice(kpis.month, locale),
      bg: 'bg-gradient-to-br from-violet-50 to-white',
      ring: 'ring-violet-200',
      iconTone: 'text-violet-700',
    },
    {
      key: 'aov',
      icon: <Receipt className="h-4 w-4" />,
      label: t('dashboard.orders.kpis.aov'),
      value: kpis.monthCount > 0 ? formatPrice(kpis.aov, locale) : '—',
      hint: kpis.monthCount > 0 ? t('dashboard.orders.kpis.aovHint', { count: kpis.monthCount }) : null,
      bg: 'bg-gradient-to-br from-amber-50 to-white',
      ring: 'ring-amber-200',
      iconTone: 'text-amber-700',
    },
    {
      key: 'topProduct',
      icon: <Crown className="h-4 w-4" />,
      label: t('dashboard.orders.kpis.topProduct'),
      value: kpis.topProduct || (noSales ? t('dashboard.orders.kpis.noSales') : '—'),
      hint: kpis.topProduct ? t('dashboard.orders.kpis.topProductHint', { count: kpis.topProductQty }) : null,
      bg: 'bg-gradient-to-br from-pink-50 to-white',
      ring: 'ring-pink-200',
      iconTone: 'text-pink-700',
      compact: true,
    },
  ];

  return (
    <div
      className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      data-testid="orders-kpi-strip"
    >
      {items.map((it) => (
        <div
          key={it.key}
          data-testid={`orders-kpi-${it.key}`}
          className={`relative overflow-hidden rounded-xl ring-1 p-3.5 ${it.bg} ${it.ring}`}
        >
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${it.iconTone}`}>
            {it.icon}
            <span className="truncate">{it.label}</span>
          </div>
          <div
            className={`mt-1.5 font-display font-semibold text-ink-900 ${it.compact ? 'text-base leading-tight' : 'text-xl tabular-nums'} break-words`}
            title={typeof it.value === 'string' ? it.value : undefined}
          >
            {it.value}
          </div>
          {it.hint && (
            <div className="mt-0.5 text-[10px] text-ink-500 truncate" title={it.hint}>{it.hint}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------------- Desktop table row -------------------------- */

function OrderRow({
  order, statuses, locale, onOpenContact, onOpenDetail, onChangeStatus,
  openStatusMenu, setOpenStatusMenu, productLinkCtx, t,
}) {
  const contact = resolvePlatformContact(order);
  const fullName = getCustomerFullName(order, t('dashboard.orders.unnamed'));
  const PlatformIcon = order.platform === 'instagram'
    ? () => <Instagram className="h-4 w-4 text-pink-600 shrink-0" />
    : () => <WhatsAppIcon className="h-4 w-4 shrink-0" />;
  const prodLink = productHref(order.product, productLinkCtx);
  const productLabel = t('dashboard.orders.openProduct');

  return (
    <tr
      data-testid={`order-row-${order.id}`}
      className="hover:bg-ink-50/40 align-middle border-t border-ink-100"
    >
      <td className="px-3 py-3 font-mono text-xs text-ink-700 whitespace-nowrap">{order.id}</td>
      <td className="px-3 py-3 text-ink-900">
        <span className="font-medium leading-snug break-words" lang="az">{fullName}</span>
      </td>
      <td className="px-3 py-3 text-ink-900 leading-snug">
        {prodLink.external ? (
          <a
            href={prodLink.to}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`order-product-link-${order.id}`}
            title={`${productLabel}: ${order.product}`}
            className="font-medium break-words hover:text-brand-700 hover:underline decoration-brand-400 underline-offset-2 line-clamp-2"
          >
            {order.product}
          </a>
        ) : (
          <Link
            to={prodLink.to}
            data-testid={`order-product-link-${order.id}`}
            title={`${productLabel}: ${order.product}`}
            className="font-medium break-words hover:text-brand-700 hover:underline decoration-brand-400 underline-offset-2 line-clamp-2"
          >
            {order.product}
          </Link>
        )}
      </td>
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
              className="text-xs font-medium text-ink-900 whitespace-nowrap tabular-nums hover:underline"
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
        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap ${STATUS_TONES[order.status]}`}>
          {statuses[order.status]}
        </span>
      </td>
      <td className="px-3 py-3 text-xs text-ink-500 whitespace-nowrap pr-5">
        {formatDateTime(order.date, locale)}
      </td>
      <td className="px-3 py-3 pl-1">
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
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-700 bg-white hover:bg-ink-50 whitespace-nowrap"
          >
            <Eye className="h-3.5 w-3.5" />
            {t('dashboard.orders.actions.viewDetails')}
          </button>
          <button
            type="button"
            onClick={onOpenContact}
            data-testid={`order-contact-btn-${order.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-ink-900 text-white hover:bg-ink-700 whitespace-nowrap"
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
  openStatusMenu, setOpenStatusMenu, productLinkCtx, t,
}) {
  const contact = resolvePlatformContact(order);
  const fullName = getCustomerFullName(order, t('dashboard.orders.unnamed'));
  const PlatformIcon = order.platform === 'instagram'
    ? () => <Instagram className="h-4 w-4 text-pink-600 shrink-0" />
    : () => <WhatsAppIcon className="h-4 w-4 shrink-0" />;
  const prodLink = productHref(order.product, productLinkCtx);

  const ProductLink = ({ children, className }) => prodLink.external ? (
    <a href={prodLink.to} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  ) : (
    <Link to={prodLink.to} className={className}>{children}</Link>
  );

  return (
    <div
      data-testid={`order-card-${order.id}`}
      className="bg-white border border-ink-200 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-ink-500">{order.id}</span>
            <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_TONES[order.status]}`}>
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

      <ProductLink
        className="block text-sm text-ink-900 font-medium hover:text-brand-700 hover:underline decoration-brand-400 underline-offset-2 break-words"
      >
        {order.product}
      </ProductLink>

      <div className="flex items-center gap-2 text-xs min-w-0">
        <PlatformIcon />
        {contact.href ? (
          <a
            href={contact.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-900 whitespace-nowrap tabular-nums"
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
          testIdPrefix="mobile-"
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
// Renders the dropdown in a portal attached to <body> with fixed positioning.
// This keeps the dropdown out of the <table> DOM, so it never expands row
// height, never gets clipped by overflow-x-auto, and flips up when there is
// not enough room below the button.

const STATUS_MENU_WIDTH = 184;
const STATUS_MENU_HEIGHT = 232; // 6 items × ~34px + 8px padding + tiny buffer

function StatusChangeMenu({ current, statuses, open, setOpen, onChange, orderId, testIdPrefix = '', t }) {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  // Compute position every time it opens + on scroll/resize while open.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return undefined; }

    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r || r.width === 0 || r.height === 0) { setPos(null); return; }
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const spaceBelow = vh - r.bottom;
      const spaceAbove = r.top;
      const flipUp = spaceBelow < STATUS_MENU_HEIGHT + 8 && spaceAbove > spaceBelow;
      const top = flipUp
        ? Math.max(8, r.top - STATUS_MENU_HEIGHT - 4)
        : Math.min(vh - STATUS_MENU_HEIGHT - 8, r.bottom + 4);
      // Prefer aligning to the button's left edge, but keep the menu within viewport.
      const rawLeft = r.left;
      const left = Math.max(8, Math.min(vw - STATUS_MENU_WIDTH - 8, rawLeft));
      setPos({ top, left, flipUp });
    };

    update();
    const onScroll = () => update();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  // Outside click + Escape to close.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const btn = btnRef.current;
      const menu = menuRef.current;
      if (btn && btn.contains(e.target)) return;
      if (menu && menu.contains(e.target)) return;
      setOpen(false);
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
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        data-testid={`order-status-change-${testIdPrefix}${orderId}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-700 bg-white hover:bg-ink-50 whitespace-nowrap"
      >
        <span>{t('dashboard.orders.actions.changeStatus')}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: STATUS_MENU_WIDTH }}
          className="z-[60] rounded-lg bg-white shadow-xl ring-1 ring-ink-200 py-1 animate-fade-in"
          data-testid={`order-status-menu-${testIdPrefix}${orderId}`}
        >
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setOpen(false); }}
              data-testid={`order-status-option-${testIdPrefix}${orderId}-${s}`}
              role="option"
              aria-selected={s === current}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition whitespace-nowrap
                ${s === current ? 'bg-ink-100 text-ink-900' : 'text-ink-700 hover:bg-ink-50'}`}
            >
              {statuses[s]}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
