import { Router } from 'express';
import { z } from 'zod';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { PlatformConnection } from '../models/PlatformConnection.js';
import { sendInstagramMessage } from '../services/instagramService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const HANDOFF_MODES = ['bot_only', 'human_only', 'human_only_until', 'human_and_bot', 'bot_only_until'];
const AI_STATUSES = ['price_question', 'complaint', 'delaying', 'unresponsive', 'confirmed', 'off_topic'];

/* ----------------------------- list / get ----------------------------- */

router.get('/', async (req, res) => {
  const { botId, platform, assignedToHuman } = req.query;
  const filter = { userId: req.userId };
  if (botId) filter.botId = String(botId);
  if (platform === 'instagram' || platform === 'whatsapp') filter.platform = platform;
  if (assignedToHuman === 'true') filter.assignedToHuman = true;
  if (assignedToHuman === 'false') filter.assignedToHuman = false;

  const convs = await Conversation.find(filter).sort({ lastMessageAt: -1, createdAt: -1 }).limit(200);
  return res.json({ conversations: convs.map((c) => c.toPublic()) });
});

router.get('/:id', async (req, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, userId: req.userId });
  if (!conv) return res.status(404).json({ error: 'not_found' });
  return res.json({ conversation: conv.toPublic() });
});

/* ------------------------------ messages ------------------------------ */

router.get('/:id/messages', async (req, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, userId: req.userId });
  if (!conv) return res.status(404).json({ error: 'not_found' });
  const messages = await Message.find({ conversationId: conv._id, userId: req.userId })
    .sort({ createdAt: 1 })
    .limit(500);
  return res.json({ messages: messages.map((m) => m.toPublic()) });
});

const sendMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

/**
 * Operator-side manual reply. Stored as outbound + senderType='operator'.
 *
 * For Instagram conversations we ALSO call the Instagram Send API so the
 * seller's reply reaches the real customer DM. Message status reflects
 * the send result: 'sent' on API success, 'failed' on API error, and
 * the DB record still exists in both cases so the operator sees it in
 * the UI.
 *
 * For non-Instagram conversations (WhatsApp today) behaviour is
 * unchanged — we only persist the DB record.
 *
 * SECURITY: we never log the access token, the full request body, the
 * message text, or raw API error bodies. Only conversation id,
 * connection id, HTTP status, and short error labels.
 */
router.post('/:id/messages', async (req, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const conv = await Conversation.findOne({ _id: req.params.id, userId: req.userId });
  if (!conv) return res.status(404).json({ error: 'not_found' });

  // Create the DB record first in 'sent' state for non-IG platforms and
  // in 'received' (pending) state for IG so we can update it after the
  // API call. We always persist so the operator sees the message even
  // if the external send fails.
  const initialStatus = conv.platform === 'instagram' ? 'received' : 'sent';
  const message = await Message.create({
    userId: req.userId,
    botId: conv.botId,
    conversationId: conv._id,
    platform: conv.platform,
    direction: 'outbound',
    senderType: 'operator',
    text: parsed.data.text,
    messageType: 'text',
    status: initialStatus,
    aiGenerated: false,
    metadata: { source: 'operator_manual' },
  });

  conv.lastMessageText = parsed.data.text;
  conv.lastMessageAt = new Date();
  conv.unreadCount = 0;
  await conv.save();

  // Non-Instagram: keep current behaviour (DB persist only).
  if (conv.platform !== 'instagram') {
    return res.status(201).json({ message: message.toPublic() });
  }

  // Instagram: look up the seller's connection and call Send API.
  const connection = await PlatformConnection.findOne({
    userId: req.userId,
    botId: conv.botId,
    platform: 'instagram',
    status: 'connected',
  });
  if (!connection) {
    message.status = 'failed';
    message.metadata = { ...message.metadata, sendError: 'no_connection' };
    await message.save();
    console.warn('[ig-send] no connected PlatformConnection', {
      conversationId: conv._id,
      botId: conv.botId,
    });
    return res.status(201).json({
      message: message.toPublic(),
      sendStatus: 'failed',
      sendError: 'no_connection',
    });
  }

  const recipientId = conv.customerExternalId;
  const result = await sendInstagramMessage(connection, recipientId, parsed.data.text);

  if (result.ok) {
    message.status = 'sent';
    if (result.messageId) message.externalMessageId = result.messageId;
    message.metadata = { ...message.metadata, source: 'operator_manual' };
    await message.save();
    return res.status(201).json({ message: message.toPublic(), sendStatus: 'sent' });
  }

  // Send failed — record failure, return a simple error label to the UI.
  message.status = 'failed';
  message.metadata = { ...message.metadata, sendError: result.error || 'send_failed' };
  await message.save();

  console.warn('[ig-send] send failed', {
    conversationId: conv._id,
    connectionId: connection._id,
    error: result.error || 'unknown',
    status: result.status || 0,
    errorCode: result.errorCode || '',
  });

  return res.status(201).json({
    message: message.toPublic(),
    sendStatus: 'failed',
    sendError: result.error || 'send_failed',
  });
});

/* ----------------------------- mutations ----------------------------- */

const statusSchema = z.object({
  aiStatus: z.enum(AI_STATUSES).nullable(),
});
router.patch('/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const conv = await Conversation.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: { aiStatus: parsed.data.aiStatus, updatedAt: new Date() } },
    { new: true }
  );
  if (!conv) return res.status(404).json({ error: 'not_found' });
  return res.json({ conversation: conv.toPublic() });
});

const handoffSchema = z.object({
  handoffMode: z.enum(HANDOFF_MODES),
  handoffUntil: z.string().datetime().nullable().optional(),
});
router.patch('/:id/handoff', async (req, res) => {
  const parsed = handoffSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const { handoffMode, handoffUntil } = parsed.data;
  const assignedToHuman =
    handoffMode === 'human_only' || handoffMode === 'human_only_until' || handoffMode === 'human_and_bot';
  const botPaused = handoffMode === 'human_only' || handoffMode === 'human_only_until';
  const withUntil = handoffMode === 'human_only_until' || handoffMode === 'bot_only_until';
  const conv = await Conversation.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    {
      $set: {
        handoffMode,
        handoffUntil: withUntil && handoffUntil ? new Date(handoffUntil) : null,
        assignedToHuman,
        botPaused,
        updatedAt: new Date(),
      },
    },
    { new: true }
  );
  if (!conv) return res.status(404).json({ error: 'not_found' });
  return res.json({ conversation: conv.toPublic() });
});

const convertSchema = z.object({ convertedToOrder: z.boolean() });
router.patch('/:id/converted-to-order', async (req, res) => {
  const parsed = convertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const conv = await Conversation.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: { convertedToOrder: parsed.data.convertedToOrder, updatedAt: new Date() } },
    { new: true }
  );
  if (!conv) return res.status(404).json({ error: 'not_found' });
  return res.json({ conversation: conv.toPublic() });
});

export default router;
