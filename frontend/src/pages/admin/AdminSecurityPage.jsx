import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Plus, Trash2, Globe, Lock, AlertTriangle } from 'lucide-react';
import { MOCK_IP_ALLOWLIST, MOCK_ADMIN_SESSIONS, MOCK_FAILED_LOGINS } from '../../lib/mockData';
import { formatDateTime } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export default function AdminSecurityPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [ips, setIps] = useState(MOCK_IP_ALLOWLIST);
  const [newIp, setNewIp] = useState({ ip: '', label: '' });
  const tips = t('admin.security.tips', { returnObjects: true });

  const addIp = () => {
    if (!newIp.ip) return;
    setIps((prev) => [...prev, { ip: newIp.ip, label: newIp.label || '—', addedAt: new Date().toISOString(), active: true }]);
    setNewIp({ ip: '', label: '' });
    toast.success(t('admin.security.ipAdded'));
  };

  const removeIp = (ip) => {
    setIps((prev) => prev.filter((i) => i.ip !== ip));
    toast.info(t('admin.security.ipRemoved'));
  };

  return (
    <div className="text-white space-y-6" data-testid="admin-security-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">{t('admin.security.title')}</h1>
        <p className="text-sm text-white/60 mt-1">{t('admin.security.subtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <h2 className="font-display font-semibold text-base">{t('admin.security.twoFA')}</h2>
          </div>
          <div className="mt-3 inline-block text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
            {t('admin.security.twoFAEnabled')}
          </div>
          <p className="mt-3 text-sm text-emerald-200/80">{t('admin.security.twoFADesc')}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="font-display font-semibold text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {t('admin.security.tipsTitle')}
          </h2>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-1.5 text-white/70">
                <span className="text-brand-300">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* IP allowlist */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6" data-testid="admin-ip-allowlist">
        <h2 className="font-display font-semibold text-base flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('admin.security.ipAllowlist')}
        </h2>
        <ul className="mt-4 divide-y divide-white/10">
          {ips.map((it) => (
            <li key={it.ip} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <div className="font-mono">{it.ip}</div>
                <div className="text-[11px] text-white/50">{it.label} · {formatDateTime(it.addedAt, i18n.language)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">aktiv</span>
                <button onClick={() => removeIp(it.ip)} data-testid={`admin-ip-remove-${it.ip}`} className="text-white/50 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input
            data-testid="admin-ip-input"
            value={newIp.ip}
            onChange={(e) => setNewIp({ ...newIp, ip: e.target.value })}
            placeholder={t('admin.security.ipPlaceholder')}
            className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm font-mono"
          />
          <input
            value={newIp.label}
            onChange={(e) => setNewIp({ ...newIp, label: e.target.value })}
            placeholder={t('admin.security.ipLabelPlaceholder')}
            className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
          />
          <button onClick={addIp} data-testid="admin-ip-add" className="inline-flex items-center justify-center gap-1 bg-brand-gradient rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition">
            <Plus className="h-4 w-4" />
            {t('admin.security.addIp')}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6">
          <h2 className="font-display font-semibold text-base">{t('admin.security.sessions')}</h2>
          <ul className="mt-3 divide-y divide-white/10">
            {MOCK_ADMIN_SESSIONS.map((s) => (
              <li key={s.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{s.device}</div>
                  <div className="text-[11px] text-white/50 font-mono">{s.ip} · {s.city}</div>
                </div>
                {s.current ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300">
                    {t('admin.security.currentSession')}
                  </span>
                ) : (
                  <button onClick={() => toast.info(t('admin.security.revoke'))} className="text-[11px] text-white/60 hover:text-red-400">
                    {t('admin.security.revoke')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6">
          <h2 className="font-display font-semibold text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            {t('admin.security.failedLogins')}
          </h2>
          <ul className="mt-3 divide-y divide-white/10">
            {MOCK_FAILED_LOGINS.map((f, i) => (
              <li key={i} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-mono">{f.ip} <span className="text-[10px] text-white/50">({f.country})</span></div>
                  <div className="text-[11px] text-white/50 truncate">{f.email} · {formatDateTime(f.at, i18n.language)}</div>
                </div>
                <button
                  onClick={() => toast.success(`IP ${f.ip} ${t('admin.security.blockedIp').toLowerCase()}`)}
                  data-testid={`admin-block-ip-${f.ip}`}
                  className="text-[11px] font-semibold px-2 py-1 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30 transition shrink-0"
                >
                  {t('admin.security.blockedIp')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
