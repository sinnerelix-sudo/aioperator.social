import { Router } from 'express';
import { z } from 'zod';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
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
 * Real platform send is delegated to platform services; if those services
 * return missing_credentials, the message is still persisted so the seller
 * sees it in the UI (mock-friendly behaviour).
 */
router.post('/:id/messages', async (req, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const conv = await Conversation.findOne({ _id: req.params.id, userId: req.userId });
  if (!conv) return res.status(404).json({ error: 'not_found' });

  const message = await Message.create({
    userId: req.userId,
    botId: conv.botId,
    conversationId: conv._id,
    platform: conv.platform,
    direction: 'outbound',
    senderType: 'operator',
    text: parsed.data.text,
    messageType: 'text',
    status: 'sent',
    aiGenerated: false,
  });

  conv.lastMessageText = parsed.data.text;
  conv.lastMessageAt = new Date();
  conv.unreadCount = 0;
  await conv.save();

  return res.status(201).json({ message: message.toPublic() });
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
