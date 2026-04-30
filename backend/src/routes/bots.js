import { Router } from 'express';
import { z } from 'zod';
import { Bot } from '../models/Bot.js';
import { Product } from '../models/Product.js';
import { BotTraining } from '../models/BotTraining.js';
import { AiUsageLog } from '../models/AiUsageLog.js';
import { CoachMessage } from '../models/CoachMessage.js';
import { Subscription } from '../models/Subscription.js';
import { authMiddleware } from '../middleware/auth.js';
import { getActiveSubscription } from '../services/subscription.js';
import { logActivity } from '../services/activity.js';
import { matchProducts } from '../services/productMatcher.js';
import { generateReply, estimateCost } from '../services/ai.js';
import { generateCoachReply, mergeTraining, sanitiseUpdate } from '../services/coach.js';

const router = Router();

const botSchema = z.object({
  name: z.string().min(1).max(120),
  niche: z.string().max(200).optional().default(''),
  salesStyle: z.string().max(80).optional().default('friendly'),
  instructions: z.string().max(4000).optional().default(''),
  discountRule: z.string().max(1000).optional().default(''),
  handoffRule: z.string().max(1000).optional().default(''),
  instagramHandle: z.string().max(80).optional().default(''),
  whatsappNumber: z.string().max(40).optional().default(''),
});

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const bots = await Bot.find({ userId: req.userId }).sort({ createdAt: -1 });
  return res.json({ bots: bots.map((b) => b.toPublic()) });
});

router.get('/:id', async (req, res) => {
  const bot = await Bot.findOne({ _id: req.params.id, userId: req.userId });
  if (!bot) return res.status(404).json({ error: 'not_found' });
  return res.json({ bot: bot.toPublic() });
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

const testMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  locale: z.string().max(8).optional(),
});

router.post('/:id/test-message', async (req, res) => {
  const parsed = testMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const bot = await Bot.findOne({ _id: req.params.id, userId: req.userId });
  if (!bot) return res.status(404).json({ error: 'not_found' });

  const subscription = await getActiveSubscription(req.userId);
  if (!subscription) {
    return res.status(403).json({ error: 'no_subscription', message: 'Active subscription required' });
  }
  if ((subscription.usedMessages || 0) >= subscription.monthlyMessageLimit) {
    return res.status(402).json({
      error: 'message_limit_reached',
      message: 'Paket limitiniz dolub. Paketi yüksəldin və ya növbəti reset tarixini gözləyin.',
      usage: {
        usedMessages: subscription.usedMessages,
        monthlyMessageLimit: subscription.monthlyMessageLimit,
      },
    });
  }

  const training = await BotTraining.findOne({ botId: bot._id });
  const allProducts = await Product.find({
    userId: req.userId,
    $or: [{ botId: bot._id }, { botId: null }, { botId: '' }],
  });
  const matched = matchProducts(parsed.data.message, allProducts.map((p) => p.toPublic()), 3);

  const languageHint = parsed.data.locale === 'tr' ? 'tr' : 'az';

  const ai = await generateReply({
    training: training ? training.toPublic() : null,
    matchedProducts: matched,
    userMessage: parsed.data.message,
    languageHint,
  });

  // Increment seller-visible message counter atomically.
  const updated = await Subscription.findOneAndUpdate(
    { _id: subscription._id },
    { $inc: { usedMessages: 1 } },
    { new: true }
  );

  // Internal-only technical usage log (admin/back-office; never shown to seller).
  const costEstimate = ai.mock ? 0 : estimateCost(ai.model, ai.inputTokens, ai.outputTokens);
  await AiUsageLog.create({
    userId: req.userId,
    botId: bot._id,
    model: ai.model,
    inputTokens: ai.inputTokens,
    outputTokens: ai.outputTokens,
    estimatedCost: costEstimate,
    source: 'test',
    mock: ai.mock,
  });

  await logActivity(req.userId, 'bot.test_message', `Test message to bot: ${bot.name}`, {
    botId: bot._id,
    model: ai.model,
    mock: ai.mock,
  });

  return res.json({
    reply: ai.reply,
    matchedProducts: matched.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      discountPrice: p.discountPrice,
      stock: p.stock,
      imageUrl: p.imageUrl || p.image,
    })),
    usage: {
      usedMessages: updated?.usedMessages ?? subscription.usedMessages + 1,
      monthlyMessageLimit: subscription.monthlyMessageLimit,
    },
    mock: ai.mock,
  });
});

// -- Coach chat: seller talks to their bot to train it ---------------------

const coachMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

