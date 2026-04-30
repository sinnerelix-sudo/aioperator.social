import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Send, Check, X, AlertCircle } from 'lucide-react';
import { coachApi } from '../lib/api';

// Instagram DM-inspired coaching panel. The seller talks to their bot to
// instruct it; the bot confirms and returns a structured training update the
// seller can apply with one click.
export default function CoachChatPanel({ bot, onUsage, onTrainingUpdate }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [applying, setApplying] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!bot?.id) {
      setMessages([]);
      setLoadingHistory(false);
      return () => {};
    }
    setLoadingHistory(true);
    setLimitReached(false);
    (async () => {
      try {
        const { data } = await coachApi.list(bot.id);
        if (!cancelled) setMessages(data.messages || []);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bot?.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const quickPrompts = [
    { id: 'shortPrice', label: t('dashboard.coach.quick.shortPrice'), text: 'Qiymət soruşulduqda qısa cavab ver və müştərini sifarişə yönləndir.' },
    { id: 'discount10', label: t('dashboard.coach.quick.discount10'), text: 'Endirimi maksimum 10% ilə məhdudlaşdır.' },
    { id: 'handoff', label: t('dashboard.coach.quick.handoff'), text: 'Narazı müştərini dərhal insan operatora yönləndir.' },
    { id: 'askContact', label: t('dashboard.coach.quick.askContact'), text: 'Sifariş verəndə müştəridən ad və telefon nömrəsi iste.' },
    { id: 'delivery', label: t('dashboard.coach.quick.delivery'), text: 'Çatdırılma: Bakı içi 24 saat, regionlar 1-3 gün.' },
  ];

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || !bot?.id || sending) return;
    setSending(true);
    setInput('');
    // Optimistically append the seller bubble so the UI feels instant.
    const optimistic = {
      id: `tmp_${Date.now()}`,
      role: 'seller',
      message: msg,
      applied: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const { data } = await coachApi.send(bot.id, msg);
      // Replace optimistic entry and append the bot reply.
      setMessages((m) => {
        const withoutOpt = m.filter((x) => x.id !== optimistic.id);
        return [...withoutOpt, data.sellerMessage, data.botMessage];
      });
      if (data.usage && typeof onUsage === 'function') onUsage(data.usage);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 402) {
        setLimitReached(true);
        setMessages((m) => [
          ...m.filter((x) => x.id !== optimistic.id),
          optimistic,
          {
            id: `sys_${Date.now()}`,
            role: 'system',
            message: t('dashboard.coach.limitReached'),
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages((m) => [
          ...m.filter((x) => x.id !== optimistic.id),
          optimistic,
          {
            id: `sys_${Date.now()}`,
            role: 'system',
            message: err?.response?.data?.message || t('errors.generic'),
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setSending(false);
      inputRef.current?.focus?.();
    }
  };

  const applySuggestion = async (coachMsg) => {
    if (!coachMsg?.id || !bot?.id || applying) return;
    setApplying(coachMsg.id);
    try {
      const { data } = await coachApi.apply(bot.id, coachMsg.id);
      // Mark the bubble as applied in local state.
      setMessages((m) =>
        m.map((x) => (x.id === coachMsg.id ? { ...x, applied: true } : x))
      );
      if (typeof onTrainingUpdate === 'function') onTrainingUpdate(data.training);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: `sys_${Date.now()}`,
          role: 'system',
          message: err?.response?.data?.message || t('dashboard.coach.applyFailed'),
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setApplying(null);
    }
  };

  const dismissSuggestion = (coachMsgId) => {
    // UI-only dismissal — the backend suggestion is still stored but we hide
    // the apply buttons so the seller doesn't see them again.
    setMessages((m) =>
      m.map((x) =>
        x.id === coachMsgId ? { ...x, suggestedTrainingUpdate: null } : x
      )
    );
  };

  const submit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div
      className="bg-white border border-ink-200 rounded-[22px] overflow-hidden flex flex-col h-[560px] sm:h-[620px] shadow-[0_8px_32px_-16px_rgba(99,102,241,0.25)]"
      data-testid="coach-chat-panel"
    >
      {/* DM-style gradient header */}
      <div className="relative px-4 py-3 bg-brand-gradient text-white flex items-center gap-3">
        <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden style={{
          backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(255,255,255,0.35) 0, transparent 55%)',
        }} />
        <div className="relative h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0 ring-2 ring-white/30">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="font-display font-semibold text-sm truncate" data-testid="coach-header-title">
            {bot?.name || t('dashboard.coach.headerTitle')}
          </div>
          <div className="text-[11px] text-white/80 flex items-center gap-1.5 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
            {t('dashboard.coach.headerStatus')}
          </div>
        </div>
      </div>

      {/* Scrollable message stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 bg-gradient-to-b from-white to-ink-50"
        data-testid="coach-messages"
      >
        {loadingHistory ? (
          <div className="text-[11px] text-ink-500 text-center py-8" data-testid="coach-loading">
            {t('dashboard.coach.loadingHistory')}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-xs text-ink-500 bg-white border border-ink-200 rounded-xl px-3 py-3 text-center" data-testid="coach-empty">
            {t('dashboard.coach.systemHint')}
          </div>
        ) : (
          messages.map((m) => (
            <CoachBubble
              key={m.id}
              m={m}
              onApply={applySuggestion}
              onDismiss={dismissSuggestion}
              applying={applying === m.id}
              t={t}
            />
          ))
        )}

        {sending && (
          <div className="flex justify-start" data-testid="coach-typing">
            <div className="rounded-2xl bg-white border border-ink-200 text-ink-700 px-3 py-2 text-xs inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-ink-500 rounded-full animate-pulse" />
              <span className="h-1.5 w-1.5 bg-ink-500 rounded-full animate-pulse [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 bg-ink-500 rounded-full animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div className="px-3 pt-3 pb-1 border-t border-ink-200 bg-white" data-testid="coach-quick-prompts">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5 px-1">
          {t('dashboard.coach.quickPrompts')}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {quickPrompts.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => sendMessage(q.text)}
              disabled={!bot?.id || sending || limitReached}
              data-testid={`coach-quick-${q.id}`}
              className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <form onSubmit={submit} className="p-3 bg-white flex items-center gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!bot?.id || limitReached}
          placeholder={t('dashboard.coach.inputPlaceholder')}
          data-testid="coach-input"
          className="flex-1 rounded-full bg-ink-50 border border-ink-200 px-4 py-2.5 text-sm placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:bg-white transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!bot?.id || !input.trim() || sending || limitReached}
          data-testid="coach-send"
          aria-label={t('dashboard.coach.send')}
          className="h-10 w-10 rounded-full bg-brand-gradient text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function CoachBubble({ m, onApply, onDismiss, applying, t }) {
  if (m.role === 'system') {
    return (
      <div className="flex justify-center">
        <div
          className="max-w-[90%] rounded-lg bg-red-50 text-red-700 text-xs px-3 py-2 inline-flex items-start gap-1.5"
          data-testid="coach-system-msg"
        >
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{m.message}</span>
        </div>
      </div>
    );
  }

  const isSeller = m.role === 'seller';
  const hasSuggestion =
    !isSeller &&
    !m.applied &&
    m.suggestedTrainingUpdate &&
    Object.keys(m.suggestedTrainingUpdate).length > 0;

  return (
    <div className={`flex ${isSeller ? 'justify-end' : 'justify-start'} items-end gap-2`}>
      {!isSeller && (
        <div className="h-7 w-7 rounded-full bg-brand-gradient flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'} max-w-[82%]`}>
        <div
          className={`rounded-[20px] px-3.5 py-2 leading-relaxed text-sm whitespace-pre-wrap break-words ${
            isSeller
              ? 'bg-brand-gradient text-white rounded-br-md'
              : 'bg-white border border-ink-200 text-ink-900 rounded-bl-md shadow-sm'
          }`}
          data-testid={isSeller ? 'coach-seller-msg' : 'coach-bot-msg'}
        >
          {m.message}
        </div>

        {hasSuggestion && (
          <div className="mt-1.5 flex items-center gap-1.5" data-testid={`coach-suggestion-${m.id}`}>
            <button
              type="button"
              onClick={() => onApply(m)}
              disabled={applying}
              data-testid={`coach-apply-${m.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-60"
            >
              <Check className="h-3 w-3" />
              {applying ? '...' : t('dashboard.coach.applyToTraining')}
            </button>
            <button
              type="button"
              onClick={() => onDismiss(m.id)}
              data-testid={`coach-cancel-${m.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200 transition"
            >
              <X className="h-3 w-3" />
              {t('dashboard.coach.cancel')}
            </button>
          </div>
        )}

        {!isSeller && m.applied && (
          <div className="mt-1 text-[10px] text-emerald-700 font-medium inline-flex items-center gap-1">
            <Check className="h-3 w-3" />
            {t('dashboard.coach.applied')}
          </div>
        )}

        {!isSeller && m.mock && !m.applied && !hasSuggestion && (
          <div className="mt-1 text-[10px] text-ink-500 italic">
            {t('dashboard.coach.mockNote')}
          </div>
        )}
      </div>
    </div>
  );
}
