import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Bot as BotIcon, Trash2, Pencil, Instagram, MessageCircle } from 'lucide-react';
import { botsApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function BotsPage() {
  const { t } = useTranslation();
  const { lng = 'az' } = useParams();
  const toast = useToast();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await botsApi.list();
      setBots(data.bots);
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id) => {
    try {
      await botsApi.remove(id);
      toast.success(t('dashboard.bots.deleted'));
      setConfirmId(null);
      load();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const onConnect = async (id, channel) => {
    try {
      const { data } = await botsApi.connect(id, channel);
      if (data.pending) {
        toast.warning(t('dashboard.bots.channelPending'));
      }
    } catch {
      toast.warning(t('dashboard.bots.channelPending'));
    }
  };

  return (
    <div data-testid="bots-page">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
            {t('dashboard.bots.title')}
          </h1>
          <p className="text-sm text-ink-500 mt-1">{t('dashboard.bots.subtitle')}</p>
        </div>
        <Link
          to={`/${lng}/dashboard/bots/new`}
          className="btn-primary"
          data-testid="bots-create-new"
        >
          <Plus className="h-4 w-4" />
          {t('dashboard.bots.createNew')}
        </Link>
      </div>

      {loading ? (
        <div className="mt-8 text-sm text-ink-500">{t('common.loading')}</div>
      ) : bots.length === 0 ? (
        <div
          className="mt-8 bg-white border border-ink-200 rounded-xl p-10 text-center"
          data-testid="bots-empty"
        >
          <div className="mx-auto h-12 w-12 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-3">
            <BotIcon className="h-5 w-5 text-brand-600" />
          </div>
          <p className="text-sm text-ink-500">{t('dashboard.bots.empty')}</p>
          <Link to={`/${lng}/dashboard/bots/new`} className="btn-primary mt-5 inline-flex">
            <Plus className="h-4 w-4" />
            {t('dashboard.bots.createNew')}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => (
            <div
              key={bot.id}
              data-testid={`bot-card-${bot.id}`}
              className="bg-white border border-ink-200 rounded-xl p-5 flex flex-col"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand-gradient-soft flex items-center justify-center shrink-0">
                  <BotIcon className="h-5 w-5 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-base text-ink-900 truncate">{bot.name}</h3>
                  <div className="text-xs text-ink-500 truncate">{bot.niche || '—'}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <ChannelChip
                  connected={bot.instagramConnected}
                  label="Instagram"
                  icon={Instagram}
                  notLabel={t('dashboard.bots.channels.notConnected')}
                  yesLabel={t('dashboard.bots.channels.connected')}
                />
                <ChannelChip
                  connected={bot.whatsappConnected}
                  label="WhatsApp"
                  icon={MessageCircle}
                  notLabel={t('dashboard.bots.channels.notConnected')}
                  yesLabel={t('dashboard.bots.channels.connected')}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onConnect(bot.id, 'instagram')}
                  data-testid={`connect-ig-${bot.id}`}
                  className="text-xs font-medium px-3 py-2 rounded-lg bg-ink-100 text-ink-900 hover:bg-ink-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Instagram className="h-3.5 w-3.5" />
                  {t('dashboard.bots.connectInstagram')}
                </button>
                <button
                  onClick={() => onConnect(bot.id, 'whatsapp')}
                  data-testid={`connect-wa-${bot.id}`}
                  className="text-xs font-medium px-3 py-2 rounded-lg bg-ink-100 text-ink-900 hover:bg-ink-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t('dashboard.bots.connectWhatsapp')}
                </button>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 pt-3 border-t border-ink-200">
                <button
                  className="text-xs text-ink-500 hover:text-brand-600 inline-flex items-center gap-1"
                  data-testid={`bot-edit-${bot.id}`}
                  disabled
                  title="coming soon"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => setConfirmId(bot.id)}
                  className="text-xs text-ink-500 hover:text-red-600 inline-flex items-center gap-1"
                  data-testid={`bot-delete-${bot.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmId && (
        <ConfirmModal
          message={t('dashboard.bots.confirmDelete')}
          onConfirm={() => onDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          danger
        />
      )}
    </div>
  );
}

function ChannelChip({ connected, label, icon: Icon, yesLabel, notLabel }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${
        connected ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-500'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label} · {connected ? yesLabel : notLabel}
    </span>
  );
}

export function ConfirmModal({ message, onConfirm, onCancel, confirmLabel, cancelLabel, danger }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink-900/40 backdrop-blur-sm" data-testid="confirm-modal">
      <div className="bg-white rounded-2xl border border-ink-200 shadow-xl w-full max-w-sm p-6 animate-slide-up">
        <p className="text-sm text-ink-900">{message}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost text-sm py-2 px-4" data-testid="modal-cancel">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            data-testid="modal-confirm"
            className={
              danger
                ? 'inline-flex items-center justify-center gap-2 bg-red-600 text-white font-medium rounded-lg px-4 py-2 text-sm hover:bg-red-700 transition'
                : 'btn-primary text-sm py-2 px-4'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