async function assertOwnedBotAndQuota(req, res) {
  const bot = await Bot.findOne({ _id: req.params.id, userId: req.userId });
  if (!bot) {
    res.status(404).json({ error: 'not_found' });
    return null;
  }
  const subscription = await getActiveSubscription(req.userId);
  if (!subscription) {
    res.status(403).json({ error: 'no_subscription', message: 'Active subscription required' });
    return null;
  }
  if ((subscription.usedMessages || 0) >= subscription.monthlyMessageLimit) {
    res.status(402).json({
      error: 'message_limit_reached',
      message: 'Aylıq mesaj limitiniz dolub. Davam etmək üçün paketinizi yüksəldin.',
      usage: {
        usedMessages: subscription.usedMessages,
        monthlyMessageLimit: subscription.monthlyMessageLimit,
      },
    });
    return null;
  }
  return { bot, subscription };
}

router.get('/:id/coach-messages', async (req, res) => {
  const bot = await Bot.findOne({ _id: req.params.id, userId: req.userId });
  if (!bot) return res.status(404).json({ error: 'not_found' });
  const items = await CoachMessage.find({ botId: bot._id, userId: req.userId })
    .sort({ createdAt: 1 })
    .limit(500);
  return res.json({ messages: items.map((m) => m.toPublic()) });
});

router.post('/:id/coach-message', async (req, res) => {
  const parsed = coachMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const ctx = await assertOwnedBotAndQuota(req, res);
  if (!ctx) return;
  const { bot, subscription } = ctx;

  // Persist the seller message first so it shows up in history regardless of
  // what happens downstream.
  const sellerDoc = await CoachMessage.create({
    userId: req.userId,
    botId: bot._id,
    role: 'seller',
    message: parsed.data.message,
  });

  const coach = await generateCoachReply({ sellerMessage: parsed.data.message });

  const botDoc = await CoachMessage.create({
    userId: req.userId,
    botId: bot._id,
    role: 'bot',
    message: coach.reply,
    suggestedTrainingUpdate: Object.keys(coach.suggestedTrainingUpdate || {}).length
      ? coach.suggestedTrainingUpdate
      : null,
    applied: false,
    mock: coach.mock,
    model: coach.model,
  });

  // Every coach exchange burns exactly one seller message from the monthly quota.
  const updatedSub = await Subscription.findOneAndUpdate(
    { _id: subscription._id },
    { $inc: { usedMessages: 1 } },
    { new: true }
  );

  await AiUsageLog.create({
    userId: req.userId,
    botId: bot._id,
    model: coach.model,
    inputTokens: coach.inputTokens,
    outputTokens: coach.outputTokens,
    estimatedCost: coach.mock ? 0 : estimateCost(coach.model, coach.inputTokens, coach.outputTokens),
    source: 'coach',
    mock: coach.mock,
  });

  await logActivity(req.userId, 'bot.coach_message', `Coach message for bot: ${bot.name}`, {
    botId: bot._id,
    model: coach.model,
    mock: coach.mock,
    applied: false,
  });

  return res.json({
    sellerMessage: sellerDoc.toPublic(),
    botMessage: botDoc.toPublic(),
    reply: coach.reply,
    suggestedTrainingUpdate: botDoc.suggestedTrainingUpdate,
    usage: {
      usedMessages: updatedSub?.usedMessages ?? subscription.usedMessages + 1,
      monthlyMessageLimit: subscription.monthlyMessageLimit,
    },
    mock: coach.mock,
  });
});

const applyCoachSchema = z.object({
  coachMessageId: z.string().min(1),
});

router.post('/:id/apply-coach-suggestion', async (req, res) => {
  const parsed = applyCoachSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const bot = await Bot.findOne({ _id: req.params.id, userId: req.userId });
  if (!bot) return res.status(404).json({ error: 'not_found' });

  const coachMsg = await CoachMessage.findOne({
    _id: parsed.data.coachMessageId,
    botId: bot._id,
    userId: req.userId,
    role: 'bot',
  });
  if (!coachMsg) return res.status(404).json({ error: 'not_found' });
  if (coachMsg.applied) {
    return res.status(409).json({ error: 'already_applied' });
  }

  const update = sanitiseUpdate(coachMsg.suggestedTrainingUpdate || {});
  if (!Object.keys(update).length) {
    return res.status(400).json({ error: 'empty_suggestion' });
  }

  let training = await BotTraining.findOne({ botId: bot._id });
  const existingPublic = training ? training.toPublic() : {};
  const merged = mergeTraining(existingPublic, update);

  if (!training) {
    training = await BotTraining.create({
      userId: req.userId,
      botId: bot._id,
      ...merged,
    });
  } else {
    Object.assign(training, merged);
    await training.save();
  }

  coachMsg.applied = true;
  await coachMsg.save();

  await logActivity(req.userId, 'bot.coach_apply', `Coach suggestion applied to bot: ${bot.name}`, {
    botId: bot._id,
    fields: Object.keys(update),
  });

  return res.json({
    training: training.toPublic(),
    applied: true,
  });
});

export default router;
