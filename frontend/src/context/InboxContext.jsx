import { createContext, useContext, useState, useCallback } from 'react';
import { MOCK_INBOX } from '../lib/mockData';

/**
 * Shared inbox state between /dashboard/inbox and
 * /dashboard/assigned-conversations so the same conversation object
 * mutates in both views. Mock/local only — no backend calls yet.
 */
const InboxContext = createContext(null);

export function InboxProvider({ children }) {
  const [conversations, setConversations] = useState(() => MOCK_INBOX);

  const updateConversation = useCallback((id, patch) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next = typeof patch === 'function' ? patch(c) : { ...c, ...patch };
        return next;
      }),
    );
  }, []);

  /** Toggle `convertedToOrder` flag. */
  const toggleConvertToOrder = useCallback((id) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, convertedToOrder: !c.convertedToOrder } : c)),
    );
  }, []);

  /** Manually set AI/intent status. */
  const setAiStatus = useCallback((id, status) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, aiStatus: status } : c)));
  }, []);

  /**
   * Apply a handoff decision produced by HandoffModal.
   * mode: 'human_only' | 'human_only_until' | 'human_and_bot' | 'bot_only'
   */
  const applyHandoff = useCallback((id, mode, untilIso = null) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const assignedToHuman = mode === 'human_only' || mode === 'human_only_until' || mode === 'human_and_bot';
        const botPaused = mode === 'human_only' || mode === 'human_only_until';
        const withUntil = mode === 'human_only_until' || mode === 'bot_only_until';
        return {
          ...c,
          handoffMode: mode,
          handoffUntil: withUntil ? untilIso : null,
          assignedToHuman,
          botPaused,
        };
      }),
    );
  }, []);

  /** Append an outbound message from the seller. */
  const sendOperatorMessage = useCallback((id, text) => {
    if (!text || !text.trim()) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const message = {
          from: 'operator',
          direction: 'outbound',
          text: text.trim(),
          at: new Date().toISOString(),
        };
        return {
          ...c,
          messages: [...(c.messages || []), message],
          lastMessage: text.trim(),
          unread: 0,
        };
      }),
    );
  }, []);

  const value = {
    conversations,
    updateConversation,
    toggleConvertToOrder,
    setAiStatus,
    applyHandoff,
    sendOperatorMessage,
  };

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error('useInbox must be used within InboxProvider');
  return ctx;
}

export const AI_STATUSES = [
  'price_question',
  'complaint',
  'delaying',
  'unresponsive',
  'confirmed',
  'off_topic',
];

export const AI_STATUS_TONES = {
  price_question: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  complaint: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  delaying: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  unresponsive: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  confirmed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  off_topic: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
};
