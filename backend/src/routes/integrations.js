import { Router } from 'express';
import { z } from 'zod';
import { PlatformConnection } from '../models/PlatformConnection.js';
import { Bot } from '../models/Bot.js';
import { authMiddleware } from '../middleware/auth.js';
import { encryptToken } from '../services/tokenCrypto.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { botId } = req.query;
  const filter = { userId: req.userId };
  if (botId) filter.botId = String(botId);
  const connections = await PlatformConnection.find(filter).sort({ createdAt: -1 });
  return res.json({ connections: connections.map((c) => c.toPublic()) });
});

const whatsappConnectSchema = z.object({
  botId: z.string().min(1),
  whatsappPhoneNumber: z.string().max(40).optional().default(''),
  whatsappPhoneNumberId: z.string().min(1).max(80),
  whatsappBusinessAccountId: z.string().max(80).optional().default(''),
  metaAppId: z.string().max(80).optional().default(''),
  accessToken: z.string().min(8).max(8000),
  tokenExpiresAt: z.string().datetime().optional(),
  displayName: z.string().max(120).optional().default(''),
});
router.post('/whatsapp/connect', async (req, res) => {
  const parsed = whatsappConnectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const bot = await Bot.findOne({ _id: parsed.data.botId, userId: req.userId });
  if (!bot) return res.status(404).json({ error: 'bot_not_found' });

  const filter = { userId: req.userId, botId: bot._id, platform: 'whatsapp' };
  const update = {
    userId: req.userId,
    botId: bot._id,
    platform: 'whatsapp',
    displayName: parsed.data.displayName || bot.name,
    whatsappPhoneNumber: parsed.data.whatsappPhoneNumber,
    whatsappPhoneNumberId: parsed.data.whatsappPhoneNumberId,
    whatsappBusinessAccountId: parsed.data.whatsappBusinessAccountId,
    metaAppId: parsed.data.metaAppId,
    accessTokenEncrypted: encryptToken(parsed.data.accessToken),
    tokenExpiresAt: parsed.data.tokenExpiresAt ? new Date(parsed.data.tokenExpiresAt) : null,
    status: 'connected',
    updatedAt: new Date(),
  };
  const conn = await PlatformConnection.findOneAndUpdate(filter, { $set: update }, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  // Reflect connectivity flag on the bot for the existing UI.
  bot.whatsappConnected = true;
  if (parsed.data.whatsappPhoneNumber) bot.whatsappNumber = parsed.data.whatsappPhoneNumber;
  await bot.save();
  return res.status(201).json({ connection: conn.toPublicWithVerifyToken() });
});

const instagramConnectSchema = z.object({
  botId: z.string().min(1),
  instagramUsername: z.string().max(120).optional().default(''),
  instagramPageId: z.string().max(80).optional().default(''),
  instagramBusinessAccountId: z.string().min(1).max(80),
  metaAppId: z.string().max(80).optional().default(''),
  accessToken: z.string().min(8).max(8000),
  tokenExpiresAt: z.string().datetime().optional(),
  displayName: z.string().max(120).optional().default(''),
});
router.post('/instagram/connect', async (req, res) => {
  const parsed = instagramConnectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const bot = await Bot.findOne({ _id: parsed.data.botId, userId: req.userId });
  if (!bot) return res.status(404).json({ error: 'bot_not_found' });

  const filter = { userId: req.userId, botId: bot._id, platform: 'instagram' };
  const update = {
    userId: req.userId,
    botId: bot._id,
    platform: 'instagram',
    displayName: parsed.data.displayName || bot.name,
    instagramUsername: parsed.data.instagramUsername,
    instagramPageId: parsed.data.instagramPageId,
    instagramBusinessAccountId: parsed.data.instagramBusinessAccountId,
    metaAppId: parsed.data.metaAppId,
    accessTokenEncrypted: encryptToken(parsed.data.accessToken),
    tokenExpiresAt: parsed.data.tokenExpiresAt ? new Date(parsed.data.tokenExpiresAt) : null,
    status: 'connected',
    updatedAt: new Date(),
  };
  const conn = await PlatformConnection.findOneAndUpdate(filter, { $set: update }, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  bot.instagramConnected = true;
  if (parsed.data.instagramUsername) bot.instagramHandle = parsed.data.instagramUsername;
  await bot.save();
  return res.status(201).json({ connection: conn.toPublicWithVerifyToken() });
});

router.delete('/:id', async (req, res) => {
  const conn = await PlatformConnection.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId,
  });
  if (!conn) return res.status(404).json({ error: 'not_found' });

  // Reflect disconnection on the bot
  const bot = await Bot.findOne({ _id: conn.botId, userId: req.userId });
  if (bot) {
    if (conn.platform === 'instagram') bot.instagramConnected = false;
    if (conn.platform === 'whatsapp') bot.whatsappConnected = false;
    await bot.save();
  }
  return res.json({ ok: true });
});

export default router;
