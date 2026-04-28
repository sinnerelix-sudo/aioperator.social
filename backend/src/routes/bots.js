import { Router } from 'express';
import { z } from 'zod';
import { Bot } from '../models/Bot.js';
import { authMiddleware } from '../middleware/auth.js';
import { getActiveSubscription } from '../services/subscription.js';
import { logActivity } from '../services/activity.js';

const router = Router();

const botSchema = z.object({
  name: z.string().min(1).max(120),
  niche: z.string().max(200).optional().default(''),
  salesStyle: z.string().max(80).optional().default('friendly'),
  instructions: z.string().max(4000).optional().default(''),
  discountRule: z.string().max(1000).optional().default(''),
  handoffRule: z.string().max(1000).optional().default(''),
});

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const bots = await Bot.find({ userId: req.userId }).sort({ createdAt: -1 });
  return res.json({ bots: bots.map((b) => b.toPublic()) });
});

router.post('/', async (req, res) => {
  const parsed = botSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const sub = await getActiveSubscription(req.userId);
  if (!sub) {
    return res.status(403).json({ error: 'no_subscription', message: 'Active subscription required' });
  }
  const count = await Bot.countDocuments({ userId: req.userId });
  if (count >= sub.botLimit) {
    return res.status(403).json({
      error: 'bot_limit_reached',
      message: `Plan limit reached (${sub.botLimit})`,
      limit: sub.botLimit,
    });
  }
  const bot = await Bot.create({ userId: req.userId, ...parsed.data });
  await logActivity(req.userId, 'bot.create', `Bot created: ${bot.name}`, { botId: bot._id });
  return res.status(201).json({ bot: bot.toPublic() });
});

router.put('/:id', async (req, res) => {
  const parsed = botSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const bot = await Bot.findOne({ _id: req.params.id, userId: req.userId });
  if (!bot) return res.status(404).json({ error: 'not_found' });
  Object.assign(bot, parsed.data);
  await bot.save();
  await logActivity(req.userId, 'bot.update', `Bot updated: ${bot.name}`, { botId: bot._id });
  return res.json({ bot: bot.toPublic() });
});

router.delete('/:id', async (req, res) => {
  const bot = await Bot.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!bot) return res.status(404).json({ error: 'not_found' });
  await logActivity(req.userId, 'bot.delete', `Bot deleted: ${bot.name}`, { botId: bot._id });
  return res.json({ ok: true });
});

router.post('/:id/connect/:channel', async (req, res) => {
  const { channel } = req.params;
  if (!['instagram', 'whatsapp'].includes(channel)) {
    return res.status(400).json({ error: 'invalid_channel' });
  }
  // Mock connection - real integration in next phase
  return res.status(202).json({
    ok: false,
    pending: true,
    message: 'Channel integration will be activated in the next phase',
    channel,
  });
});

export default router;
