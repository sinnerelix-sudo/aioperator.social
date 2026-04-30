import { Router } from 'express';
import { z } from 'zod';
import { Bot } from '../models/Bot.js';
import { AiUsageLog } from '../models/AiUsageLog.js';
import { CoachMessage } from '../models/CoachMessage.js';
import { Subscription } from '../models/Subscription.js';
import { authMiddleware } from '../middleware/auth.js';
import { getActiveSubscription } from '../services/subscription.js';
import { logActivity } from '../services/activity.js';
import { generateCoachReply, sanitiseUpdate } from '../services/coach.js';
import { estimateCost } from '../services/ai.js';

const router = Router();
router.use(authMiddleware);

const broadcastSchema = z.object({
  message: z.string().min(1).max(2000),
  botIds: z.array(z.string()).min(1).max(20),
});

/**
 * Broadcast coach message to multiple bots. Each bot:
 *  - persists a separate seller CoachMessage (so their individual histories stay clean)
 *  - receives its own coach reply + suggestedTrainingUpdate
 *  - consumes exactly one message from the seller's monthly quota
 *
 * We stop fan-out the moment the quota runs dry — already-processed bots keep
 * their replies, remaining bots get a `quota_exhausted` marker so the UI can
 * show the seller exactly where it stopped.
 */
router.post('/broadcast', async (req, res) => {
  const parsed = broadcastSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const { message, botIds } = parsed.data;
  const owned = await Bot.find({ _id: { $in: botIds }, userId: req.userId });
  if (!owned.length) return res.status(404).json({ error: 'no_bots' });

  let subscription = await getActiveSubscription(req.userId);
  if (!subscription) {
    return res.status(403).json({ error: 'no_subscription' });
  }

  const results = [];
  let usedMessages = subscription.usedMessages || 0;
  const monthlyMessageLimit = subscription.monthlyMessageLimit;

  for (const bot of owned) {
    if (usedMessages >= monthlyMessageLimit) {
      results.push({ botId: bot._id, botName: bot.name, skipped: true, reason: 'message_limit_reached' });
      continue;
    }

    const sellerDoc = await CoachMessage.create({
      userId: req.userId,
      botId: bot._id,
      role: 'seller',
      message,
    });

    const coach = await generateCoachReply({ sellerMessage: message });
    const suggestion = Object.keys(coach.suggestedTrainingUpdate || {}).length
      ? sanitiseUpdate(coach.suggestedTrainingUpdate)
      : null;

    const botDoc = await CoachMessage.create({
      userId: req.userId,
      botId: bot._id,
      role: 'bot',
      message: coach.reply,
      suggestedTrainingUpdate: suggestion,
      applied: false,
      mock: coach.mock,
      model: coach.model,
    });

    const updatedSub = await Subscription.findOneAndUpdate(
      { _id: subscription._id },
      { $inc: { usedMessages: 1 } },
      { new: true }
    );
    usedMessages = updatedSub?.usedMessages ?? usedMessages + 1;

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

    results.push({
      botId: bot._id,
      botName: bot.name,
      instagramHandle: bot.instagramHandle || '',
      whatsappNumber: bot.whatsappNumber || '',
      sellerMessage: sellerDoc.toPublic(),
      botMessage: botDoc.toPublic(),
      reply: coach.reply,
      suggestedTrainingUpdate: suggestion,
      mock: coach.mock,
      skipped: false,
    });
  }

  await logActivity(req.userId, 'coach.broadcast', `Broadcast to ${results.length} bots`, {
    botCount: results.length,
  });

  return res.json({
    results,
    usage: {
      usedMessages,
      monthlyMessageLimit,
    },
  });
});

export default router;
