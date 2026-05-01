import { Router } from 'express';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { PlatformConnection } from '../models/PlatformConnection.js';

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
      const accountId = entry.id || '';
      const conn = await PlatformConnection.findOne({
        platform: 'instagram',
        $or: [
          { instagramBusinessAccountId: accountId },
          { instagramPageId: accountId },
        ],
      });
      if (!conn) {
        console.warn('[ig-webhook] no connection for account id');
        continue;
      }
      const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
      for (const msg of messaging) {
        const senderId = msg?.sender?.id;
        if (!senderId) continue;
        // Skip echoes (messages sent by the page itself)
        if (msg?.message?.is_echo) continue;
        const text = msg?.message?.text || '';
        await upsertConversationForInbound({
          connection: conn,
          customerExternalId: senderId,
          customerName: '',
          text,
          externalMessageId: msg?.message?.mid || '',
        });
      }
    }
  } catch (err) {
    console.error('[ig-webhook] parse error', err?.message);
  }
});

export default router;
