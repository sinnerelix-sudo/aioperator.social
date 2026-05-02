import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Instagram,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  ShoppingBag,
  X,
  Loader2,
  AlertTriangle,
  Search,
  Send,
  Inbox,
} from 'lucide-react';
import { leadsApi } from '../../lib/api';
import { formatDateTime } from '../../lib/utils';

/* ============================== labels ============================== */

const LEAD_STATUSES = [
  { id: 'all', label: 'Hamısı' },
  { id: 'new', label: 'Yeni' },
  { id: 'viewed', label: 'Baxıldı' },
  { id: 'contacted', label: 'Əlaqə saxlanıldı' },
  { id: 'converted', label: 'Sifarişə çevrildi' },
  { id: 'dismissed', label: 'Ləğv edildi' },
];

const LEAD_STATUS_LABELS = {
  new: 'Yeni',
  viewed: 'Baxıldı',
  contacted: 'Əlaqə saxlanıldı',
  converted: 'Sifarişə çevrildi',
  dismissed: 'Ləğv edildi',
};

const LEAD_STATUS_TONE = {
  new: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  viewed: 'bg-ink-50 text-ink-700 ring-ink-200',
  contacted: 'bg-amber-50 text-amber-700 ring-amber-500/20',
  converted: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  dismissed: 'bg-rose-50 text-rose-700 ring-rose-500/20',
};

const REPLY_STATUS_LABELS = {
  pending: 'Gözləyir',
  sent: 'Göndərildi',
  failed: 'Uğursuz',
  skipped: 'Skip',
};

function ReplyStatusPill({ status }) {
  const icon =
    status === 'sent' ? CheckCircle2 : status === 'failed' ? XCircle : Clock;
  const Icon = icon;
  const tone =
    status === 'sent'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/20'
      : status === 'failed'
      ? 'bg-rose-50 text-rose-700 ring-rose-500/20'
      : status === 'skipped'
      ? 'bg-ink-50 text-ink-500 ring-ink-200'
      : 'bg-ink-50 text-ink-600 ring-ink-200';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tone}`}
    >
      <Icon className="h-3 w-3" />
      {REPLY_STATUS_LABELS[status] || status}
    </span>
  );
}

/* ============================== KPIs ================================ */

function KpiCard({ icon: Icon, label, value, tone }) {
  return (
    <div
      data-testid={`leads-kpi-${label}`}
      className="bg-white border border-ink-200 rounded-xl p-4 flex items-center gap-3"
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-ink-500">{label}</div>
        <div className="text-xl font-display font-semibold text-ink-900 tabular-nums">{value ?? '—'}</div>
      </div>
    </div>
  );
}

/* ============================ detail drawer ========================= */

function DetailDrawer({ open, lead, onClose, onStatusChange, onNoteSave, saving }) {
  const [note, setNote] = useState('');
  const [fullText, setFullText] = useState('');

  useEffect(() => {
    if (!open || !lead) return;
    setNote(lead.note || '');
    setFullText(lead.text || lead.textPreview || '');
    // Fetch full text if not already included.
    let cancel = false;
    if (!lead.text && lead.id) {
      leadsApi
        .getComment(lead.id)
        .then((r) => {
          if (cancel) return;
          setFullText(r.data?.item?.text || lead.textPreview || '');
        })
        .catch(() => {
          /* ignore */
        });
    }
    return () => {
      cancel = true;
    };
  }, [open, lead]);

  if (!open || !lead) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="leads-detail-drawer">
      <div
        className="absolute inset-0 bg-ink-900/40"
        onClick={onClose}
        data-testid="leads-detail-backdrop"
      />
      <aside className="absolute right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-ink-200">
          <div className="min-w-0">
            <div className="text-xs text-ink-500">Lead detalı</div>
            <div className="font-display font-semibold text-ink-900 truncate">
              @{lead.customerUsername || lead.customerExternalId || 'anonim'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50"
            data-testid="leads-detail-close"
            aria-label="Bağla"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <section>
            <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">
              Şərh mətni
            </div>
            <div
              className="bg-ink-50/60 border border-ink-200 rounded-lg p-3 text-sm text-ink-900 whitespace-pre-wrap break-words"
              data-testid="leads-detail-text"
            >
              {fullText || <span className="text-ink-500 italic">Mətn yoxdur</span>}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">
                Public reply
              </div>
              <ReplyStatusPill status={lead.publicReplyStatus} />
              {lead.publicReplyError ? (
                <div className="text-[11px] text-rose-600 mt-1">
                  {lead.publicReplyError}
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">
                Private reply
              </div>
              <ReplyStatusPill status={lead.privateReplyStatus} />
              {lead.privateReplyError ? (
                <div className="text-[11px] text-rose-600 mt-1">
                  {lead.privateReplyError}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-ink-500 mb-0.5">Comment ID</div>
              <div className="font-mono text-ink-700 truncate">
                {lead.externalCommentId || '—'}
              </div>
            </div>
            <div>
              <div className="text-ink-500 mb-0.5">Media ID</div>
              <div className="font-mono text-ink-700 truncate">
                {lead.externalMediaId || '—'}
              </div>
            </div>
            <div>
              <div className="text-ink-500 mb-0.5">Müştəri ID</div>
              <div className="font-mono text-ink-700 truncate">
                {lead.customerExternalId || '—'}
              </div>
            </div>
            <div>
              <div className="text-ink-500 mb-0.5">Tarix</div>
              <div className="text-ink-700">{formatDateTime(lead.createdAt, 'az')}</div>
            </div>
          </div>

          {lead.permalink ? (
            <a
              href={lead.permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
              data-testid="leads-detail-permalink"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Instagram-da aç
            </a>
          ) : null}

          <section>
            <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">
              Status
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(LEAD_STATUS_LABELS).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
                  disabled={saving}
                  data-testid={`leads-detail-status-${s}`}
                  className={`px-3 py-1 rounded-full text-xs font-medium ring-1 transition-all ${
                    lead.leadStatus === s
                      ? LEAD_STATUS_TONE[s]
                      : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50'
                  } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {LEAD_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5">
              Qeyd
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Satıcı üçün daxili qeyd..."
              maxLength={2000}
              rows={3}
              data-testid="leads-detail-note"
              className="w-full bg-white border border-ink-200 rounded-lg p-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600/40 resize-none"
            />
            <button
              onClick={() => onNoteSave(note)}
              disabled={saving || note === (lead.note || '')}
              data-testid="leads-detail-note-save"
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-900 text-white text-xs font-semibold hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              Qeydi yadda saxla
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
}

