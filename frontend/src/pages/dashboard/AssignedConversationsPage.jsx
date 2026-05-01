import { useTranslation } from 'react-i18next';
import ConversationView from '../../components/inbox/ConversationView.jsx';

/**
 * "Sizə ötürülmüş söhbətlər" — shows conversations that the seller has
 * assigned to themselves (human_only / human_only_until / human_and_bot).
 * Seller can reply (composer enabled) and can hand the chat back to the bot.
 */
export default function AssignedConversationsPage() {
  const { t } = useTranslation();

  return (
    <div data-testid="assigned-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
          {t('dashboard.inbox.assigned.title')}
        </h1>
        <p className="text-sm text-ink-500 mt-1">{t('dashboard.inbox.assigned.subtitle')}</p>
      </div>

      <ConversationView
        mode="assigned"
        conversationsFilter={(c) => Boolean(c.assignedToHuman)}
        emptyLabelKey="dashboard.inbox.empty.assigned"
        handoffDirection="to-bot"
        handoffButtonLabelKey="dashboard.inbox.handoffToBot"
        showComposer
      />
    </div>
  );
}
