import { Router } from 'express';
import { z } from 'zod';
import { Bot } from '../models/Bot.js';
import { BotTraining, emptyTraining } from '../models/BotTraining.js';
import { authMiddleware } from '../middleware/auth.js';
import { logActivity } from '../services/activity.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const trainingSchema = z.object({
  businessName: z.string().max(200).optional().default(''),
  businessCategory: z.string().max(200).optional().default(''),
  toneOfVoice: z.string().max(80).optional().default('friendly'),
  greetingMessage: z.string().max(1000).optional().default(''),
  salesInstructions: z.string().max(4000).optional().default(''),
  deliveryInfo: z.string().max(2000).optional().default(''),
  paymentInfo: z.string().max(2000).optional().default(''),
  returnPolicy: z.string().max(2000).optional().default(''),
  discountRules: z.string().max(2000).optional().default(''),
  maxDiscountPercent: z.number().min(0).max(100).optional().default(10),
  forbiddenTopics: z.string().max(2000).optional().default(''),
  handoffRules: z.string().max(2000).optional().default(''),
  fallbackMessage: z.string().max(2000).optional(),
  languageMode: z.enum(['az', 'tr', 'auto']).optional().default('auto'),
});

async function ownBot(req, res) {
  const bot = await Bot.findOne({ _id: req.params.id, userId: req.userId });
  if (!bot) {
    res.status(404).json({ error: 'not_found' });
    return null;
  }
  return bot;
}

router.get('/', async (req, res) => {
  const bot = await ownBot(req, res);
  if (!bot) return;
  const existing = await BotTraining.findOne({ botId: bot._id });
  if (existing) return res.json({ training: existing.toPublic() });
  return res.json({ training: emptyTraining(bot._id) });
});

router.put('/', async (req, res) => {
  const bot = await ownBot(req, res);
  if (!bot) return;
  const parsed = trainingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  let training = await BotTraining.findOne({ botId: bot._id });
  if (!training) {
    training = await BotTraining.create({
      userId: req.userId,
      botId: bot._id,
      ...parsed.data,
    });
  } else {
    Object.assign(training, parsed.data);
    await training.save();
  }
  await logActivity(req.userId, 'bot.training.update', `Training updated for bot: ${bot.name}`, {
    botId: bot._id,
  });
  return res.json({ training: training.toPublic() });
});

export default router;
