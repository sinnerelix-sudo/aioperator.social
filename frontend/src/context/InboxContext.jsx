import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { conversationsApi } from '../lib/api';
import { useAuth } from './AuthContext.jsx';
import { MOCK_INBOX } from '../lib/mockData';

/**
 * Shared inbox state between /dashboard/inbox and
 * /dashboard/assigned-conversations. Reads real Conversation / Message
 * records from the backend (populated by the Instagram + WhatsApp
 * webhook handlers), and falls back to the local mock list ONLY when
 * the backend returns nothing (e.g. first-time sellers with no DMs
 * yet) so the demo seeding still works.
 */
const InboxContext = createContext(null);

const POLL_MS = 15_000;

function initialsFor(name) {
  const s = String(name || '').trim();
  if (!s) return '·';
  const parts = s.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || s[0]?.toUpperCase() || '·';
}

function mapMessage(m) {
  const from =
    m.senderType === 'customer' ? 'customer' :
    m.senderType === 'operator' ? 'operator' :
    'bot';
  return {
    id: m.id,
    from,
    direction: m.direction,
    text: m.text || '',
    at: m.createdAt || new Date().toISOString(),
  };
}

function mapConversation(c, messages = []) {
  const name = c.customerName || c.customerFullName || c.customerExternalId || '—';
  return {
    id: c.id,
    platform: c.platform,
    customer: name,
    avatar: initialsFor(name),
    avatarUrl: c.avatarUrl || '',
    instagramHandle: c.instagramHandle || '',
    whatsappNumber: c.whatsappNumber || c.phone || '',
    lastMessage: c.lastMessageText || '',
    lastMessageAt: c.lastMessageAt || null,
    unread: c.unreadCount || 0,
    aiStatus: c.aiStatus || null,
    handoffMode: c.handoffMode || 'bot_only',
    handoffUntil: c.handoffUntil || null,
    assignedToHuman: Boolean(c.assignedToHuman),
    botPaused: Boolean(c.botPaused),
    convertedToOrder: Boolean(c.convertedToOrder),
    leadScore: 0,
    messages,
    _backend: true,
  };
}

export function InboxProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState(() => MOCK_INBOX);
  const pollRef = useRef(null);
  const mountedRef = useRef(false);

  const loadFromBackend = useCallback(async () => {
    try {
      const res = await conversationsApi.list();
      const list = Array.isArray(res.data?.conversations) ? res.data.conversations : [];
      if (list.length === 0) {
        // No backend conversations yet → keep the mock list so the UI
        // still has demo data on a fresh account.
        return;
      }
      // Fetch messages for each conversation in parallel (bounded by
      // axios pool). For typical seller inboxes this is 10–50 calls.
      const withMessages = await Promise.all(
        list.map(async (c) => {
          try {
            const mr = await conversationsApi.messages(c.id);
            const msgs = Array.isArray(mr.data?.messages) ? mr.data.messages.map(mapMessage) : [];
            return mapConversation(c, msgs);
          } catch {
            return mapConversation(c, []);
          }
        })
      );
      if (!mountedRef.current) return;
      setConversations(withMessages);
    } catch {
      // Network or auth error — keep whatever we currently show.
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!isAuthenticated) return () => { mountedRef.current = false; };
    loadFromBackend();
    pollRef.current = setInterval(loadFromBackend, POLL_MS);
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isAuthenticated, loadFromBackend]);

  /** Local patch helper — applies to an existing conversation in state. */
  const patchLocal = useCallback((id, patch) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? (typeof patch === 'function' ? patch(c) : { ...c, ...patch }) : c)),
    );
  }, []);

  const updateConversation = useCallback((id, patch) => {
    patchLocal(id, patch);
  }, [patchLocal]);

  /** Toggle `convertedToOrder` — persists if the record is from the backend. */
  const toggleConvertToOrder = useCallback((id) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next = !c.convertedToOrder;
        if (c._backend) {
          conversationsApi.setConvertedToOrder(id, next).catch(() => {});
        }
        return { ...c, convertedToOrder: next };
      }),
    );
  }, []);

  /** Manually set AI/intent status. */
  const setAiStatus = useCallback((id, status) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c._backend) {
          conversationsApi.setStatus(id, status).catch(() => {});
        }
        return { ...c, aiStatus: status };
      }),
    );
  }, []);

  /** Apply a handoff decision produced by HandoffModal. */
  const applyHandoff = useCallback((id, mode, untilIso = null) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const assignedToHuman = mode === 'human_only' || mode === 'human_only_until' || mode === 'human_and_bot';
        const botPaused = mode === 'human_only' || mode === 'human_only_until';
        const withUntil = mode === 'human_only_until' || mode === 'bot_only_until';
        if (c._backend) {
          conversationsApi.setHandoff(id, mode, withUntil ? untilIso : null).catch(() => {});
        }
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

  /** Append an outbound message from the seller. Persists to backend. */
  const sendOperatorMessage = useCallback((id, text) => {
    const clean = String(text || '').trim();
    if (!clean) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const message = {
          from: 'operator',
          direction: 'outbound',
          text: clean,
          at: new Date().toISOString(),
        };
        if (c._backend) {
          conversationsApi.sendMessage(id, clean).catch(() => {});
        }
        return {
          ...c,
          messages: [...(c.messages || []), message],
          lastMessage: clean,
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
    refresh: loadFromBackend,
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
