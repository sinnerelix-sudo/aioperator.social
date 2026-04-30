import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Send, AlertCircle } from 'lucide-react';
import { botsApi } from '../lib/api';

/**
 * Inline test-chat simulator. Talks to /api/bots/:id/test-message and shows
 * the bot reply + which products matched. No "token" wording, ever — only
 * message counter is exposed to the seller.
 */
export default function BotTesterPanel({ bot, onUsage }) {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    setLimitReached(false);
  }, [bot?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (e) => {
    e?.preventDefault?.();
    if (!bot?.id || !input.trim() || sending) return;
    const userMsg = { role: 'user', text: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);
    try {
      const { data } = await botsApi.testMessage(bot.id, userMsg.text, i18n.language);
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: data.reply,
          matched: data.matchedProducts || [],
          mock: !!data.mock,
        },
      ]);
      if (data.usage && typeof onUsage === 'function') onUsage(data.usage);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 402) {
        setLimitReached(true);
        setMessages((m) => [
          ...m,
          {
            role: 'system',
            text: msg || t('dashboard.tester.limitReached'),
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: 'system', text: msg || t('errors.generic') },
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="bg-white border border-ink-200 rounded-xl p-5 flex flex-col h-[520px]"
      data-testid="bot-tester-panel"
    >
      <div className="flex items-center gap-2 pb-3 border-b border-ink-200">
        <span className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </span>
        <div className="min-w-0">
          <div className="font-display font-semibold text-sm text-ink-900 truncate">
            {t('dashboard.tester.title')}
          </div>
          <div className="text-[11px] text-ink-500 truncate">
            {bot?.name ? `${bot.name} · ${t('dashboard.tester.hint')}` : t('dashboard.tester.selectBot')}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-2 text-sm"
        data-testid="bot-tester-messages"
      >
        {messages.length === 0 && (
          <div className="text-xs text-ink-500 bg-ink-50 border border-ink-200 rounded-lg px-3 py-2">
            {t('dashboard.tester.placeholder')}
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} m={m} t={t} />
        ))}
        {sending && (
          <div className="flex justify-start" data-testid="bot-tester-typing">
            <div className="rounded-2xl bg-ink-100 text-ink-700 px-3 py-2 text-xs inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-ink-500 rounded-full animate-pulse" />
              <span className="h-1.5 w-1.5 bg-ink-500 rounded-full animate-pulse [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 bg-ink-500 rounded-full animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={send} className="pt-3 border-t border-ink-200 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!bot?.id || limitReached}
          data-testid="bot-tester-input"
          placeholder={t('dashboard.tester.inputPlaceholder')}
          className="input-base flex-1"
        />
        <button
          type="submit"
          disabled={!bot?.id || !input.trim() || sending || limitReached}
          data-testid="bot-tester-send"
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ m, t }) {
  if (m.role === 'system') {
    return (
      <div className="flex justify-center" data-testid="tester-system-msg">
        <div className="max-w-[90%] rounded-lg bg-red-50 text-red-700 text-xs px-3 py-2 inline-flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{m.text}</span>
        </div>
      </div>
    );
  }
  const isUser = m.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed text-sm ${
          isUser
            ? 'bg-brand-gradient text-white'
            : 'bg-ink-50 border border-ink-200 text-ink-900'
        }`}
        data-testid={isUser ? 'tester-user-msg' : 'tester-bot-msg'}
      >
        <div>{m.text}</div>
        {!isUser && Array.isArray(m.matched) && m.matched.length > 0 && (
          <div className="mt-2 pt-2 border-t border-ink-200/60 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
              {t('dashboard.tester.matched')}
            </div>
            {m.matched.map((p) => (
              <div key={p.id} className="text-[11px] text-ink-700 flex items-center justify-between gap-2">
                <span className="truncate">{p.name}</span>
                <span className="font-semibold shrink-0">
                  {p.discountPrice && p.discountPrice < p.price
                    ? `${p.discountPrice} ₼`
                    : `${p.price} ₼`}
                </span>
              </div>
            ))}
          </div>
        )}
        {!isUser && m.mock && (
          <div className="mt-2 text-[10px] text-ink-500 italic">
            {t('dashboard.tester.mockNote')}
          </div>
        )}
      </div>
    </div>
  );
}
