import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Instagram, Trash2, Plug, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { botsApi, integrationsApi } from '../lib/api';
import { useToast } from '../context/ToastContext';

const WEBHOOK_CALLBACK_URL = 'https://aioperator-backend.onrender.com/api/webhooks/instagram';

const EMPTY_FORM = {
  botId: '',
  displayName: '',
  instagramUsername: '',
  instagramBusinessAccountId: '',
  instagramPageId: '',
  accessToken: '',
};

/**
 * Manual Instagram → bot connection form + connections list.
 *
 * SECURITY:
 *   - The access token is held only in component state during typing.
 *   - It is sent ONCE in the POST body, then the field is wiped.
 *   - It is never written to localStorage / cookies, never logged,
 *     and never read back from the server (backend stores it
 *     encrypted and only ever returns `hasAccessToken: boolean`).
 */
export default function IntegrationsPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const [bots, setBots] = useState([]);
  const [connections, setConnections] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const reload = async () => {
    try {
      const [bRes, cRes] = await Promise.all([botsApi.list(), integrationsApi.list()]);
      setBots(bRes.data?.bots || []);
      setConnections(cRes.data?.connections || []);
    } catch {
      // initial fetch may 401 right after logout — silently ignore
    }
  };

  useEffect(() => { reload(); }, []);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.botId || !form.instagramBusinessAccountId || !form.accessToken) {
      toast.error(t('errors.generic'));
      return;
    }
    setSubmitting(true);
    try {
      await integrationsApi.connectInstagram({
        botId: form.botId,
        displayName: form.displayName || '',
        instagramUsername: form.instagramUsername.replace(/^@/, '').trim(),
        instagramBusinessAccountId: form.instagramBusinessAccountId.trim(),
        instagramPageId: form.instagramPageId.trim() || '',
        accessToken: form.accessToken,
      });
      // Wipe token + sensitive fields from local state IMMEDIATELY.
      setForm(EMPTY_FORM);
      toast.success(t('dashboard.settings.integrations.connectSuccess'));
      await reload();
    } catch {
      toast.error(t('dashboard.settings.integrations.connectError'));
      // Always wipe token even on error so it never lingers in memory.
      setForm((f) => ({ ...f, accessToken: '' }));
    } finally {
      setSubmitting(false);
    }
  };

  const disconnect = async (id) => {
    if (!window.confirm(t('dashboard.settings.integrations.disconnectConfirm'))) return;
    try {
      await integrationsApi.remove(id);
      toast.success(t('dashboard.settings.integrations.disconnected'));
      await reload();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const copyCallback = async () => {
    try {
      await navigator.clipboard.writeText(WEBHOOK_CALLBACK_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore — clipboard may be unavailable in iframes
    }
  };

  const igConnections = connections.filter((c) => c.platform === 'instagram');
  const inputCls = 'mt-1 input-base w-full text-sm';

  return (
    <div className="mt-6 bg-white border border-ink-200 rounded-xl p-6" data-testid="integrations-panel">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="h-10 w-10 rounded-xl bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center shrink-0">
          <Instagram className="h-5 w-5 text-pink-600" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-base text-ink-900">
            {t('dashboard.settings.integrations.title')}
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">{t('dashboard.settings.integrations.subtitle')}</p>
        </div>
      </div>

      {/* Connect form */}
      <form onSubmit={submit} className="mt-5 grid sm:grid-cols-2 gap-3" data-testid="ig-connect-form">
        <div className="sm:col-span-2 text-xs font-semibold uppercase tracking-wider text-ink-500 mt-1">
          {t('dashboard.settings.integrations.instagramTitle')}
        </div>

        <Field label={t('dashboard.settings.integrations.botField')}>
          <select
            value={form.botId}
            onChange={onChange('botId')}
            data-testid="ig-bot-select"
            className={inputCls}
            required
          >
            <option value="">{t('dashboard.settings.integrations.selectBot')}</option>
            {bots.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {bots.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">{t('dashboard.settings.integrations.noBots')}</p>
          )}
        </Field>

        <Field label={t('dashboard.settings.integrations.displayName')}>
          <input
            type="text"
            value={form.displayName}
            onChange={onChange('displayName')}
            data-testid="ig-display-name"
            className={inputCls}
            maxLength={120}
            autoComplete="off"
          />
        </Field>

        <Field
          label={t('dashboard.settings.integrations.instagramUsername')}
          hint={t('dashboard.settings.integrations.instagramUsernameHint')}
        >
          <input
            type="text"
            value={form.instagramUsername}
            onChange={onChange('instagramUsername')}
            data-testid="ig-username"
            className={inputCls}
            maxLength={120}
            autoComplete="off"
          />
        </Field>

        <Field
          label={t('dashboard.settings.integrations.businessAccountId')}
          hint={t('dashboard.settings.integrations.businessAccountIdHint')}
        >
          <input
            type="text"
            value={form.instagramBusinessAccountId}
            onChange={onChange('instagramBusinessAccountId')}
            data-testid="ig-business-id"
            className={inputCls}
            maxLength={80}
            autoComplete="off"
            required
          />
        </Field>

        <Field
          label={t('dashboard.settings.integrations.pageId')}
          hint={t('dashboard.settings.integrations.pageIdHint')}
        >
          <input
            type="text"
            value={form.instagramPageId}
            onChange={onChange('instagramPageId')}
            data-testid="ig-page-id"
            className={inputCls}
            maxLength={80}
            autoComplete="off"
          />
        </Field>

        <Field
          label={t('dashboard.settings.integrations.accessToken')}
          hint={t('dashboard.settings.integrations.accessTokenHint')}
          full
        >
          <input
            type="password"
            value={form.accessToken}
            onChange={onChange('accessToken')}
            data-testid="ig-access-token"
            className={inputCls}
            autoComplete="new-password"
            spellCheck={false}
            required
            minLength={8}
          />
        </Field>

        <div className="sm:col-span-2 flex items-center justify-end gap-2 mt-1">
          <button
            type="submit"
            disabled={submitting || bots.length === 0}
            data-testid="ig-connect-submit"
            className="btn-primary disabled:opacity-50"
          >
            <Plug className="h-4 w-4" />
            {submitting
              ? t('dashboard.settings.integrations.submitting')
              : t('dashboard.settings.integrations.submit')}
          </button>
        </div>
      </form>

      {/* Connections list */}
      <div className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          {t('dashboard.settings.integrations.connectionsList')}
        </div>
        {igConnections.length === 0 ? (
          <div className="mt-2 text-xs text-ink-500" data-testid="ig-no-connections">
            {t('dashboard.settings.integrations.noConnections')}
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-ink-200 border border-ink-200 rounded-lg overflow-hidden" data-testid="ig-connections-list">
            {igConnections.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3 bg-white">
                <div className="h-8 w-8 rounded-full bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center shrink-0">
                  <Instagram className="h-4 w-4 text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-900 truncate">
                    Instagram: {c.instagramUsername ? `@${c.instagramUsername}` : c.displayName || '—'}
                  </div>
                  <div className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <StatusPill status={c.status} t={t} />
                    {c.createdAt && (
                      <>
                        <span>·</span>
                        <span>
                          {t('dashboard.settings.integrations.connectedAt')}:{' '}
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => disconnect(c.id)}
                  data-testid={`ig-disconnect-${c.id}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('dashboard.settings.integrations.disconnect')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Webhook info card (read-only) */}
      <div className="mt-6 rounded-lg bg-ink-50 border border-ink-200 p-4" data-testid="ig-webhook-card">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-700">
          {t('dashboard.settings.integrations.webhookCard.title')}
        </div>
        <div className="mt-2 grid sm:grid-cols-[160px_1fr] gap-1 text-xs text-ink-700">
          <div className="text-ink-500">{t('dashboard.settings.integrations.webhookCard.callbackLabel')}:</div>
          <div className="flex items-center gap-1.5 min-w-0">
            <a
              href={WEBHOOK_CALLBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-brand-700 hover:underline truncate"
              data-testid="ig-webhook-url"
            >
              {WEBHOOK_CALLBACK_URL}
            </a>
            <ExternalLink className="h-3 w-3 text-ink-400 shrink-0" />
            <button
              type="button"
              onClick={copyCallback}
              data-testid="ig-webhook-copy"
              className="text-[11px] font-medium px-1.5 py-0.5 rounded border border-ink-200 bg-white hover:bg-ink-100 inline-flex items-center gap-1 ml-auto shrink-0"
            >
              <Copy className="h-3 w-3" />
              {copied
                ? t('dashboard.settings.integrations.webhookCard.copied')
                : t('dashboard.settings.integrations.webhookCard.copy')}
            </button>
          </div>
          <div className="text-ink-500">{t('dashboard.settings.integrations.webhookCard.statusLabel')}:</div>
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('dashboard.settings.integrations.webhookCard.statusReady')}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, full, children }) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-ink-700">{label}</span>
      {children}
      {hint && <p className="text-[11px] text-ink-500 mt-1">{hint}</p>}
    </label>
  );
}

function StatusPill({ status, t }) {
  const map = {
    connected: { tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: t('dashboard.settings.integrations.connected') },
    needs_reconnect: { tone: 'bg-amber-50 text-amber-800 ring-amber-200', label: t('dashboard.settings.integrations.needsReconnect') },
    disabled: { tone: 'bg-ink-100 text-ink-600 ring-ink-200', label: t('dashboard.settings.integrations.disabled') },
  };
  const info = map[status] || map.connected;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${info.tone}`}>
      {info.label}
    </span>
  );
}
