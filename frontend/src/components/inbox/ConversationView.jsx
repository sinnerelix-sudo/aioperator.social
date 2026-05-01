import { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Instagram,
  MessageCircle,
  ArrowRight,
  UserCog,
  ShoppingBag,
  Check,
  ChevronDown,
  Send,
  Bot as BotIcon,
} from 'lucide-react';
import { useInbox, AI_STATUSES, AI_STATUS_TONES } from '../../context/InboxContext.jsx';
import HandoffModal from './HandoffModal.jsx';
import {
  buildInstagramLink,
  buildWhatsAppLink,
  formatPhoneDisplay,
  normaliseInstagramHandle,
} from '../../lib/orderHelpers';

/**
 * Shared conversation view used by both InboxPage and AssignedConversationsPage.
 *
 * Props:
 *   mode                 'inbox' | 'assigned'
 *   conversationsFilter  (c) => boolean — extra scope filter (e.g. assignedToHuman)
 *   emptyLabelKey        i18n key for empty state
 *   handoffDirection     'to-human' | 'to-bot'
 *   handoffButtonLabelKey 'dashboard.inbox.handoff' | 'dashboard.inbox.handoffToBot'
 *   showComposer         boolean — show composer input (true on assigned page)
 */
export default function ConversationView({
  mode,
  conversationsFilter,
  emptyLabelKey,
  handoffDirection,
  handoffButtonLabelKey,
  showComposer,
}) {
  const { t, i18n } = useTranslation();
  const {
    conversations,
    toggleConvertToOrder,
    setAiStatus,
    applyHandoff,
    sendOperatorMessage,
  } = useInbox();

  const [search, setSearch] = useState('');
  const [aiFilter, setAiFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const statusBtnRef = useRef(null);

  // Scope + search + AI status filter
  const scoped = useMemo(() => {
    return conversations.filter((c) => {
      if (conversationsFilter && !conversationsFilter(c)) return false;
      if (search && !c.customer.toLowerCase().includes(search.toLowerCase())) return false;
      if (aiFilter !== 'all' && c.aiStatus !== aiFilter) return false;
      return true;
    });
  }, [conversations, conversationsFilter, search, aiFilter]);

  // Auto-pick selected id when list changes
  useEffect(() => {
    if (!scoped.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !scoped.find((c) => c.id === selectedId)) {
      setSelectedId(scoped[0].id);
    }
  }, [scoped, selectedId]);

  const selected = scoped.find((c) => c.id === selectedId) || null;

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusDropdownOpen) return undefined;
    const onDoc = (e) => {
      if (statusBtnRef.current && statusBtnRef.current.contains(e.target)) return;
      setStatusDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [statusDropdownOpen]);

  const handleConfirmHandoff = ({ mode: newMode, until }) => {
    if (!selected) return;
    applyHandoff(selected.id, newMode, until);
    setHandoffOpen(false);
  };

  const handleSend = () => {
    if (!selected || !composerText.trim()) return;
    sendOperatorMessage(selected.id, composerText);
    setComposerText('');
  };

  return (
    <>
      <div className="mt-6 grid lg:grid-cols-[340px_1fr] gap-0 bg-white border border-ink-200 rounded-xl overflow-hidden min-h-[60vh]">
        {/* Left: list */}
        <div className="border-b lg:border-b-0 lg:border-r border-ink-200 flex flex-col">
          <div className="p-3 border-b border-ink-200 space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                data-testid="inbox-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.inbox.searchPlaceholder')}
                className="input-base pl-9 py-2 text-sm w-full"
              />
            </div>
            {/* AI filter chips */}
            <FilterChips active={aiFilter} onChange={setAiFilter} t={t} />
          </div>

          {scoped.length === 0 ? (
            <div
              className="flex-1 flex items-center justify-center text-xs text-ink-500 p-6 text-center"
              data-testid="inbox-empty"
            >
              {t(emptyLabelKey)}
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto max-h-[60vh] divide-y divide-ink-200">
              {scoped.map((c) => (
                <li key={c.id}>
                  <ConversationListItem
                    c={c}
                    active={selected?.id === c.id}
                    onClick={() => setSelectedId(c.id)}
                    t={t}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: chat panel */}
        <div className="flex flex-col" data-testid="inbox-conversation">
          {selected ? (
            <>
              <ChatHeader
                c={selected}
                mode={mode}
                handoffButtonLabelKey={handoffButtonLabelKey}
                onHandoff={() => setHandoffOpen(true)}
                onToggleConvert={() => toggleConvertToOrder(selected.id)}
                onChangeAiStatus={(s) => { setAiStatus(selected.id, s); setStatusDropdownOpen(false); }}
                statusDropdownOpen={statusDropdownOpen}
                setStatusDropdownOpen={setStatusDropdownOpen}
                statusBtnRef={statusBtnRef}
                t={t}
              />
              <MessageList c={selected} locale={i18n.language} t={t} />
              {showComposer && (
                <div className="p-3 border-t border-ink-200 bg-white">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={t('dashboard.inbox.composer.placeholder')}
                      rows={1}
                      data-testid="inbox-composer-input"
                      className="flex-1 resize-none px-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!composerText.trim()}
                      data-testid="inbox-composer-send"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {t('dashboard.inbox.composer.send')}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-ink-500">
              {t('dashboard.inbox.selectConversation')}
            </div>
          )}
        </div>
      </div>

      <HandoffModal
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        onConfirm={handleConfirmHandoff}
        direction={handoffDirection}
        currentMode={selected?.handoffMode}
        t={t}
      />
    </>
  );
}

/* ---------------------------- sub-components ---------------------------- */

function FilterChips({ active, onChange, t }) {
  const chips = ['all', ...AI_STATUSES];
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="inbox-filter-chips">
      {chips.map((k) => {
        const isActive = k === active;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            data-testid={`inbox-filter-${k}`}
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ring-1 transition whitespace-nowrap
              ${isActive
                ? 'bg-ink-900 text-white ring-ink-900'
                : 'bg-white text-ink-700 ring-ink-200 hover:bg-ink-50'}`}
          >
            {t(`dashboard.inbox.filters.${k}`)}
          </button>
        );
      })}
    </div>
  );
}

function ConversationListItem({ c, active, onClick, t }) {
  const contact = resolveContact(c);
  return (
    <button
      data-testid={`inbox-item-${c.id}`}
      onClick={onClick}
      className={`w-full text-left p-3 hover:bg-ink-50 flex gap-3 items-start ${active ? 'bg-brand-gradient-soft' : ''}`}
    >
      <Avatar c={c} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink-900 truncate flex items-center gap-1.5">
            {c.customer}
            {c.convertedToOrder && (
              <ShoppingBag
                className="h-3.5 w-3.5 text-emerald-600 shrink-0"
                data-testid={`inbox-order-icon-${c.id}`}
                aria-label="converted-to-order"
              />
            )}
          </span>
          {c.unread > 0 && (
            <span className="text-[10px] font-bold px-1.5 rounded-full bg-red-500 text-white">{c.unread}</span>
          )}
        </div>
        <div className="text-xs text-ink-500 truncate mt-0.5">{c.lastMessage}</div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-500 min-w-0">
          <contact.Icon />
          <span className="truncate">{contact.label}</span>
          {c.aiStatus && (
            <>
              <span>·</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${AI_STATUS_TONES[c.aiStatus] || ''}`}>
                {t(`dashboard.inbox.filters.${c.aiStatus}`)}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function ChatHeader({
  c, mode, handoffButtonLabelKey, onHandoff, onToggleConvert, onChangeAiStatus,
  statusDropdownOpen, setStatusDropdownOpen, statusBtnRef, t,
}) {
  const contact = resolveContact(c);
  const modeBadge = t(`dashboard.inbox.modeBadge.${c.handoffMode || 'bot_only'}`);
  const modeToneMap = {
    bot_only: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    human_only: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    human_only_until: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    bot_only_until: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    human_and_bot: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  };
  const modeTone = modeToneMap[c.handoffMode || 'bot_only'];

  return (
    <div className="p-4 border-b border-ink-200 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar c={c} size={40} />
        <div className="min-w-0">
          <div className="font-display font-semibold text-base text-ink-900 flex items-center gap-2 flex-wrap">
            <span>{c.customer}</span>
            <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${modeTone}`}
              data-testid={`inbox-mode-badge-${c.id}`}
            >
              <BotIcon className="inline h-3 w-3 mr-1" />
              {modeBadge}
            </span>
          </div>
          <div className="text-[11px] text-ink-500 flex items-center gap-1 mt-0.5 min-w-0">
            <contact.Icon />
            {contact.href ? (
              <a
                href={contact.href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`inbox-contact-link-${c.id}`}
                className="font-medium text-ink-800 hover:text-brand-700 hover:underline decoration-brand-400 underline-offset-2 truncate"
                title={contact.label}
              >
                {contact.label}
              </a>
            ) : (
              <span className="text-ink-500">{contact.label}</span>
            )}
            <span>·</span>
            <span>Lead {c.leadScore}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Manual AI status change dropdown */}
        <div className="relative" ref={statusBtnRef}>
          <button
            type="button"
            onClick={() => setStatusDropdownOpen((v) => !v)}
            data-testid={`inbox-status-change-${c.id}`}
            className="text-xs font-medium px-2.5 py-2 rounded-lg bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 inline-flex items-center gap-1.5"
          >
            <span>{t('dashboard.inbox.statusChange')}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {statusDropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-52 bg-white shadow-xl ring-1 ring-ink-200 rounded-lg py-1 z-20"
              data-testid={`inbox-status-menu-${c.id}`}
              role="listbox"
            >
              {AI_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeAiStatus(s)}
                  data-testid={`inbox-status-option-${c.id}-${s}`}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium transition whitespace-nowrap
                    ${s === c.aiStatus ? 'bg-ink-100 text-ink-900' : 'text-ink-700 hover:bg-ink-50'}`}
                >
                  {t(`dashboard.inbox.filters.${s}`)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onHandoff}
          className="text-xs font-medium px-3 py-2 rounded-lg bg-ink-100 text-ink-900 hover:bg-ink-200 transition flex items-center gap-1.5"
          data-testid={mode === 'assigned' ? 'inbox-handoff-to-bot-btn' : 'inbox-handoff-btn'}
        >
          <UserCog className="h-3.5 w-3.5" />
          {t(handoffButtonLabelKey)}
        </button>
        <button
          onClick={onToggleConvert}
          data-testid={`inbox-convert-btn-${c.id}`}
          className={`text-xs font-medium px-3 py-2 rounded-lg transition flex items-center gap-1.5
            ${c.convertedToOrder
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-brand-gradient text-white hover:opacity-90'}`}
        >
          {c.convertedToOrder ? (
            <>
              <Check className="h-3.5 w-3.5" />
              {t('dashboard.inbox.convertedOrder')}
            </>
          ) : (
            <>
              {t('dashboard.inbox.convertOrder')}
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function MessageList({ c, locale, t }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [c.messages.length, c.id]);

  return (
    <div ref={scrollRef} className="p-4 sm:p-6 flex-1 overflow-y-auto bg-ink-50/50 space-y-3" data-testid="inbox-messages">
      {c.messages.map((m, i) => {
        const isCustomer = m.from === 'customer';
        const isOperator = m.from === 'operator';
        // Bot & operator align right (outbound side), customer aligns left.
        const alignRight = !isCustomer;
        const labelKey = isOperator
          ? 'dashboard.inbox.fromOperator'
          : isCustomer
            ? 'dashboard.inbox.fromCustomer'
            : 'dashboard.inbox.fromBot';
        const bubbleClass = isOperator
          ? 'bg-emerald-600 text-white'
          : isCustomer
            ? 'bg-white border border-ink-200 text-ink-900'
            : 'bg-brand-gradient text-white';
        return (
          <div key={i} className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%]">
              <div className={`text-[10px] mb-1 ${alignRight ? 'text-right text-ink-500' : 'text-ink-500'}`}>
                {t(labelKey)}
                {' · '}
                {new Date(m.at).toLocaleTimeString(locale === 'tr' ? 'tr-TR' : 'az-AZ', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${bubbleClass}`}>{m.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------- helpers ---------------------------- */

function Avatar({ c, size = 36 }) {
  const [broken, setBroken] = useState(false);
  const url = c.avatarUrl || c.profilePictureUrl || c.customerAvatar;
  const dim = { width: size, height: size };
  if (url && !broken) {
    return (
      <img
        src={url}
        alt={c.customer}
        onError={() => setBroken(true)}
        style={dim}
        data-testid={`inbox-avatar-img-${c.id}`}
        className="rounded-full object-cover shrink-0 ring-1 ring-ink-200"
      />
    );
  }
  return (
    <div
      style={dim}
      data-testid={`inbox-avatar-initials-${c.id}`}
      className="rounded-full bg-brand-gradient text-white font-semibold flex items-center justify-center shrink-0"
    >
      <span className={size >= 40 ? 'text-sm' : 'text-xs'}>{c.avatar}</span>
    </div>
  );
}

function resolveContact(c) {
  if (c.platform === 'instagram') {
    const handle = normaliseInstagramHandle(c.instagramHandle || '');
    return {
      Icon: () => <Instagram className="h-3 w-3 text-pink-600 shrink-0" />,
      label: handle ? `@${handle}` : '—',
      href: buildInstagramLink(handle),
    };
  }
  const raw = c.whatsappNumber || '';
  const label = formatPhoneDisplay(raw);
  return {
    Icon: () => <MessageCircle className="h-3 w-3 text-emerald-600 shrink-0" />,
    label: label || '—',
    href: buildWhatsAppLink(raw),
  };
}
