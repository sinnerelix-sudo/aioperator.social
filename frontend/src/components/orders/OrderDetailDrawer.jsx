import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Instagram, Phone, X, MapPin, ExternalLink, ArrowUpRight } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon.jsx';
import {
  getCustomerFullName,
  formatPhoneDisplay,
  normaliseInstagramHandle,
  buildInstagramLink,
  buildTelLink,
  buildWhatsAppLink,
} from '../../lib/orderHelpers';
import { formatPrice, formatDateTime } from '../../lib/utils';

const TABS = ['messages', 'order', 'contact', 'address'];

export default function OrderDetailDrawer({ order, onClose, productLinkCtx }) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('messages');

  useEffect(() => {
    if (order) setTab('messages');
  }, [order?.id]);

  useEffect(() => {
    if (!order) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  const statuses = t('dashboard.orders.statuses', { returnObjects: true });
  const tabLabels = t('dashboard.orders.drawerTabs', { returnObjects: true });

  const fullName = useMemo(
    () => (order ? getCustomerFullName(order, t('dashboard.orders.unnamed')) : ''),
    [order, t],
  );

  if (!order) return null;

  const igHandle = normaliseInstagramHandle(order.instagramHandle);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in"
      onClick={onClose}
      data-testid="order-detail-drawer"
    >
      <div className="flex-1 bg-ink-900/40 backdrop-blur-sm" />
      <aside
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-ink-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-ink-200 flex items-start justify-between bg-ink-50/70">
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-lg text-ink-900 truncate">{fullName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-ink-500">{order.id}</span>
              <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white ring-1 ring-ink-200 text-ink-700">
                {statuses[order.status] || order.status}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
            data-testid="order-detail-drawer-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 border-b border-ink-200 flex gap-1 overflow-x-auto">
          {TABS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              data-testid={`order-detail-tab-${k}`}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition
                ${tab === k
                  ? 'text-ink-900 border-b-2 border-brand-600'
                  : 'text-ink-500 hover:text-ink-900 border-b-2 border-transparent'}`}
            >
              {tabLabels[k]}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'messages' && (
            <MessagesTab order={order} locale={i18n.language} emptyLabel={t('dashboard.orders.empty.messages')} />
          )}
          {tab === 'order' && <OrderTab order={order} locale={i18n.language} t={t} productLinkCtx={productLinkCtx} />}
          {tab === 'contact' && (
            <ContactTab order={order} t={t} igHandle={igHandle} emptyLabel={t('dashboard.orders.empty.contact')} />
          )}
          {tab === 'address' && <AddressTab order={order} t={t} />}
        </div>
      </aside>
    </div>
  );
}

function MessagesTab({ order, locale, emptyLabel }) {
  const msgs = Array.isArray(order.messages) ? order.messages : [];
  if (!msgs.length) {
    return <p className="text-sm text-ink-500 text-center py-10">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-col gap-3" data-testid="order-detail-messages">
      {msgs.map((m, i) => {
        const mine = m.from === 'bot';
        return (
          <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap
              ${mine
                ? 'bg-brand-600 text-white rounded-br-md'
                : 'bg-ink-100 text-ink-900 rounded-bl-md'}`}>
              <div>{m.text}</div>
              {m.at && (
                <div className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-ink-500'}`}>
                  {formatDateTime(m.at, locale)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderTab({ order, locale, t, productLinkCtx }) {
  const statuses = t('dashboard.orders.statuses', { returnObjects: true });
  const empty = t('dashboard.orders.empty.field');

  // Build product link (same logic as in OrdersPage).
  const buildProductLink = () => {
    const ctx = productLinkCtx || { storeSlug: '', lng: locale };
    const anchor = String(order.product || '')
      .toLowerCase()
      .replace(/[^a-z0-9əıöüğşç]+/gi, '-')
      .replace(/^-|-$/g, '');
    if (ctx.storeSlug) {
      return { to: `/${ctx.storeSlug}${anchor ? `#product-${anchor}` : ''}`, external: true };
    }
    const q = order.product ? `?q=${encodeURIComponent(order.product)}` : '';
    return { to: `/${ctx.lng || 'az'}/dashboard/products${q}`, external: false };
  };
  const prodLink = buildProductLink();
  const productNode = prodLink.external ? (
    <a
      href={prodLink.to}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1 font-medium text-brand-700 underline decoration-brand-300 decoration-1 underline-offset-2 hover:text-brand-800 hover:decoration-brand-600 break-words"
      title={t('dashboard.orders.openProduct')}
      data-testid="order-detail-product-link"
    >
      <span className="break-words">{order.product}</span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-brand-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  ) : (
    <Link
      to={prodLink.to}
      className="group inline-flex items-center gap-1 font-medium text-brand-700 underline decoration-brand-300 decoration-1 underline-offset-2 hover:text-brand-800 hover:decoration-brand-600 break-words"
      title={t('dashboard.orders.openProduct')}
      data-testid="order-detail-product-link"
    >
      <span className="break-words">{order.product}</span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-brand-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );

  const rows = [
    [t('dashboard.orders.id'), <span className="font-mono text-xs text-ink-700">{order.id}</span>, 'mono'],
    [t('dashboard.orders.product'), productNode, 'product'],
    [t('dashboard.orders.price'), formatPrice(order.price, locale)],
    [t('dashboard.orders.fields.quantity'), order.quantity],
    [t('dashboard.orders.status'), statuses[order.status]],
    [t('dashboard.orders.platform'), order.platform === 'instagram' ? 'Instagram' : 'WhatsApp'],
    [t('dashboard.orders.date'), order.date ? formatDateTime(order.date, locale) : null],
    [t('dashboard.orders.fields.size'), order.size],
    [t('dashboard.orders.fields.color'), order.color],
    [t('dashboard.orders.fields.variant'), order.variant],
    [t('dashboard.orders.fields.discount'), order.discount != null && order.discount !== '' ? `${order.discount}%` : null],
    [t('dashboard.orders.fields.total'), order.total != null ? formatPrice(order.total, locale) : null],
    [t('dashboard.orders.fields.note'), order.note, 'note'],
  ];

  return (
    <div
      className="rounded-xl border border-ink-200 bg-white divide-y divide-ink-100"
      data-testid="order-detail-order"
    >
      {rows.map(([label, value, kind]) => {
        const isLongForm = kind === 'note' || kind === 'product';
        const rendered = value == null || value === ''
          ? <span className="text-ink-400 font-normal">{empty}</span>
          : value;
        return (
          <div key={label} className={`px-4 py-2.5 ${isLongForm ? 'flex flex-col gap-1' : 'flex items-center justify-between gap-4'}`}>
            <dt className="text-[11px] uppercase tracking-wider text-ink-500 shrink-0">{label}</dt>
            <dd className={`text-sm text-ink-900 font-medium break-words ${isLongForm ? '' : 'text-right'}`}>
              {rendered}
            </dd>
          </div>
        );
      })}
    </div>
  );
}

function ContactTab({ order, t, igHandle, emptyLabel }) {
  const igHref = buildInstagramLink(igHandle);
  const waHref = buildWhatsAppLink(order.whatsappNumber);
  const telHref = buildTelLink(order.phone) || buildTelLink(order.whatsappNumber);
  const items = [];
  if (igHandle) items.push({ key: 'ig', icon: <Instagram className="h-4 w-4" />, label: `@${igHandle}`, href: igHref, tone: 'text-pink-600' });
  if (order.whatsappNumber) items.push({ key: 'wa', icon: <WhatsAppIcon className="h-4 w-4" />, label: formatPhoneDisplay(order.whatsappNumber), href: waHref, tone: 'text-emerald-600' });
  if (order.phone) items.push({ key: 'tel', icon: <Phone className="h-4 w-4" />, label: formatPhoneDisplay(order.phone), href: telHref, tone: 'text-ink-700' });

  if (!items.length) {
    return <p className="text-sm text-ink-500 text-center py-10">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-col gap-3" data-testid="order-detail-contact">
      {items.map((it) => (
        <div key={it.key} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-ink-200 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`shrink-0 ${it.tone}`}>{it.icon}</span>
            <span className="text-sm text-ink-900 font-medium whitespace-nowrap truncate">{it.label}</span>
          </div>
          <a
            href={it.href || undefined}
            target={it.key === 'tel' ? undefined : '_blank'}
            rel="noopener noreferrer"
            aria-disabled={!it.href}
            onClick={(e) => { if (!it.href) e.preventDefault(); }}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition
              ${it.href
                ? 'bg-ink-900 text-white hover:bg-ink-700'
                : 'bg-ink-100 text-ink-500 cursor-not-allowed'}`}
          >
            {t('dashboard.orders.actions.contact')}
          </a>
        </div>
      ))}
    </div>
  );
}

function AddressTab({ order, t }) {
  const addr = order.deliveryAddress;
  if (!addr) {
    return <p className="text-sm text-ink-500 text-center py-10">{t('dashboard.orders.empty.address')}</p>;
  }
  const mapUrl = addr.lat != null && addr.lng != null
    ? `https://www.google.com/maps?q=${addr.lat},${addr.lng}`
    : null;
  const rows = [
    [t('dashboard.orders.addressFields.fullName'), addr.fullName],
    [t('dashboard.orders.addressFields.phone'), formatPhoneDisplay(addr.phone)],
    [t('dashboard.orders.addressFields.city'), addr.city],
    [t('dashboard.orders.addressFields.district'), addr.district],
    [t('dashboard.orders.addressFields.street'), addr.street],
    [t('dashboard.orders.addressFields.building'), addr.building],
    [t('dashboard.orders.addressFields.note'), addr.note],
  ];
  const empty = t('dashboard.orders.empty.field');
  return (
    <div className="space-y-4" data-testid="order-detail-address">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="border-b border-ink-100 pb-2">
            <dt className="text-[11px] uppercase tracking-wider text-ink-500">{label}</dt>
            <dd className="text-sm text-ink-900 mt-0.5 font-medium break-words">
              {value || <span className="text-ink-400 font-normal">{empty}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {addr.lat != null && addr.lng != null && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-ink-200 bg-ink-50">
          <div className="flex items-center gap-2 text-sm text-ink-700">
            <MapPin className="h-4 w-4 text-brand-600" />
            <span className="font-mono text-xs">{addr.lat.toFixed(4)}, {addr.lng.toFixed(4)}</span>
          </div>
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-ink-900 text-white hover:bg-ink-700"
            >
              {t('dashboard.orders.openInMap')}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
