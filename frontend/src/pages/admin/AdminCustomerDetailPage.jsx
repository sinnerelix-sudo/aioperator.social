import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { MOCK_CUSTOMERS } from '../../lib/mockData';
import { formatDate, formatNumber } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export default function AdminCustomerDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const toast = useToast();
  const customer = useMemo(() => MOCK_CUSTOMERS.find((c) => c.id === id), [id]);

  const [form, setForm] = useState({
    note: customer?.note || '',
    customPricing: '',
    manualMessageLimit: customer?.messageLimit || 0,
    manualTokenLimit: customer?.estimatedTokens || 0,
    status: customer?.status || 'active',
    plan: customer?.plan || 'instagram',
  });

  if (!customer) {
    return (
      <div className="text-white">
        <Link to="/control-center-aio-2026/dashboard/customers" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {t('admin.customerDetail.back')}
        </Link>
        <div className="mt-6">Müştəri tapılmadı</div>
      </div>
    );
  }

  const usagePct = (customer.messagesUsed / customer.messageLimit) * 100;
  const recommended =
    usagePct > 80
      ? customer.plan === 'instagram' || customer.plan === 'whatsapp'
        ? 'combo'
        : customer.plan === 'combo'
        ? 'business'
        : 'business'
      : customer.plan;

  const onSave = () => {
    toast.success(t('admin.customerDetail.saved'));
  };

  return (
    <div className="text-white space-y-6" data-testid={`admin-customer-detail-${customer.id}`}>
      <Link to="/control-center-aio-2026/dashboard/customers" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> {t('admin.customerDetail.back')}
      </Link>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-brand-gradient flex items-center justify-center text-white font-semibold">
                {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="font-display font-semibold text-xl">{customer.firstName} {customer.lastName}</h1>
                <div className="text-sm text-white/60">{customer.company}</div>
                <div className="mt-1 text-[11px] text-white/50 break-all">{customer.email} · {customer.phone}</div>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
              <Item label={t('admin.customerDetail.plan')} value={customer.plan} />
              <Item label={t('admin.customerDetail.bots')} value={customer.bots} />
              <Item label={t('admin.customerDetail.channels')} value={customer.channels} />
              <Item label={t('admin.customerDetail.messageLimit')} value={formatNumber(customer.messageLimit, i18n.language)} />
              <Item label={t('admin.customerDetail.messagesUsed')} value={formatNumber(customer.messagesUsed, i18n.language)} />
              <Item label={t('admin.customerDetail.messagesRemaining')} value={formatNumber(customer.messageLimit - customer.messagesUsed, i18n.language)} />
              <Item label={t('admin.customerDetail.percentUsed')} value={`${usagePct.toFixed(2)}%`} />
              <Item label={t('admin.customerDetail.tokens')} value={formatNumber(customer.estimatedTokens, i18n.language)} />
              <Item label={t('admin.customerDetail.cost')} value={`$${customer.estimatedCost.toFixed(2)}`} />
              <Item label={t('admin.customerDetail.recommended')} value={recommended} highlight={recommended !== customer.plan} />
              <Item label={t('admin.customerDetail.joined')} value={formatDate(customer.createdAt, i18n.language)} />
            </dl>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6">
            <h2 className="font-display font-semibold text-base">{t('admin.customerDetail.usageGraph')}</h2>
            <UsageMiniChart used={customer.messagesUsed} limit={customer.messageLimit} />
          </div>

          <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-4 text-xs text-amber-200 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t('admin.customerDetail.noticePrivacy')}</span>
          </div>
        </div>

        {/* Admin actions */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6 space-y-3 self-start" data-testid="admin-customer-actions">
          <Field label={t('admin.customerDetail.adminNote')}>
            <textarea
              data-testid="admin-customer-note"
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm min-h-[80px]"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={t('admin.customerDetail.adminNotePlaceholder')}
            />
          </Field>
          <Field label={t('admin.customerDetail.customPricing')}>
            <input
              data-testid="admin-customer-custom-pricing"
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
              value={form.customPricing}
              onChange={(e) => setForm({ ...form, customPricing: e.target.value })}
              placeholder="0.00"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.customerDetail.manualMessageLimit')}>
              <input
                type="number"
                className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
                value={form.manualMessageLimit}
                onChange={(e) => setForm({ ...form, manualMessageLimit: e.target.value })}
              />
            </Field>
            <Field label={t('admin.customerDetail.manualTokenLimit')}>
              <input
                type="number"
                className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
                value={form.manualTokenLimit}
                onChange={(e) => setForm({ ...form, manualTokenLimit: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t('admin.customerDetail.status')}>
            <select
              data-testid="admin-customer-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
            >
              <option value="active">{t('admin.customerDetail.statusOptions.active')}</option>
              <option value="inactive">{t('admin.customerDetail.statusOptions.inactive')}</option>
              <option value="suspended">{t('admin.customerDetail.statusOptions.suspended')}</option>
            </select>
          </Field>
          <Field label={t('admin.customerDetail.changePlan')}>
            <select
              data-testid="admin-customer-plan"
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
            >
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="combo">Combo</option>
              <option value="business">Business</option>
            </select>
          </Field>
          <button
            onClick={onSave}
            data-testid="admin-customer-save"
            className="w-full bg-brand-gradient text-white font-medium rounded-lg py-2.5 text-sm hover:opacity-90 transition"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value, highlight }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">{label}</dt>
      <dd className={`mt-0.5 ${highlight ? 'text-brand-300 font-semibold' : 'text-white'}`}>{value}</dd>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-white/50 font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function UsageMiniChart({ used, limit }) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const t = (i + 1) / 12;
    const noise = Math.sin(i * 0.7) * 0.08;
    return Math.max(0, Math.min(used * (t + noise), limit));
  });
  const max = Math.max(...points);
  return (
    <div className="mt-4 flex items-end gap-1.5 h-32">
      {points.map((v, i) => {
        const h = max > 0 ? (v / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 bg-white/5 rounded-sm relative" style={{ height: `${h}%`, minHeight: 4 }}>
            <div className="absolute inset-0 bg-brand-gradient rounded-sm opacity-90" />
          </div>
        );
      })}
    </div>
  );
}
