import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Instagram, MessageCircle, ArrowRight, UserCog } from 'lucide-react';
import { MOCK_INBOX } from '../../lib/mockData';
import { useToast } from '../../context/ToastContext';

export default function InboxPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(MOCK_INBOX[0].id);

  const filtered = MOCK_INBOX.filter((c) =>
    c.customer.toLowerCase().includes(search.toLowerCase())
  );
  const selected = MOCK_INBOX.find((c) => c.id === selectedId) || filtered[0];

  return (
    <div data-testid="inbox-page">
      <div>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
          {t('dashboard.inbox.title')}
        </h1>
        <p className="text-sm text-ink-500 mt-1">{t('dashboard.inbox.subtitle')}</p>
      </div>

      <div className="mt-6 grid lg:grid-cols-[340px_1fr] gap-4 bg-white border border-ink-200 rounded-xl overflow-hidden min-h-[60vh]">
        {/* Sidebar */}
        <div className="border-b lg:border-b-0 lg:border-r border-ink-200 flex flex-col">
          <div className="p-3 border-b border-ink-200">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                data-testid="inbox-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.inbox.searchPlaceholder')}
                className="input-base pl-9 py-2 text-sm"
              />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto max-h-[60vh] divide-y divide-ink-200">
            {filtered.map((c) => {
              const isActive = selected?.id === c.id;
              const Channel = c.platform === 'instagram' ? Instagram : MessageCircle;
              return (
                <li key={c.id}>
                  <button
                    data-testid={`inbox-item-${c.id}`}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3 hover:bg-ink-50 flex gap-3 items-start ${
                      isActive ? 'bg-brand-gradient-soft' : ''
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-brand-gradient text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      {c.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink-900 truncate">{c.customer}</span>
                        {c.unread > 0 && (
                          <span className="text-[10px] font-bold px-1.5 rounded-full bg-red-500 text-white">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-500 truncate mt-0.5">{c.lastMessage}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-500">
                        <Channel className="h-3 w-3" />
                        <span className="capitalize">{c.platform}</span>
                        <span>·</span>
                        <span>Lead {c.leadScore}</span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Conversation */}
        <div className="flex flex-col" data-testid="inbox-conversation">
          {selected ? (
            <>
              <div className="p-4 border-b border-ink-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-gradient text-white text-sm font-semibold flex items-center justify-center">
                    {selected.avatar}
                  </div>
                  <div>
                    <div className="font-display font-semibold text-base text-ink-900">{selected.customer}</div>
                    <div className="text-[11px] text-ink-500 capitalize flex items-center gap-1">
                      {selected.platform === 'instagram' ? <Instagram className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                      {selected.platform} · Lead {selected.leadScore}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toast.info(t('dashboard.inbox.handoffToast'))}
                    className="text-xs font-medium px-3 py-2 rounded-lg bg-ink-100 text-ink-900 hover:bg-ink-200 transition flex items-center gap-1.5"
                    data-testid="inbox-handoff-btn"
                  >
                    <UserCog className="h-3.5 w-3.5" />
                    {t('dashboard.inbox.handoff')}
                  </button>
                  <button
                    onClick={() => toast.success(t('dashboard.inbox.convertToast'))}
                    className="text-xs font-medium px-3 py-2 rounded-lg bg-brand-gradient text-white hover:opacity-90 transition flex items-center gap-1.5"
                    data-testid="inbox-convert-btn"
                  >
                    {t('dashboard.inbox.convertOrder')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-ink-50/50 space-y-3">
                {selected.messages.map((m, i) => {
                  const isBot = m.from === 'bot';
                  return (
                    <div key={i} className={`flex ${isBot ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[80%]">
                        <div className={`text-[10px] mb-1 ${isBot ? 'text-right text-ink-500' : 'text-ink-500'}`}>
                          {isBot ? t('dashboard.inbox.fromBot') : t('dashboard.inbox.fromCustomer')}
                          {' · '}
                          {new Date(m.at).toLocaleTimeString(i18n.language === 'tr' ? 'tr-TR' : 'az-AZ', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                          isBot ? 'bg-brand-gradient text-white' : 'bg-white border border-ink-200 text-ink-900'
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-ink-500">
              {t('dashboard.inbox.selectConversation')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
