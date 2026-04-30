import { Instagram, MessageCircle, Search, Users, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';

// Platform badge — Instagram gradient square for IG-linked bots,
// emerald square for WhatsApp, neutral for bots with no channel yet.
export function BotAvatar({ bot, size = 40 }) {
  const px = `${size}px`;
  if (bot?.instagramHandle) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm"
        style={{
          width: px,
          height: px,
          background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
        }}
      >
        <Instagram className="text-white" style={{ height: size * 0.5, width: size * 0.5 }} />
      </div>
    );
  }
  if (bot?.whatsappNumber) {
    return (
      <div
        className="rounded-full bg-emerald-500 flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm"
        style={{ width: px, height: px }}
      >
        <MessageCircle className="text-white" style={{ height: size * 0.5, width: size * 0.5 }} />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-ink-200 flex items-center justify-center shrink-0 ring-2 ring-white"
      style={{ width: px, height: px }}
    >
      <Sparkles className="text-ink-500" style={{ height: size * 0.5, width: size * 0.5 }} />
    </div>
  );
}

export function botSubtitle(bot, t) {
  if (bot?.instagramHandle) {
    const h = bot.instagramHandle.startsWith('@') ? bot.instagramHandle : `@${bot.instagramHandle}`;
    return { icon: Instagram, label: h, tone: 'text-pink-600' };
  }
  if (bot?.whatsappNumber) {
    return { icon: MessageCircle, label: bot.whatsappNumber, tone: 'text-emerald-600' };
  }
  return { icon: null, label: t('dashboard.trainingInbox.channelNone'), tone: 'text-ink-500' };
}

/**
 * Instagram DM-style inbox. Two modes:
 *  - "select" (default): click a row → onSelect(bot)
 *  - "multi": rows become checkboxes, onToggle(botId)
 */
export default function BotInboxList({
  bots,
  selectedBotId,
  selectedBotIds = [],
  mode = 'select',
  onSelect,
  onToggle,
  onOpenBroadcast,
  onOpenCreate,
  headerExtra,
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bots;
    return bots.filter((b) => {
      const hay = [b.name, b.instagramHandle, b.whatsappNumber, b.niche]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [bots, query]);

  return (
    <aside
      className="w-full sm:w-[320px] lg:w-[340px] shrink-0 flex flex-col bg-white border border-ink-200 rounded-2xl overflow-hidden h-[calc(100vh-140px)] min-h-[560px]"
      data-testid="bot-inbox-list"
    >
      <header className="px-4 pt-4 pb-3 border-b border-ink-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-lg text-ink-900 truncate">
              {t('dashboard.trainingInbox.title')}
            </h2>
            <p className="text-[11px] text-ink-500 truncate">
              {t('dashboard.trainingInbox.subtitle')}
            </p>
          </div>
        </div>
        {mode === 'select' ? (
          <button
            type="button"
            onClick={onOpenBroadcast}
            disabled={!bots?.length}
            data-testid="open-broadcast-btn"
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-brand-gradient text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Users className="h-3.5 w-3.5" />
            {t('dashboard.trainingInbox.broadcastButton')}
          </button>
        ) : (
          headerExtra
        )}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('dashboard.trainingInbox.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-sm bg-ink-50 rounded-full border border-ink-200 focus:outline-none focus:bg-white focus:border-brand-600 placeholder:text-ink-400"
            data-testid="inbox-search"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto" data-testid="inbox-bot-list">
        {bots.length === 0 ? (
          <EmptyState t={t} onCreate={onOpenCreate} />
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-ink-500">—</div>
        ) : (
          filtered.map((b) => (
            <BotRow
              key={b.id}
              bot={b}
              selected={mode === 'select' && b.id === selectedBotId}
              checked={mode === 'multi' && selectedBotIds.includes(b.id)}
              mode={mode}
              t={t}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function BotRow({ bot, selected, checked, mode, t, onSelect, onToggle }) {
  const sub = botSubtitle(bot, t);
  const SubIcon = sub.icon;
  const click = () => (mode === 'multi' ? onToggle?.(bot.id) : onSelect?.(bot));

  return (
    <button
      type="button"
      onClick={click}
      data-testid={`bot-row-${bot.id}`}
      className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-ink-100 transition-colors ${
        selected
          ? 'bg-brand-50'
          : checked
          ? 'bg-emerald-50'
          : 'hover:bg-ink-50'
      }`}
    >
      {mode === 'multi' && (
        <span
          className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
            checked ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300'
          }`}
          aria-hidden
        >
          {checked && (
            <svg viewBox="0 0 20 20" className="h-3 w-3 text-white" fill="currentColor">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
          )}
        </span>
      )}
      <BotAvatar bot={bot} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-sm text-ink-900 truncate">{bot.name}</span>
        </div>
        <div className={`flex items-center gap-1 text-[11px] ${sub.tone} truncate`}>
          {SubIcon ? <SubIcon className="h-3 w-3 shrink-0" /> : null}
          <span className="truncate">{sub.label}</span>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ t, onCreate }) {
  return (
    <div className="p-8 text-center" data-testid="inbox-empty">
      <div className="mx-auto h-12 w-12 rounded-xl bg-ink-100 flex items-center justify-center mb-3">
        <Sparkles className="h-5 w-5 text-ink-400" />
      </div>
      <p className="text-sm text-ink-700 font-medium">{t('dashboard.trainingInbox.empty')}</p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-3 inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-gradient text-white"
        data-testid="inbox-empty-cta"
      >
        {t('dashboard.trainingInbox.emptyCta')}
      </button>
    </div>
  );
}
