import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Instagram, Phone, X } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon.jsx';
import {
  getCustomerFullName,
  formatPhoneDisplay,
  normaliseInstagramHandle,
  buildWhatsAppLink,
  buildTelLink,
  buildInstagramLink,
} from '../../lib/orderHelpers';

export default function OrderContactModal({ order, onClose }) {
  const { t } = useTranslation();

  // Close on Escape
  useEffect(() => {
    if (!order) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  if (!order) return null;

  const fullName = getCustomerFullName(order, t('dashboard.orders.unnamed'));
  const instagramHandle = normaliseInstagramHandle(order.instagramHandle);
  const whatsappDisplay = formatPhoneDisplay(order.whatsappNumber);
  const phoneDisplay = formatPhoneDisplay(order.phone);

  const telHref = buildTelLink(order.phone) || buildTelLink(order.whatsappNumber);
  const waHref = buildWhatsAppLink(order.whatsappNumber) || buildWhatsAppLink(order.phone);
  const igHref = buildInstagramLink(instagramHandle);

  const Row = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ink-100 last:border-0">
      <span className="text-xs uppercase tracking-wider text-ink-500 shrink-0">{label}</span>
      <span className="text-sm text-ink-900 font-medium text-right break-words whitespace-nowrap tabular-nums">
        {value || '—'}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      data-testid="order-contact-modal"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-ink-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200 bg-ink-50/70">
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-lg text-ink-900 truncate">{fullName}</h2>
            <p className="text-xs text-ink-500 font-mono">{order.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
            aria-label={t('common.close')}
            data-testid="order-contact-modal-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-1">
          <Row label={t('dashboard.orders.product')} value={order.product} />
          <Row label={t('dashboard.orders.platform')} value={order.platform === 'instagram' ? 'Instagram' : 'WhatsApp'} />
          <Row label="Instagram" value={instagramHandle ? `@${instagramHandle}` : ''} />
          <Row label="WhatsApp" value={whatsappDisplay} />
          <Row label={t('dashboard.orders.contactTabs.phone')} value={phoneDisplay} />
        </div>

        <div className="px-5 py-4 border-t border-ink-200 bg-ink-50/70">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <a
              href={telHref || undefined}
              aria-disabled={!telHref}
              onClick={(e) => { if (!telHref) e.preventDefault(); }}
              data-testid="order-contact-call"
              className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition
                ${telHref
                  ? 'bg-ink-900 text-white hover:bg-ink-700 ring-1 ring-ink-900'
                  : 'bg-ink-100 text-ink-500 ring-1 ring-ink-200 cursor-not-allowed'}`}
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span className="whitespace-normal break-words leading-tight">
                {t('dashboard.orders.actions.call')}
              </span>
            </a>
            <a
              href={waHref || undefined}
              target={waHref ? '_blank' : undefined}
              rel={waHref ? 'noopener noreferrer' : undefined}
              aria-disabled={!waHref}
              onClick={(e) => { if (!waHref) e.preventDefault(); }}
              data-testid="order-contact-whatsapp"
              className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition
                ${waHref
                  ? 'bg-[#25D366] text-white hover:bg-[#1fb057] ring-1 ring-[#1fb057]'
                  : 'bg-ink-100 text-ink-500 ring-1 ring-ink-200 cursor-not-allowed'}`}
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0" />
              <span className="whitespace-normal break-words leading-tight">
                {t('dashboard.orders.actions.whatsappWrite')}
              </span>
            </a>
            <a
              href={igHref || undefined}
              target={igHref ? '_blank' : undefined}
              rel={igHref ? 'noopener noreferrer' : undefined}
              aria-disabled={!igHref}
              onClick={(e) => { if (!igHref) e.preventDefault(); }}
              data-testid="order-contact-instagram"
              className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition
                ${igHref
                  ? 'text-white ring-1 ring-pink-600 bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90'
                  : 'bg-ink-100 text-ink-500 ring-1 ring-ink-200 cursor-not-allowed'}`}
            >
              <Instagram className="h-4 w-4 shrink-0" />
              <span className="whitespace-normal break-words leading-tight">
                {t('dashboard.orders.actions.instagramWrite')}
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
