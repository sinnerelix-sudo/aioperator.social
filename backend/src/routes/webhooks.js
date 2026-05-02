import { Router } from 'express';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { PlatformConnection } from '../models/PlatformConnection.js';
import { generateBotReplyForConversation } from '../services/botAutoReply.js';
import { handleInstagramCommentChange } from '../services/commentAutoReply.js';
import { handleInstagramMentionChange, MENTION_FIELDS } from '../services/mentionHandler.js';

/**
 * Webhook endpoints for Meta (WhatsApp Cloud API) and Instagram Messaging.
 *
 * Foundation milestone: verify-handshake (GET) and a defensive POST
 * receiver that persists inbound messages without crashing on
 * unknown payloads. Real outbound replies + AI pipeline wiring
 * are follow-ups.
 *
 * SECURITY:
 *   - Per-connection webhookVerifyToken is checked first; otherwise we
 *     fall back to platform-wide env tokens (WHATSAPP_WEBHOOK_VERIFY_TOKEN
 *     / INSTAGRAM_WEBHOOK_VERIFY_TOKEN / META_WEBHOOK_VERIFY_TOKEN).
 *   - We do NOT log full payloads or tokens. Only minimal summary logs.
 */
const router = Router();

/* ============================== verification ============================ */

async function verifyChallenge(req, res, platform) {
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode !== 'subscribe' || !verifyToken) {
    return res.status(403).json({ error: 'forbidden' });
  }

  // 1. Match against any per-connection verify token for this platform.
  const conn = await PlatformConnection.findOne({ platform, webhookVerifyToken: verifyToken });
  if (conn) {
    return res.status(200).type('text/plain').send(String(challenge || ''));
  }

  // 2. Fall back to env-level tokens.
  const envToken =
    (platform === 'whatsapp' && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) ||
    (platform === 'instagram' && process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) ||
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    '';
  if (envToken && envToken === verifyToken) {
    return res.status(200).type('text/plain').send(String(challenge || ''));
  }
  return res.status(403).json({ error: 'forbidden' });
}

/* ================================ helpers ================================ */

async function upsertConversationForInbound({ connection, customerExternalId, customerName, text, externalMessageId }) {
  const filter = {
    userId: connection.userId,
    botId: connection.botId,
    platform: connection.platform,
    customerExternalId,
  };
  const now = new Date();
  let conv = await Conversation.findOne(filter);
  if (!conv) {
    conv = await Conversation.create({
      ...filter,
      customerName: customerName || '',
      customerFullName: customerName || '',
      lastMessageText: text || '',
      lastMessageAt: now,
      unreadCount: 1,
    });
  } else {
    conv.lastMessageText = text || conv.lastMessageText;
    conv.lastMessageAt = now;
    conv.unreadCount = (conv.unreadCount || 0) + 1;
    if (customerName && !conv.customerName) {
      conv.customerName = customerName;
      conv.customerFullName = customerName;
    }
    await conv.save();
  }

  // Idempotency: skip if we already stored this external message.
  if (externalMessageId) {
    const existing = await Message.findOne({ externalMessageId });
    if (existing) return { conversation: conv, message: existing, dedup: true };
  }
  const message = await Message.create({
    userId: connection.userId,
    botId: connection.botId,
    conversationId: conv._id,
    platform: connection.platform,
    direction: 'inbound',
    senderType: 'customer',
    externalMessageId: externalMessageId || '',
    text: text || '',
    messageType: 'text',
    status: 'received',
  });
  return { conversation: conv, message };
}

/* ============================== WhatsApp ============================== */

router.get('/whatsapp', (req, res) => verifyChallenge(req, res, 'whatsapp'));

router.post('/whatsapp', async (req, res) => {
  // Always 200 quickly so Meta does not retry hammering us.
  res.status(200).json({ ok: true });

  try {
    const body = req.body || {};
    if (body.object !== 'whatsapp_business_account' && body.object !== undefined) {
      // Foreign payload — ignore.
      return;
    }
    const entries = Array.isArray(body.entry) ? body.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value || {};
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;
        const conn = await PlatformConnection.findOne({
          platform: 'whatsapp',
          whatsappPhoneNumberId: phoneNumberId,
        });
        if (!conn) {
          console.warn('[wa-webhook] no connection for phone_number_id');
          continue;
        }
        const contacts = Array.isArray(value.contacts) ? value.contacts : [];
        const messages = Array.isArray(value.messages) ? value.messages : [];
        for (const m of messages) {
          const from = m.from || '';
          const contact = contacts.find((c) => c.wa_id === from) || contacts[0] || {};
          const customerName = contact?.profile?.name || '';
          const text = m?.text?.body || m?.button?.text || '';
          await upsertConversationForInbound({
            connection: conn,
            customerExternalId: from,
            customerName,
            text,
            externalMessageId: m.id || '',
          });
        }
      }
    }
  } catch (err) {
    // Never throw — webhook must not crash even on malformed payloads.
    console.error('[wa-webhook] parse error', err?.message);
  }
});

