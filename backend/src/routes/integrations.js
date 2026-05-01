import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PlatformConnection } from '../models/PlatformConnection.js';
import { Bot } from '../models/Bot.js';
import { authMiddleware } from '../middleware/auth.js';
import { encryptToken } from '../services/tokenCrypto.js';
import { config } from '../config.js';

const router = Router();

const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
];
const STATE_TYPE = 'ig_oauth_state';
const STATE_TTL_SECONDS = 600; // 10 minutes

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'https://www.aioperator.social').replace(/\/+$/, '');
}

function getInstagramRedirectUri() {
  return process.env.INSTAGRAM_REDIRECT_URI
    || 'https://aioperator-backend.onrender.com/api/integrations/instagram/oauth/callback';
}

function buildSettingsRedirect(locale, params) {
  const fe = getFrontendUrl();
  const lng = locale === 'tr' ? 'tr' : 'az';
  const qs = new URLSearchParams(params).toString();
  return `${fe}/${lng}/dashboard/settings${qs ? `?${qs}` : ''}`;
}

/* ============================================================
   PUBLIC OAuth CALLBACK — registered BEFORE authMiddleware so it
   works without a Bearer token (Instagram redirects the seller's
   browser back here without our auth header). Identification
   happens via the signed `state` JWT.
   ============================================================ */

router.get('/instagram/oauth/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  // 1. State / code presence
  if (oauthError) {
    return res.redirect(buildSettingsRedirect('az', { integration: 'instagram_error', reason: 'oauth_denied' }));
  }
  if (!code || !state) {
    return res.redirect(buildSettingsRedirect('az', { integration: 'instagram_error', reason: 'missing_params' }));
  }

  // 2. Decode + verify state JWT
  let payload;
  try {
    payload = jwt.verify(String(state), config.jwtSecret);
  } catch {
    return res.redirect(buildSettingsRedirect('az', { integration: 'instagram_error', reason: 'invalid_state' }));
  }
  if (payload?.type !== STATE_TYPE || !payload.userId || !payload.botId) {
    return res.redirect(buildSettingsRedirect('az', { integration: 'instagram_error', reason: 'invalid_state' }));
  }
  const locale = payload.locale === 'tr' ? 'tr' : 'az';

  // 3. Verify bot still belongs to user
  const bot = await Bot.findOne({ _id: payload.botId, userId: payload.userId });
  if (!bot) {
    return res.redirect(buildSettingsRedirect(locale, { integration: 'instagram_error', reason: 'bot_not_found' }));
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return res.redirect(buildSettingsRedirect(locale, { integration: 'instagram_error', reason: 'app_not_configured' }));
  }

  try {
    // 4. Exchange code → short-lived token (Instagram API with Instagram Login)
    const exchangeBody = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: getInstagramRedirectUri(),
      code: String(code),
    });
    const exRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: exchangeBody.toString(),
    });
    if (!exRes.ok) {
      return res.redirect(buildSettingsRedirect(locale, { integration: 'instagram_error', reason: 'exchange_failed' }));
    }
    const exJson = await exRes.json();
    const shortToken = exJson?.access_token;
    const igUserId = exJson?.user_id ? String(exJson.user_id) : '';
    if (!shortToken) {
      return res.redirect(buildSettingsRedirect(locale, { integration: 'instagram_error', reason: 'no_token' }));
    }

    // 5. Exchange short → long-lived (60-day) token
    let longToken = shortToken;
    let expiresInSec = 0;
    try {
      const llUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(appSecret)}&access_token=${encodeURIComponent(shortToken)}`;
      const llRes = await fetch(llUrl);
      if (llRes.ok) {
        const llJson = await llRes.json();
        if (llJson?.access_token) {
          longToken = llJson.access_token;
          expiresInSec = Number(llJson.expires_in || 0);
        }
      }
    } catch { /* fall back to short token */ }

    // 6. Fetch profile (username, account_type)
    let username = '';
    let accountType = '';
    try {
      const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${encodeURIComponent(longToken)}`);
      if (meRes.ok) {
        const meJson = await meRes.json();
        username = meJson?.username || '';
        accountType = meJson?.account_type || '';
        if (meJson?.id && !igUserId) {
          // best-effort fallback — keep id from /me
        }
      }
    } catch { /* non-fatal */ }

    // 7. Upsert PlatformConnection
    const filter = { userId: payload.userId, botId: bot._id, platform: 'instagram' };
    const update = {
      userId: payload.userId,
      botId: bot._id,
      platform: 'instagram',
      displayName: username || bot.name,
      instagramUsername: username,
      instagramBusinessAccountId: igUserId,
      metaAppId: appId,
      accessTokenEncrypted: encryptToken(longToken),
      tokenExpiresAt: expiresInSec > 0 ? new Date(Date.now() + expiresInSec * 1000) : null,
      status: 'connected',
      permissions: INSTAGRAM_SCOPES,
      metadata: { accountType: accountType || '' },
      updatedAt: new Date(),
    };
    await PlatformConnection.findOneAndUpdate(filter, { $set: update }, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    bot.instagramConnected = true;
    if (username) bot.instagramHandle = username;
    await bot.save();

    return res.redirect(buildSettingsRedirect(locale, { integration: 'instagram_connected' }));
  } catch (err) {
    // Never leak token in logs
    console.error('[ig-oauth] callback failure', err?.message || 'unknown');
    return res.redirect(buildSettingsRedirect(locale, { integration: 'instagram_error', reason: 'server_error' }));
  }
});

