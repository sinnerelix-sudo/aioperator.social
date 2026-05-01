import { useTranslation } from 'react-i18next';
import ConversationView from '../../components/inbox/ConversationView.jsx';

export default function InboxPage() {
  const { t } = useTranslation();

  return (
    <div data-testid="inbox-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
          {t('dashboard.inbox.title')}
        </h1>
        <p className="text-sm text-ink-500 mt-1">{t('dashboard.inbox.subtitle')}</p>
      </div>

      <ConversationView
        mode="inbox"
        conversationsFilter={null}
        emptyLabelKey="dashboard.inbox.empty.filtered"
        handoffDirection="to-human"
        handoffButtonLabelKey="dashboard.inbox.handoff"
        showComposer={false}
      />
    </div>
  );
}
