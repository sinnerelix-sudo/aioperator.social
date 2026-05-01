import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Instagram, Trash2, Plug } from 'lucide-react';
import { botsApi, integrationsApi } from '../lib/api';
import { useToast } from '../context/ToastContext';

/**
 * Seller-facing Instagram integration card.
 *
 * No developer fields are exposed — the seller only sees a single
 * "Instagram hesabını bağla" button that triggers the OAuth flow.
 * Backend handles the redirect to Instagram, code → access token
 * exchange (incl. long-lived token), profile fetch, and storage.
 *
 * SECURITY:
 *   - Frontend never sees, stores, or logs any access token.
 *   - Webhook URL / verify token / business account ID are not shown.
 *   - The only sensitive thing handled here is the authorize URL,
 *     which the browser navigates to (no token in our hands).
 */
export default function IntegrationsPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const { lng = 'az' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bots, setBots] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const reload = async () => {
    try {
      const [bRes, cRes] = await Promise.all([botsApi.list(), integrationsApi.list()]);
      const botList = bRes.data?.bots || [];
      setBots(botList);
      setConnections(cRes.data?.connections || []);
      // Auto-select first bot if none selected yet
      setSelectedBotId((cur) => cur || botList[0]?.id || '');
    } catch {
      // initial fetch may 401 right after logout — silently ignore
    }
  };

  useEffect(() => { reload(); }, []);

  // Read OAuth callback result from query params and surface as toast
  useEffect(() => {
    const flag = searchParams.get('integration');
    if (!flag) return;
    if (flag === 'instagram_connected') {
      toast.success(t('dashboard.settings.integrations.connectSuccess'));
      reload();
    } else if (flag === 'instagram_error') {
      toast.error(t('dashboard.settings.integrations.connectError'));
    }
    // Strip the query so refresh doesn't re-fire the toast
    const next = new URLSearchParams(searchParams);
    next.delete('integration');
    next.delete('reason');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startConnect = async () => {
    if (!selectedBotId) return;
    setRedirecting(true);
    try {
      const res = await integrationsApi.startInstagramOAuth(selectedBotId, lng);
      const url = res.data?.authorizeUrl;
      if (!url) throw new Error('no_url');
      // Hand off to Instagram — the access token never touches our frontend.
      window.location.href = url;
    } catch {
      setRedirecting(false);
      toast.error(t('dashboard.settings.integrations.connectError'));
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

  const igConnections = connections.filter((c) => c.platform === 'instagram');

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
          <p className="text-xs text-ink-500 mt-0.5 max-w-xl">
            {t('dashboard.settings.integrations.subtitle')}
          </p>
        </div>
      </div>

      {/* Connect block: bot picker + single Connect button */}
      <div className="mt-5 grid sm:grid-cols-[1fr_auto] items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium text-ink-700">
            {t('dashboard.settings.integrations.botField')}
          </span>
          <select
            value={selectedBotId}
            onChange={(e) => setSelectedBotId(e.target.value)}
            disabled={bots.length === 0}
            data-testid="ig-bot-select"
            className="mt-1 input-base w-full text-sm"
          >
            {bots.length === 0 && (
              <option value="">{t('dashboard.settings.integrations.noBots')}</option>
            )}
            {bots.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={startConnect}
          disabled={redirecting || !selectedBotId}
          data-testid="ig-connect-btn"
          className="btn-primary disabled:opacity-50 whitespace-nowrap"
        >
          <Plug className="h-4 w-4" />
          {redirecting
            ? t('dashboard.settings.integrations.connecting')
            : t('dashboard.settings.integrations.connectButton')}
        </button>
      </div>
      <p className="text-[11px] text-ink-500 mt-2">
        {t('dashboard.settings.integrations.afterConnectHint')}
      </p>

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
    </div>
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
