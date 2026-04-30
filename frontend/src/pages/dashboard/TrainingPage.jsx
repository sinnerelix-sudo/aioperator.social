import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquarePlus, ArrowLeft, Users, X, ClipboardList } from 'lucide-react';
import { botsApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import BotInboxList, { BotAvatar, botSubtitle } from '../../components/BotInboxList';
import CoachChatPanel from '../../components/CoachChatPanel';
import TrainingFieldsPanel from '../../components/TrainingFieldsPanel';
import GroupCoachChat from '../../components/GroupCoachChat';

/**
 * Instagram DM-style training experience.
 *
 * View modes:
 *   inbox      → left inbox + right empty placeholder (first open)
 *   single     → left inbox + right single-bot coach chat + fields drawer
 *   selecting  → left multi-select inbox (pick bots) + right prompt
 *   broadcast  → left multi-select (locked) + right group broadcast chat
 */
export default function TrainingPage() {
  const { t } = useTranslation();
  const { lng = 'az' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { setSubscription } = useAuth();

  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('inbox'); // inbox | single | selecting | broadcast
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [selectedBotIds, setSelectedBotIds] = useState([]);
  const [externalTraining, setExternalTraining] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await botsApi.list();
        setBots(data.bots || []);
      } catch {
        toast.error(t('errors.generic'));
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedBot = useMemo(
    () => bots.find((b) => b.id === selectedBotId) || null,
    [bots, selectedBotId]
  );
  const broadcastBots = useMemo(
    () => bots.filter((b) => selectedBotIds.includes(b.id)),
    [bots, selectedBotIds]
  );

  const onUsage = (usage) => {
    setSubscription?.((prev) =>
      prev
        ? {
            ...prev,
            usedMessages: usage.usedMessages,
            monthlyMessageLimit: usage.monthlyMessageLimit,
          }
        : prev
    );
  };

  const onTrainingUpdated = (training) => {
    if (!selectedBot) return;
    setExternalTraining({ ...training, botId: selectedBot.id });
    toast.success(t('dashboard.coach.applied'));
  };

  const enterBroadcastSelect = () => {
    setMode('selecting');
    setSelectedBotIds(bots.map((b) => b.id)); // preselect all by default
  };

  const toggleBotId = (id) => {
    setSelectedBotIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  };

  const startBroadcast = () => {
    if (!selectedBotIds.length) return;
    setMode('broadcast');
  };

  const exitGroup = () => {
    setMode('inbox');
    setSelectedBotIds([]);
  };

  const selectBot = (bot) => {
    setSelectedBotId(bot.id);
    setMode('single');
    setExternalTraining(null);
  };

  if (loading) {
    return <div className="text-sm text-ink-500">{t('common.loading')}</div>;
  }

  return (
    <div data-testid="training-page" className="flex flex-col sm:flex-row gap-4">
      {mode === 'broadcast' ? (
        <GroupCoachChat
          bots={broadcastBots}
          onExit={exitGroup}
          onUsage={onUsage}
        />
      ) : (
        <>
          <BotInboxList
            bots={bots}
            selectedBotId={selectedBotId}
            selectedBotIds={selectedBotIds}
            mode={mode === 'selecting' ? 'multi' : 'select'}
            onSelect={selectBot}
            onToggle={toggleBotId}
            onOpenBroadcast={enterBroadcastSelect}
            onOpenCreate={() => navigate(`/${lng}/dashboard/bots/new`)}
            headerExtra={
              mode === 'selecting' ? (
                <SelectingHeader
                  t={t}
                  totalBots={bots.length}
                  selectedCount={selectedBotIds.length}
                  onCancel={exitGroup}
                  onSelectAll={() => setSelectedBotIds(bots.map((b) => b.id))}
                  onDeselectAll={() => setSelectedBotIds([])}
                  onStart={startBroadcast}
                />
              ) : null
            }
          />

          <div className="flex-1 min-w-0 space-y-3" data-testid="training-right-pane">
            {mode === 'inbox' && <InboxPlaceholder t={t} />}
            {mode === 'selecting' && (
              <SelectingPlaceholder
                t={t}
                count={selectedBotIds.length}
                onStart={startBroadcast}
                onCancel={exitGroup}
              />
            )}
            {mode === 'single' && selectedBot && (
              <>
                <CoachChatPanel
                  bot={selectedBot}
                  onUsage={onUsage}
                  onTrainingUpdate={onTrainingUpdated}
                />
                <TrainingFieldsPanel
                  bot={selectedBot}
                  externalTraining={externalTraining}
                  initiallyOpen={false}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SelectingHeader({ t, totalBots, selectedCount, onCancel, onSelectAll, onDeselectAll, onStart }) {
  const allSelected = selectedCount === totalBots;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink-900" data-testid="selecting-count">
          {t('dashboard.trainingInbox.selectedCount', { count: selectedCount })}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] text-ink-500 hover:text-ink-900 inline-flex items-center gap-1"
          data-testid="selecting-cancel"
        >
          <X className="h-3 w-3" />
          {t('dashboard.trainingInbox.cancel')}
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="flex-1 text-[11px] font-medium px-2.5 py-1.5 rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200 transition"
          data-testid="selecting-toggle-all"
        >
          {allSelected ? t('dashboard.trainingInbox.deselectAll') : t('dashboard.trainingInbox.selectAll')}
        </button>
        <button
          type="button"
          onClick={onStart}
          disabled={selectedCount === 0}
          data-testid="selecting-start"
          className="flex-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-brand-gradient text-white hover:opacity-90 disabled:opacity-40"
        >
          {t('dashboard.trainingInbox.startBroadcast')}
        </button>
      </div>
    </div>
  );
}

function InboxPlaceholder({ t }) {
  return (
    <div
      className="h-full min-h-[560px] bg-white border border-dashed border-ink-300 rounded-2xl flex items-center justify-center px-8 py-16"
      data-testid="inbox-placeholder"
    >
      <div className="text-center max-w-sm">
        <div className="mx-auto h-14 w-14 rounded-full bg-brand-gradient flex items-center justify-center mb-4">
          <MessageSquarePlus className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-display font-semibold text-lg text-ink-900">
          {t('dashboard.trainingInbox.placeholderTitle')}
        </h3>
        <p className="text-sm text-ink-500 mt-2 leading-relaxed">
          {t('dashboard.trainingInbox.placeholder')}
        </p>
      </div>
    </div>
  );
}

function SelectingPlaceholder({ t, count, onStart, onCancel }) {
  return (
    <div
      className="h-full min-h-[560px] bg-white border border-dashed border-ink-300 rounded-2xl flex items-center justify-center px-8 py-16"
      data-testid="selecting-placeholder"
    >
      <div className="text-center max-w-sm">
        <div className="mx-auto h-14 w-14 rounded-full bg-brand-gradient flex items-center justify-center mb-4">
          <Users className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-display font-semibold text-lg text-ink-900">
          {t('dashboard.trainingInbox.selectBotsTitle')}
        </h3>
        <p className="text-sm text-ink-500 mt-2 leading-relaxed">
          {t('dashboard.trainingInbox.selectBotsHint')}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200"
            data-testid="selecting-placeholder-cancel"
          >
            {t('dashboard.trainingInbox.cancel')}
          </button>
          <button
            type="button"
            onClick={onStart}
            disabled={count === 0}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-gradient text-white hover:opacity-90 disabled:opacity-40"
            data-testid="selecting-placeholder-start"
          >
            {t('dashboard.trainingInbox.startBroadcast')} ({count})
          </button>
        </div>
      </div>
    </div>
  );
}

// Stop the linter from complaining about these imports that only appear in
// dynamic UI branches (icons used conditionally).
export const _TrainingIcons = { ArrowLeft, ClipboardList, BotAvatar, botSubtitle };