/* ============================== Instagram ============================== */

router.get('/instagram', (req, res) => verifyChallenge(req, res, 'instagram'));

router.post('/instagram', async (req, res) => {
  res.status(200).json({ ok: true });

  try {
    const body = req.body || {};
    if (body.object !== 'instagram' && body.object !== undefined) return;
    const entries = Array.isArray(body.entry) ? body.entry : [];
    for (const entry of entries) {
      const entryId = entry.id ? String(entry.id) : '';
      const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];

      // Collect every possible recipient id on this entry. Instagram puts
      // the business account id on `entry.id` for some event types and on
      // `messaging[*].recipient.id` for others, and the two are not
      // guaranteed to be equal (page-scoped vs IG-scoped). We look up the
      // connection against the union of candidates.
      const recipientIds = new Set();
      if (entryId) recipientIds.add(entryId);
      for (const m of messaging) {
        const rid = m?.recipient?.id ? String(m.recipient.id) : '';
        if (rid) recipientIds.add(rid);
      }
      const candidateIds = Array.from(recipientIds);

      const LOOKUP_FIELDS = [
        'instagramBusinessAccountId',
        'instagramUserId',
        'instagramPageId',
        'externalAccountId',
        'platformAccountId',
        'accountId',
      ];

      let conn = null;
      if (candidateIds.length > 0) {
        const or = [];
        for (const field of LOOKUP_FIELDS) {
          or.push({ [field]: { $in: candidateIds } });
        }
        conn = await PlatformConnection.findOne({
          platform: 'instagram',
          status: 'connected',
          $or: or,
        });
      }

      if (!conn) {
        // Safe diagnostic log: only IDs + the list of fields we tried.
        // Never log token / app secret / full payload / message text.
        const firstRecipient = messaging.find((m) => m?.recipient?.id)?.recipient?.id || '';
        console.warn('[ig-webhook] no connection for account id', {
          entryId,
          recipientId: String(firstRecipient || ''),
          knownLookupFields: LOOKUP_FIELDS,
        });
        continue;
      }

      for (const msg of messaging) {
        const senderId = msg?.sender?.id;
        if (!senderId) continue;
        // Skip echoes (messages sent by the page itself)
        if (msg?.message?.is_echo) continue;
        const text = msg?.message?.text || '';
        const result = await upsertConversationForInbound({
          connection: conn,
          customerExternalId: senderId,
          customerName: '',
          text,
          externalMessageId: msg?.message?.mid || '',
        });

        // Trigger auto-reply only for freshly stored inbound messages. On
        // dedup (webhook retry) the idempotency guard inside the service
        // would also skip, but returning early here keeps logs cleaner.
        if (result && !result.dedup && result.message && result.conversation) {
          // Fire-and-forget: we already responded 200 to Meta. Any failure
          // inside the service is logged with safe labels only — no throws.
          generateBotReplyForConversation({
            conversation: result.conversation,
            connection: conn,
            inboundMessage: result.message,
          }).catch((err) => {
            console.warn('[bot-auto-reply] failed', {
              conversationId: result.conversation?._id,
              errorCode: 'unhandled_outer',
              error: err?.message || 'unknown',
            });
          });
        }
      }

      // --- Instagram comment / mention / tag events (entry.changes) ---
      // Live comments remain out of scope for this iteration.
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        if (!change || typeof change !== 'object') continue;
        const fieldName = change.field ? String(change.field) : '';

        if (fieldName === 'comments') {
          // Fire-and-forget: webhook has already returned 200.
          handleInstagramCommentChange({
            connection: conn,
            change,
            entryId,
          }).catch((err) => {
            console.warn('[ig-comment] failed', {
              commentId: change?.value?.id || '',
              stage: 'unhandled_outer',
              errorCode: 'unhandled_outer',
              error: err?.message || 'unknown',
            });
          });
          continue;
        }

        if (MENTION_FIELDS.has(fieldName)) {
          handleInstagramMentionChange({
            connection: conn,
            change,
            entryId,
          }).catch((err) => {
            console.warn('[ig-mention] failed', {
              mentionId: change?.value?.mention_id || change?.value?.id || '',
              stage: 'unhandled_outer',
              errorCode: 'unhandled_outer',
              error: err?.message || 'unknown',
            });
          });
          continue;
        }

        // Anything else (live_comments, story_insights, …) — explicitly out
        // of scope. Log and skip.
        if (fieldName) {
          console.warn('[ig-webhook] skipped', {
            reason: 'unsupported_field',
            entryId,
            field: fieldName,
          });
        }
      }
    }
  } catch (err) {
    console.error('[ig-webhook] parse error', err?.message);
  }
});

export default router;
