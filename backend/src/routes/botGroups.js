import { Router } from 'express';
import { z } from 'zod';
import { Bot } from '../models/Bot.js';
import { BotGroup } from '../models/BotGroup.js';
import { BotTraining } from '../models/BotTraining.js';
import { authMiddleware } from '../middleware/auth.js';
import { logActivity } from '../services/activity.js';

const router = Router();
router.use(authMiddleware);

const groupSchema = z.object({
  name: z.string().min(1).max(120),
  botIds: z.array(z.string()).default([]),
});

// Ensure every botId in the payload belongs to the current user — we never
// want a user to smuggle another user's bot into their own group.
async function filterOwnedBotIds(userId, ids) {
  if (!ids?.length) return [];
  const owned = await Bot.find({ userId, _id: { $in: ids } }, { _id: 1 });
  const ownedSet = new Set(owned.map((b) => b._id));
  return ids.filter((id) => ownedSet.has(id));
}

router.get('/', async (req, res) => {
  const groups = await BotGroup.find({ userId: req.userId }).sort({ createdAt: -1 });
  return res.json({ groups: groups.map((g) => g.toPublic()) });
});

router.post('/', async (req, res) => {
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const botIds = await filterOwnedBotIds(req.userId, parsed.data.botIds);
  const group = await BotGroup.create({
    userId: req.userId,
    name: parsed.data.name,
    botIds,
  });
  await logActivity(req.userId, 'group.create', `Group created: ${group.name}`, { groupId: group._id });
  return res.status(201).json({ group: group.toPublic() });
});

router.put('/:id', async (req, res) => {
  const parsed = groupSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const group = await BotGroup.findOne({ _id: req.params.id, userId: req.userId });
  if (!group) return res.status(404).json({ error: 'not_found' });
  if (parsed.data.name !== undefined) group.name = parsed.data.name;
  if (parsed.data.botIds !== undefined) {
    group.botIds = await filterOwnedBotIds(req.userId, parsed.data.botIds);
  }
  await group.save();
  return res.json({ group: group.toPublic() });
});

router.delete('/:id', async (req, res) => {
  const group = await BotGroup.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!group) return res.status(404).json({ error: 'not_found' });
  await logActivity(req.userId, 'group.delete', `Group deleted: ${group.name}`, { groupId: group._id });
  return res.json({ ok: true });
});

// Apply a single training payload to every bot in the group. Fields that are
// omitted leave existing values untouched (partial upsert per bot).
const applyTrainingSchema = z.object({
  businessName: z.string().max(200).optional(),
  businessCategory: z.string().max(200).optional(),
  toneOfVoice: z.string().max(80).optional(),
  greetingMessage: z.string().max(1000).optional(),
  salesInstructions: z.string().max(4000).optional(),
  deliveryInfo: z.string().max(2000).optional(),
  paymentInfo: z.string().max(2000).optional(),
  returnPolicy: z.string().max(2000).optional(),
  discountRules: z.string().max(2000).optional(),
  maxDiscountPercent: z.number().min(0).max(100).optional(),
  forbiddenTopics: z.string().max(2000).optional(),
  handoffRules: z.string().max(2000).optional(),
  fallbackMessage: z.string().max(2000).optional(),
  languageMode: z.enum(['az', 'tr', 'auto']).optional(),
});

router.put('/:id/apply-training', async (req, res) => {
  const parsed = applyTrainingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const group = await BotGroup.findOne({ _id: req.params.id, userId: req.userId });
  if (!group) return res.status(404).json({ error: 'not_found' });
  if (!group.botIds?.length) {
    return res.json({ applied: 0, botIds: [] });
  }

  const update = parsed.data;
  const applied = [];
  for (const botId of group.botIds) {
    let t = await BotTraining.findOne({ botId });
    if (!t) {
      t = await BotTraining.create({ userId: req.userId, botId, ...update });
    } else {
      Object.assign(t, update);
      await t.save();
    }
    applied.push(botId);
  }
  await logActivity(req.userId, 'group.apply_training', `Training applied to group: ${group.name}`, {
    groupId: group._id,
    botCount: applied.length,
  });
  return res.json({ applied: applied.length, botIds: applied });
});

export default router;
