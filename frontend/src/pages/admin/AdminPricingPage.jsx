import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { formatNumber, formatPrice } from '../../lib/utils';

const INITIAL_PLANS = [
  { id: 'instagram', name: 'Instagram paketi', price: 29.9, bots: 1, channels: 1, messageLimit: 10000, tokenLimit: 400000, overagePrice: 1.5, active: true, features: ['1 AI bot', '1 Instagram hesabı', 'Aylıq 10.000 mesaj', 'Limitsiz məhsul', 'Əsas panel'] },
  { id: 'whatsapp', name: 'WhatsApp paketi', price: 29.9, bots: 1, channels: 1, messageLimit: 10000, tokenLimit: 400000, overagePrice: 1.5, active: true, features: ['1 AI bot', '1 WhatsApp nömrəsi', 'Aylıq 10.000 mesaj', 'Limitsiz məhsul', 'Əsas panel'] },
  { id: 'combo', name: 'Instagram + WhatsApp', price: 49.9, bots: 1, channels: 2, messageLimit: 50000, tokenLimit: 2000000, overagePrice: 1.2, active: true, features: ['1 multi-kanal AI bot', 'IG + WA', 'Aylıq 50.000 mesaj', 'Lead izləmə', 'Sifariş paneli'] },
  { id: 'business', name: 'Biznes / 5 Panel', price: 99.9, bots: 5, channels: 5, messageLimit: 150000, tokenLimit: 6000000, overagePrice: 1.0, active: true, features: ['5 AI bot', '5 hesab/kanal', 'Aylıq 150.000 mesaj', 'Geniş statistika', 'Prioritet dəstək'] },
];

export default function AdminPricingPage() {
  const { t, i18n } = useTranslation();
  const cols = t('admin.pricing.columns', { returnObjects: true });
  const m = t('admin.pricing.modal', { returnObjects: true });
  const toast = useToast();
  const [plans, setPlans] = useState(INITIAL_PLANS);
  const [editing, setEditing] = useState(null);

  const open = (plan) => {
    setEditing({ ...plan, features: plan.features.join('\n') });
  };

  const save = () => {
    setPlans((prev) => prev.map((p) => (p.id === editing.id ? {
      ...editing,
      price: Number(editing.price),
      bots: Number(editing.bots),
      channels: Number(editing.channels),
      messageLimit: Number(editing.messageLimit),
      tokenLimit: Number(editing.tokenLimit),
      overagePrice: Number(editing.overagePrice),
      features: String(editing.features).split('\n').map((s) => s.trim()).filter(Boolean),
    } : p)));
    toast.success(m.saved);
    setEditing(null);
  };

  return (
    <div className="text-white" data-testid="admin-pricing-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">{t('admin.pricing.title')}</h1>
        <p className="text-sm text-white/60 mt-1">{t('admin.pricing.subtitle')}</p>
      </div>

      <div className="mt-6 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">{cols.name}</th>
                <th className="text-right px-4 py-3 font-semibold">{cols.price}</th>
                <th className="text-right px-4 py-3 font-semibold">{cols.bots}</th>
                <th className="text-right px-4 py-3 font-semibold">{cols.channels}</th>
                <th className="text-right px-4 py-3 font-semibold">{cols.messageLimit}</th>
                <th className="text-right px-4 py-3 font-semibold">{cols.tokenLimit}</th>
                <th className="text-right px-4 py-3 font-semibold">{cols.overagePrice}</th>
                <th className="text-left px-4 py-3 font-semibold">{cols.status}</th>
                <th className="text-right px-4 py-3 font-semibold">{cols.edit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {plans.map((p) => (
                <tr key={p.id} data-testid={`admin-pricing-row-${p.id}`} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatPrice(p.price, i18n.language)}</td>
                  <td className="px-4 py-3 text-right">{p.bots}</td>
                  <td className="px-4 py-3 text-right">{p.channels}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(p.messageLimit, i18n.language)}</td>
                  <td className="px-4 py-3 text-right text-white/70">{formatNumber(p.tokenLimit, i18n.language)}</td>
                  <td className="px-4 py-3 text-right text-white/70">{p.overagePrice} ₼</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${p.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60'}`}>
                      {p.active ? 'aktiv' : 'passiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => open(p)} data-testid={`admin-pricing-edit-${p.id}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-300 hover:text-brand-200">
                      <Pencil className="h-3 w-3" />
                      {cols.edit}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-3 py-4 overflow-y-auto" data-testid="admin-pricing-modal">
          <div className="bg-ink-900 border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-7 my-auto animate-slide-up text-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg">{m.title}</h2>
              <button onClick={() => setEditing(null)} className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Fld label={m.name}>
                <input className="inp" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Fld>
              <Fld label={m.price}>
                <input type="number" step="0.01" className="inp" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
              </Fld>
              <Fld label={m.bots}>
                <input type="number" className="inp" value={editing.bots} onChange={(e) => setEditing({ ...editing, bots: e.target.value })} />
              </Fld>
              <Fld label={m.channels}>
                <input type="number" className="inp" value={editing.channels} onChange={(e) => setEditing({ ...editing, channels: e.target.value })} />
              </Fld>
              <Fld label={m.messageLimit}>
                <input type="number" className="inp" value={editing.messageLimit} onChange={(e) => setEditing({ ...editing, messageLimit: e.target.value })} />
              </Fld>
              <Fld label={m.tokenLimit}>
                <input type="number" className="inp" value={editing.tokenLimit} onChange={(e) => setEditing({ ...editing, tokenLimit: e.target.value })} />
              </Fld>
              <Fld label={m.overagePrice}>
                <input type="number" step="0.01" className="inp" value={editing.overagePrice} onChange={(e) => setEditing({ ...editing, overagePrice: e.target.value })} />
              </Fld>
              <Fld label={m.active}>
                <select className="inp" value={editing.active ? '1' : '0'} onChange={(e) => setEditing({ ...editing, active: e.target.value === '1' })}>
                  <option value="1">Aktiv</option>
                  <option value="0">Passiv</option>
                </select>
              </Fld>
              <div className="sm:col-span-2">
                <Fld label={m.features}>
                  <textarea className="inp min-h-[120px] font-mono text-xs" value={editing.features} onChange={(e) => setEditing({ ...editing, features: e.target.value })} />
                </Fld>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="text-sm px-4 py-2 rounded-lg border border-white/15 hover:bg-white/5">
                {t('common.cancel')}
              </button>
              <button onClick={save} data-testid="admin-pricing-save" className="text-sm px-5 py-2 rounded-lg bg-brand-gradient hover:opacity-90 transition">
                {m.save}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .inp { width: 100%; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); padding: 0.5rem 0.75rem; color: white; font-size: 0.875rem; }
        .inp:focus { outline: none; border-color: rgba(255,255,255,0.4); }
      `}</style>
    </div>
  );
}

function Fld({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-white/50 font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  );
}