/* =============================== page =============================== */

export default function LeadsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (activeFilter && activeFilter !== 'all' && activeFilter !== 'failed') {
        params.leadStatus = activeFilter;
      }
      if (activeFilter === 'failed') params.replyStatus = 'failed';
      if (search.trim()) params.search = search.trim();
      const { data } = await leadsApi.listComments(params);
      setItems(data.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Lead-ləri yükləmək alınmadı');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await leadsApi.stats();
      setStats(data);
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, items.length]);

  const filteredCount = items.length;

  const updateLead = useCallback(
    async (id, patch) => {
      setSaving(true);
      try {
        const { data } = await leadsApi.updateComment(id, patch);
        const updated = data.item;
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)));
        if (selected?.id === id) setSelected((prev) => ({ ...prev, ...updated }));
        fetchStats();
      } catch (e) {
        setError(e?.response?.data?.message || 'Dəyişiklik yadda saxlanılmadı');
      } finally {
        setSaving(false);
      }
    },
    [fetchStats, selected]
  );

  const kpis = useMemo(
    () => [
      {
        icon: Inbox,
        label: 'Yeni lead-lər',
        value: stats?.new ?? 0,
        tone: 'bg-brand-50 text-brand-600',
      },
      {
        icon: MessageCircle,
        label: 'Public cavab',
        value: stats?.publicReplied ?? 0,
        tone: 'bg-ink-50 text-ink-700',
      },
      {
        icon: Send,
        label: 'Private DM',
        value: stats?.privateReplied ?? 0,
        tone: 'bg-amber-50 text-amber-700',
      },
      {
        icon: ShoppingBag,
        label: 'Sifarişə çevrilən',
        value: stats?.converted ?? 0,
        tone: 'bg-emerald-50 text-emerald-700',
      },
    ],
    [stats]
  );

  return (
    <div data-testid="leads-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
          Potensial müştərilər
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Instagram şərhlərindən və mesajlardan gələn satış fürsətləri
        </p>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="leads-kpis">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* Filters + search */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3" data-testid="leads-filters">
        <div className="flex flex-wrap items-center gap-2">
          {LEAD_STATUSES.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              data-testid={`leads-filter-${f.id}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ring-1 transition-all ${
                activeFilter === f.id
                  ? 'bg-ink-900 text-white ring-ink-900'
                  : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setActiveFilter('failed')}
            data-testid="leads-filter-failed"
            className={`px-3 py-1.5 rounded-full text-xs font-medium ring-1 transition-all inline-flex items-center gap-1 ${
              activeFilter === 'failed'
                ? 'bg-rose-600 text-white ring-rose-600'
                : 'bg-white text-rose-600 ring-rose-200 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Uğursuz reply
          </button>
        </div>
        <div className="sm:ml-auto relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Axtar: username, comment id..."
            data-testid="leads-search"
            className="w-full pl-9 pr-3 py-2 bg-white border border-ink-200 rounded-lg text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600/40"
          />
        </div>
      </div>

      {/* List */}
      <div className="mt-5">
        {loading ? (
          <div
            className="p-12 bg-white border border-dashed border-ink-300 rounded-xl text-center"
            data-testid="leads-loading"
          >
            <Loader2 className="h-6 w-6 mx-auto text-ink-400 animate-spin" />
            <p className="text-sm text-ink-500 mt-2">Yüklənir...</p>
          </div>
        ) : error ? (
          <div
            className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700"
            data-testid="leads-error"
          >
            {error}
          </div>
        ) : filteredCount === 0 ? (
          <div
            className="p-10 bg-white border border-dashed border-ink-300 rounded-xl text-center"
            data-testid="leads-empty"
          >
            <Instagram className="h-7 w-7 mx-auto text-ink-400" />
            <p className="text-sm text-ink-700 font-medium mt-2">
              Instagram şərhlərindən gələn potensial müştərilər burada görünəcək.
            </p>
            <p className="text-xs text-ink-500 mt-1">
              Postlarınıza gələn sual və qiymət şərhləri bot tərəfindən cavablandırıldıqda
              burada lead kimi toplanacaq.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div
              className="hidden md:block bg-white border border-ink-200 rounded-xl overflow-hidden"
              data-testid="leads-table-wrap"
            >
              <table className="w-full text-sm" data-testid="leads-table">
                <thead className="bg-ink-50/60 text-[11px] uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Müştəri</th>
                    <th className="text-left px-4 py-3 font-semibold">Mənbə</th>
                    <th className="text-left px-4 py-3 font-semibold">Şərh</th>
                    <th className="text-left px-4 py-3 font-semibold">Public</th>
                    <th className="text-left px-4 py-3 font-semibold">Private</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Tarix</th>
                    <th className="text-right px-4 py-3 font-semibold">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {items.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-ink-50/40 transition-colors"
                      data-testid={`leads-row-${lead.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900 truncate max-w-[160px]">
                          @{lead.customerUsername || lead.customerExternalId || 'anonim'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-ink-600">
                          <Instagram className="h-3.5 w-3.5" />
                          IG comment
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[320px]">
                        <div className="text-ink-700 line-clamp-2" data-testid={`leads-text-${lead.id}`}>
                          {lead.textPreview || <span className="text-ink-400 italic">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ReplyStatusPill status={lead.publicReplyStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <ReplyStatusPill status={lead.privateReplyStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                            LEAD_STATUS_TONE[lead.leadStatus] ||
                            'bg-ink-50 text-ink-700 ring-ink-200'
                          }`}
                        >
                          {LEAD_STATUS_LABELS[lead.leadStatus] || lead.leadStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                        {formatDateTime(lead.createdAt, 'az')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelected(lead);
                              if (lead.leadStatus === 'new') {
                                updateLead(lead.id, { leadStatus: 'viewed' });
                              }
                            }}
                            data-testid={`leads-row-view-${lead.id}`}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100"
                            title="Ətraflı"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {lead.permalink ? (
                            <a
                              href={lead.permalink}
                              target="_blank"
                              rel="noreferrer"
                              data-testid={`leads-row-permalink-${lead.id}`}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100"
                              title="Instagram-da aç"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : null}
                          <button
                            onClick={() => updateLead(lead.id, { leadStatus: 'converted' })}
                            disabled={lead.leadStatus === 'converted'}
                            data-testid={`leads-row-convert-${lead.id}`}
                            className={`h-8 px-2 inline-flex items-center gap-1 rounded-lg text-xs font-medium ring-1 ${
                              lead.leadStatus === 'converted'
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 cursor-default'
                                : 'text-emerald-700 ring-emerald-500/30 hover:bg-emerald-50'
                            }`}
                            title="Sifarişə çevrildi"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3" data-testid="leads-cards">
              {items.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white border border-ink-200 rounded-xl p-3.5"
                  data-testid={`leads-card-${lead.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-ink-900 truncate">
                        @{lead.customerUsername || lead.customerExternalId || 'anonim'}
                      </div>
                      <div className="text-[11px] text-ink-500 mt-0.5 inline-flex items-center gap-1">
                        <Instagram className="h-3 w-3" />
                        IG comment • {formatDateTime(lead.createdAt, 'az')}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 shrink-0 ${
                        LEAD_STATUS_TONE[lead.leadStatus] ||
                        'bg-ink-50 text-ink-700 ring-ink-200'
                      }`}
                    >
                      {LEAD_STATUS_LABELS[lead.leadStatus] || lead.leadStatus}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-ink-700 line-clamp-3">
                    {lead.textPreview || <span className="text-ink-400 italic">—</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <ReplyStatusPill status={lead.publicReplyStatus} />
                    <ReplyStatusPill status={lead.privateReplyStatus} />
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setSelected(lead);
                        if (lead.leadStatus === 'new') {
                          updateLead(lead.id, { leadStatus: 'viewed' });
                        }
                      }}
                      data-testid={`leads-card-view-${lead.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detal
                    </button>
                    <button
                      onClick={() => updateLead(lead.id, { leadStatus: 'converted' })}
                      disabled={lead.leadStatus === 'converted'}
                      data-testid={`leads-card-convert-${lead.id}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ring-1 ${
                        lead.leadStatus === 'converted'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/20'
                          : 'text-emerald-700 ring-emerald-500/30 hover:bg-emerald-50'
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Sifarişə
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        lead={selected}
        saving={saving}
        onClose={() => setSelected(null)}
        onStatusChange={(s) => selected && updateLead(selected.id, { leadStatus: s })}
        onNoteSave={(n) => selected && updateLead(selected.id, { note: n })}
      />
    </div>
  );
}