/* ============================================================
   AUTHENTICATED ROUTES BELOW
   ============================================================ */
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { botId } = req.query;
  const filter = { userId: req.userId };
  if (botId) filter.botId = String(botId);
  const connections = await PlatformConnection.find(filter).sort({ createdAt: -1 });
  return res.json({ connections: connections.map((c) => c.toPublic()) });
});

/**
 * GET /api/integrations/instagram/oauth/start?botId=...&locale=az|tr
 *
 * Returns `{ authorizeUrl }`. The frontend then sets
 * `window.location.href = authorizeUrl` to send the seller to Instagram.
 *
 * We embed userId+botId+nonce in a short-lived signed JWT used as the
 * `state` param so the public callback can identify the seller without
 * needing a Bearer token.
 */
router.get('/instagram/oauth/start', async (req, res) => {
  const { botId, locale } = req.query;
  if (!botId) return res.status(400).json({ error: 'botId_required' });
  const bot = await Bot.findOne({ _id: String(botId), userId: req.userId });
  if (!bot) return res.status(404).json({ error: 'bot_not_found' });

  const appId = process.env.META_APP_ID;
  if (!appId) return res.status(500).json({ error: 'app_not_configured' });

  const nonce = crypto.randomBytes(16).toString('hex');
  const stateToken = jwt.sign(
    {
      type: STATE_TYPE,
      userId: req.userId,
      botId: bot._id,
      nonce,
      locale: locale === 'tr' ? 'tr' : 'az',
    },
    config.jwtSecret,
    { expiresIn: STATE_TTL_SECONDS }
  );

  const params = new URLSearchParams({
    force_reauth: 'true',
    client_id: appId,
    redirect_uri: getInstagramRedirectUri(),
    response_type: 'code',
    scope: INSTAGRAM_SCOPES.join(','),
    state: stateToken,
  });
  const authorizeUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  return res.json({ authorizeUrl });
});

/* ----------- Manual connect endpoints (kept for backend ops) ----------- */

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

  const bot = await Bot.findOne({ _id: conn.botId, userId: req.userId });
  if (bot) {
    if (conn.platform === 'instagram') bot.instagramConnected = false;
    if (conn.platform === 'whatsapp') bot.whatsappConnected = false;
    await bot.save();
  }
  return res.json({ ok: true });
});

export default router;
