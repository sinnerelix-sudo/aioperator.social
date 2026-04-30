import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Users, AlertCircle, Sparkles, X, ArrowLeft, ClipboardList } from 'lucide-react';
import { coachApi } from '../lib/api';
import { BotAvatar, botSubtitle } from './BotInboxList';
import TrainingFieldsPanel from './TrainingFieldsPanel';

/**
 * Group broadcast coach chat: one seller bubble, N bot reply bubbles stacked
 * per seller message. The side rail lists each selected bot with a
 * "Verilən təlimatları göstər" expandable drawer. Backend fan-out is done by
 * POST /api/coach/broadcast (one usage unit per bot).
 */
export default function GroupCoachChat({ bots, onExit, onUsage }) {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState([]); // [{ id, sellerMessage, replies: [{botId, botName, reply, ...}] }]
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [expandedBotId, setExpandedBotId] = useState(null);
  const [trainingRefresh, setTrainingRefresh] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rounds, sending]);

  const send = async (e) => {
    e?.preventDefault?.();
    if (!input.trim() || sending || bots.length === 0) return;
    const msg = input.trim();
    setInput('');
    const roundId = `r_${Date.now()}`;
    setRounds((r) => [
      ...r,
      {
        id: roundId,
        sellerMessage: msg,
        replies: null, // null = pending
      },
    ]);
    setSending(true);
    try {
      const { data } = await coachApi.broadcast(
        msg,
        bots.map((b) => b.id)
      );
      setRounds((r) =>
        r.map((x) => (x.id === roundId ? { ...x, replies: data.results } : x))
      );
      if (typeof onUsage === 'function') onUsage(data.usage);
      if (data.results.some((r) => r.skipped)) setLimitReached(true);
    } catch (err) {
      const status = err?.response?.status;
      setRounds((r) =>
        r.map((x) =>
          x.id === roundId
            ? {
                ...x,
                replies: [],
                error:
                  status === 402
                    ? t('dashboard.coach.limitReached')
                    : err?.response?.data?.message || t('errors.generic'),
              }
            : x
        )
      );
      if (status === 402) setLimitReached(true);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    t('dashboard.coach.quick.shortPrice'),
    t('dashboard.coach.quick.discount10'),
    t('dashboard.coach.quick.handoff'),
    t('dashboard.coach.quick.askContact'),
    t('dashboard.coach.quick.delivery'),
  ];
  const quickTexts = [
    'Hamınız qiymət cavablarını qısa edin və sifarişə yönləndirin.',
    'Hamınız maksimum 10% endirim verin.',
    'Hamınız narazı müştərini dərhal operatora yönləndirin.',
    'Hamınız sifariş üçün müştəridən ad və nömrə isteyin.',
    'Hamınız çatdırılma məlumatını əlavə edin: Bakı içi 24 saat, regionlar 1-3 gün.',
  ];

  const applyOne = async (botId, coachMessageId, roundId) => {
    try {
      const { data } = await coachApi.apply(botId, coachMessageId);
      setRounds((r) =>
        r.map((x) =>
          x.id === roundId
            ? {
                ...x,
                replies: x.replies?.map((rep) =>
                  rep.botId === botId && rep.botMessage?.id === coachMessageId
                    ? { ...rep, applied: true }
                    : rep
                ),
              }
            : x
        )
      );
      // Push a refresh key so the expanded TrainingFieldsPanel can refetch.
      if (expandedBotId === botId) {
        setTrainingRefresh({ ...data.training, botId });
      }
    } catch {
      // silent — error toast already at per-call level if needed
    }
  };

  return (
    <div
      className="flex-1 min-w-0 flex flex-col lg:flex-row gap-4"
      data-testid="group-coach-chat"
    >
      {/* Chat column */}
      <div className="flex-1 min-w-0 bg-white border border-ink-200 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[560px]">
        <div className="px-4 py-3 bg-brand-gradient text-white flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
            data-testid="group-exit-btn"
            aria-label={t('dashboard.trainingInbox.exitGroup')}
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-2 ring-white/30">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold text-sm truncate" data-testid="group-header-title">
              {t('dashboard.trainingInbox.broadcastHeader', { count: bots.length })}
            </div>
            <div className="text-[11px] text-white/80 truncate">
              {bots.map((b) => b.name).join(' · ')}
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gradient-to-b from-white to-ink-50"
          data-testid="group-messages"
        >
          {rounds.length === 0 ? (
            <div className="text-xs text-ink-500 bg-white border border-ink-200 rounded-xl px-3 py-3 text-center">
              {t('dashboard.trainingInbox.broadcastEmpty')}
            </div>
          ) : (
            rounds.map((r) => (
              <GroupRound
                key={r.id}
                round={r}
                bots={bots}
                onApply={(botId, coachMessageId) => applyOne(botId, coachMessageId, r.id)}
                t={t}
              />
            ))
          )}
          {sending && (
            <div className="flex justify-start" data-testid="group-typing">
              <div className="rounded-2xl bg-white border border-ink-200 text-ink-700 px-3 py-2 text-xs inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-ink-500 rounded-full animate-pulse" />
                <span className="h-1.5 w-1.5 bg-ink-500 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 bg-ink-500 rounded-full animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>

        <div className="px-3 pt-3 pb-1 border-t border-ink-200 bg-white">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-1.5 px-1">
            {t('dashboard.coach.quickPrompts')}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {quickPrompts.map((lbl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInput(quickTexts[i])}
                disabled={sending || limitReached}
                className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                data-testid={`group-quick-${i}`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={send} className="p-3 bg-white flex items-center gap-2 border-t border-ink-100">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('dashboard.trainingInbox.broadcastPlaceholder')}
            disabled={limitReached}
            data-testid="group-input"
            className="flex-1 rounded-full bg-ink-50 border border-ink-200 px-4 py-2.5 text-sm placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:bg-white transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || limitReached}
            data-testid="group-send"
            className="h-10 w-10 rounded-full bg-brand-gradient text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Right rail: per-bot cards + "Verilən təlimatları göstər" */}
      <div className="w-full lg:w-[340px] shrink-0 space-y-2 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:pr-1" data-testid="group-bot-rail">
        {bots.map((b) => (
          <div
            key={b.id}
            className="bg-white border border-ink-200 rounded-xl overflow-hidden"
            data-testid={`group-bot-card-${b.id}`}
          >
            <div className="p-3 flex items-center gap-3">
              <BotAvatar bot={b} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-ink-900 truncate">{b.name}</div>
                <div className="text-[11px] text-ink-500 truncate">
                  {botSubtitle(b, t).label}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setExpandedBotId((x) => (x === b.id ? null : b.id))
              }
              className="w-full text-left px-3 py-2 text-xs font-medium border-t border-ink-200 bg-ink-50 hover:bg-ink-100 transition-colors inline-flex items-center gap-1.5"
              data-testid={`group-show-instructions-${b.id}`}
            >
              <ClipboardList className="h-3.5 w-3.5 text-brand-600" />
              {expandedBotId === b.id
                ? t('dashboard.trainingInbox.hideInstructions')
                : t('dashboard.trainingInbox.showInstructions')}
            </button>
            {expandedBotId === b.id && (
              <div className="border-t border-ink-200 bg-white">
                <TrainingFieldsPanel
                  bot={b}
                  embedded
                  initiallyOpen
                  externalTraining={
                    trainingRefresh && trainingRefresh.botId === b.id ? trainingRefresh : null
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupRound({ round, bots, onApply, t }) {
  const byId = (id) => bots.find((b) => b.id === id);
  return (
    <div className="space-y-2" data-testid={`group-round-${round.id}`}>
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[20px] rounded-br-md px-3.5 py-2 text-sm bg-brand-gradient text-white whitespace-pre-wrap break-words" data-testid="group-seller-msg">
          {round.sellerMessage}
        </div>
      </div>

      {round.replies === null ? null : round.error ? (
        <div className="flex justify-center">
          <div className="max-w-[90%] rounded-lg bg-red-50 text-red-700 text-xs px-3 py-2 inline-flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{round.error}</span>
          </div>
        </div>
      ) : round.replies.length === 0 ? null : (
        <div className="space-y-1.5">
          {round.replies.map((rep) => (
            <ReplyBubble
              key={rep.botId + (rep.botMessage?.id || '_skip')}
              rep={rep}
              bot={byId(rep.botId)}
              onApply={onApply}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyBubble({ rep, bot, onApply, t }) {
  if (rep.skipped) {
    return (
      <div className="flex justify-start items-end gap-2" data-testid={`group-reply-skipped-${rep.botId}`}>
        <BotAvatar bot={bot} size={28} />
        <div className="text-[11px] text-red-700 bg-red-50 rounded-lg px-2 py-1">
          {bot?.name}: {t('dashboard.coach.limitReached')}
        </div>
      </div>
    );
  }
  const hasSuggestion =
    !rep.applied && rep.suggestedTrainingUpdate && Object.keys(rep.suggestedTrainingUpdate).length > 0;
  return (
    <div className="flex justify-start items-end gap-2" data-testid={`group-reply-${rep.botId}`}>
      <BotAvatar bot={bot} size={28} />
      <div className="flex flex-col items-start max-w-[82%]">
        <div className="text-[10px] text-ink-500 mb-0.5 font-medium truncate max-w-[260px]">
          {bot?.name || rep.botName}
        </div>
        <div className="rounded-[20px] rounded-bl-md px-3.5 py-2 text-sm bg-white border border-ink-200 text-ink-900 shadow-sm whitespace-pre-wrap break-words">
          {rep.reply}
        </div>
        {hasSuggestion && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={() => onApply(rep.botId, rep.botMessage.id)}
              data-testid={`group-apply-${rep.botId}`}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {t('dashboard.coach.applyToTraining')}
            </button>
          </div>
        )}
        {rep.applied && (
          <div className="mt-1 text-[10px] text-emerald-700 font-medium">
            {t('dashboard.coach.applied')}
          </div>
        )}
      </div>
    </div>
  );
}

// Unused import guard — ensures X is tree-shaken if this component ever re-imports
// related icons.
export const _GroupIcons = { X, Sparkles };
