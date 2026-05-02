import { Router } from 'express';
import { z } from 'zod';
import { InstagramComment } from '../models/InstagramComment.js';
import { PlatformConnection } from '../models/PlatformConnection.js';
import { authMiddleware } from '../middleware/auth.js';

/**
 * Seller-facing leads API for Instagram comment events.
 *
 * Read-only list + PATCH for lead workflow fields (leadStatus / note).
 * We deliberately omit any token, encrypted credential, Gemini prompt,
 * or raw webhook payload from the response.
 */

const router = Router();
router.use(authMiddleware);

const LEAD_STATUSES = ['new', 'viewed', 'contacted', 'converted', 'dismissed'];
const REPLY_STATUSES = ['pending', 'sent', 'failed', 'skipped'];

/* ----------------- own-reply / bot-echo exclusion ------------------ */
// Text markers that identify the bot's own public-reply template. Mirrors
// the loop-guard in services/commentAutoReply.js and adds a few variants
// so historical records written before the loop-fix are also filtered out.
const OWN_TEXT_MARKERS_REGEX =
  'ətraflı məlumatı dm|etrafli melumati dm|detaylı bilgiyi dm|detayli bilgiyi dm|' +
  'dm-də göndərdik|dm-de gonderdik|dm’de gönderdik|dm\'de gonderdik|' +
  'отправили в dm|отправили в личные|sent in dm|sent to your dm|sent you a dm|' +
  'sent the details to your dm';

/**
 * Build a Mongo `$and` fragment that excludes the bot's own reply echoes
 * from lead list/stats queries. Applied identically across every endpoint
 * so no filter chip can bypass it.
 */
async function buildOwnReplyExcludeFilter(userId) {
  const conns = await PlatformConnection.find(
    { userId, platform: 'instagram' },
    {
      instagramUsername: 1,
      instagramBusinessAccountId: 1,
      instagramUserId: 1,
      instagramPageId: 1,
      externalAccountId: 1,
      platformAccountId: 1,
      accountId: 1,
    }
  ).lean();

  const ownUsernames = new Set();
  const ownIds = new Set();
  // Always treat the platform handle itself as "ours" — defensive in case
  // the connection row's instagramUsername was never saved.
  ownUsernames.add('aioperator.social');
  for (const c of conns) {
    if (c?.instagramUsername) ownUsernames.add(String(c.instagramUsername).toLowerCase());
    [
      c?.instagramBusinessAccountId,
      c?.instagramUserId,
      c?.instagramPageId,
      c?.externalAccountId,
      c?.platformAccountId,
      c?.accountId,
    ].forEach((v) => {
      if (v !== undefined && v !== null && String(v) !== '') ownIds.add(String(v));
    });
  }

  const usernameArr = Array.from(ownUsernames);
  const idArr = Array.from(ownIds);

  const and = [
    // Explicit opt-out flag (set by backfill / admin actions).
    { 'metadata.hiddenFromLeads': { $ne: true } },
    // Text does NOT look like our own public-reply template.
    {
      $or: [
        { text: { $in: [null, ''] } },
        { text: { $not: new RegExp(OWN_TEXT_MARKERS_REGEX, 'i') } },
      ],
    },
  ];

  if (usernameArr.length) {
    and.push({
      // Case-insensitive NOT-IN on customerUsername.
      $or: [
        { customerUsername: { $in: [null, ''] } },
        {
          customerUsername: {
            $not: new RegExp(
              `^(${usernameArr
                .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|')})$`,
              'i'
            ),
          },
        },
      ],
    });
  }

  if (idArr.length) {
    and.push({
      $or: [
        { customerExternalId: { $in: [null, ''] } },
        { customerExternalId: { $nin: idArr } },
      ],
    });
  }

  return and;
}

/**
 * Idempotent backfill: flag historical bot-reply records as
 * `metadata.hiddenFromLeads: true`. Runs once per process per user.
 * Does NOT touch real customer comment records.
 */
const _backfilledUsers = new Set();
async function backfillHiddenLeadsOnce(userId) {
  if (_backfilledUsers.has(userId)) return;
  _backfilledUsers.add(userId);
  try {
    const conns = await PlatformConnection.find(
      { userId, platform: 'instagram' },
      {
        instagramUsername: 1,
        instagramBusinessAccountId: 1,
        instagramUserId: 1,
        instagramPageId: 1,
        externalAccountId: 1,
        platformAccountId: 1,
        accountId: 1,
      }
    ).lean();

    const usernames = new Set(['aioperator.social']);
    const ids = new Set();
    for (const c of conns) {
      if (c?.instagramUsername) usernames.add(String(c.instagramUsername).toLowerCase());
      [
        c?.instagramBusinessAccountId,
        c?.instagramUserId,
        c?.instagramPageId,
        c?.externalAccountId,
        c?.platformAccountId,
        c?.accountId,
      ].forEach((v) => {
        if (v !== undefined && v !== null && String(v) !== '') ids.add(String(v));
      });
    }

    const or = [
      { text: new RegExp(OWN_TEXT_MARKERS_REGEX, 'i') },
    ];
    if (usernames.size) {
      or.push({
        customerUsername: new RegExp(
          `^(${Array.from(usernames)
            .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|')})$`,
          'i'
        ),
      });
    }
    if (ids.size) {
      or.push({ customerExternalId: { $in: Array.from(ids) } });
    }

    const result = await InstagramComment.updateMany(
      {
        userId,
        'metadata.hiddenFromLeads': { $ne: true },
        $or: or,
      },
      {
        $set: { 'metadata.hiddenFromLeads': true },
      }
    );
    if (result?.modifiedCount) {
      console.log('[leads] backfill', {
        userId,
        hidden: result.modifiedCount,
      });
    }
  } catch (err) {
    // Best-effort — a failed backfill must not break list/stats requests.
    _backfilledUsers.delete(userId);
    console.warn('[leads] backfill_failed', {
      userId,
      error: err?.message || 'unknown',
    });
  }
}

/* --------------------------- serialization --------------------------- */

function toSafePublic(doc) {
  if (!doc) return null;
  const textPreview = String(doc.text || '').slice(0, 280);
  return {
    id: doc._id,
    platform: doc.platform || 'instagram',
    sourceType: 'comment',
    externalCommentId: doc.externalCommentId || '',
    externalMediaId: doc.externalMediaId || '',
    parentCommentId: doc.parentCommentId || '',
    customerExternalId: doc.customerExternalId || '',
    customerUsername: doc.customerUsername || '',
    textPreview,
    publicReplyStatus: doc.publicReplyStatus || 'pending',
    privateReplyStatus: doc.privateReplyStatus || 'pending',
    // Safe error labels only (model already stores short labels).
    publicReplyError: doc.publicReplyError || '',
    privateReplyError: doc.privateReplyError || '',
    publicReplyAt: doc.publicReplyAt || null,
    privateReplyAt: doc.privateReplyAt || null,
    leadStatus: doc.leadStatus || 'new',
    note: doc.note || '',
    permalink: doc.permalink || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/* ------------------------------ GET list ----------------------------- */

router.get('/instagram-comments', async (req, res) => {
  // Historical bot-reply echo records get flagged on first hit.
  await backfillHiddenLeadsOnce(req.userId);

  const {
    status, // leadStatus alias
    leadStatus,
    replyStatus, // matches either public or private status
    sourceType, // currently only 'comment'
    dateFrom,
    dateTo,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = { userId: req.userId };
  const effectiveLeadStatus = leadStatus || status;
  if (effectiveLeadStatus && LEAD_STATUSES.includes(String(effectiveLeadStatus))) {
    filter.leadStatus = String(effectiveLeadStatus);
  }
  if (sourceType && sourceType !== 'comment') {
    // Comment leads only for this endpoint. Other source types get empty results.
    return res.json({ items: [], total: 0, page: Number(page), limit: Number(limit) });
  }
  if (replyStatus && REPLY_STATUSES.includes(String(replyStatus))) {
    filter.$or = [
      { publicReplyStatus: String(replyStatus) },
      { privateReplyStatus: String(replyStatus) },
    ];
  }
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    const from = dateFrom ? new Date(String(dateFrom)) : null;
    const to = dateTo ? new Date(String(dateTo)) : null;
    if (from && !isNaN(from.getTime())) filter.createdAt.$gte = from;
    if (to && !isNaN(to.getTime())) filter.createdAt.$lte = to;
    if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
  }
  if (search && String(search).trim()) {
    const q = String(search).trim();
    // Match username / comment id / customer id / text substring (case-insensitive).
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const searchOr = [
      { customerUsername: rx },
      { customerExternalId: rx },
      { externalCommentId: rx },
      { text: rx },
    ];
    // Merge with any existing $or from replyStatus using $and.
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * pageSize;

  // Always exclude bot's own reply echoes — applied to every filter combo.
  const ownExclude = await buildOwnReplyExcludeFilter(req.userId);
  const finalFilter = { $and: [filter, ...ownExclude] };

  const [items, total] = await Promise.all([
    InstagramComment.find(finalFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    InstagramComment.countDocuments(finalFilter),
  ]);

  console.log('[leads] list', {
    userId: req.userId,
    page: pageNum,
    limit: pageSize,
    total,
  });

  return res.json({
    items: items.map(toSafePublic),
    total,
    page: pageNum,
    limit: pageSize,
  });
});

/* ----------------------------- stats / KPI --------------------------- */

router.get('/instagram-comments/stats', async (req, res) => {
  await backfillHiddenLeadsOnce(req.userId);
  const ownExclude = await buildOwnReplyExcludeFilter(req.userId);
  const wrap = (extra) => ({ $and: [{ userId: req.userId, ...extra }, ...ownExclude] });

  const [total, fresh, publicSent, privateSent, converted, failedPublic, failedPrivate] =
    await Promise.all([
      InstagramComment.countDocuments(wrap({})),
      InstagramComment.countDocuments(wrap({ leadStatus: 'new' })),
      InstagramComment.countDocuments(wrap({ publicReplyStatus: 'sent' })),
      InstagramComment.countDocuments(wrap({ privateReplyStatus: 'sent' })),
      InstagramComment.countDocuments(wrap({ leadStatus: 'converted' })),
      InstagramComment.countDocuments(wrap({ publicReplyStatus: 'failed' })),
      InstagramComment.countDocuments(wrap({ privateReplyStatus: 'failed' })),
    ]);
  return res.json({
    total,
    new: fresh,
    publicReplied: publicSent,
    privateReplied: privateSent,
    converted,
    failed: failedPublic + failedPrivate,
  });
});

/* ------------------------------ GET one ------------------------------ */

router.get('/instagram-comments/:id', async (req, res) => {
  const ownExclude = await buildOwnReplyExcludeFilter(req.userId);
  const doc = await InstagramComment.findOne({
    $and: [{ _id: req.params.id, userId: req.userId }, ...ownExclude],
  });
  if (!doc) return res.status(404).json({ error: 'not_found' });
  const safe = toSafePublic(doc);
  // Include full text on the detail endpoint (preview was truncated on list).
  return res.json({ item: { ...safe, text: doc.text || '' } });
});

/* ------------------------------- PATCH ------------------------------- */

const patchSchema = z
  .object({
    leadStatus: z.enum(LEAD_STATUSES).optional(),
    note: z.string().max(2000).optional(),
  })
  .refine((v) => v.leadStatus !== undefined || v.note !== undefined, {
    message: 'at least one of leadStatus / note is required',
  });

router.patch('/instagram-comments/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const set = {};
  if (parsed.data.leadStatus !== undefined) set.leadStatus = parsed.data.leadStatus;
  if (parsed.data.note !== undefined) set.note = parsed.data.note;

  const doc = await InstagramComment.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: set },
    { new: true }
  );
  if (!doc) return res.status(404).json({ error: 'not_found' });

  console.log('[leads] update', {
    userId: req.userId,
    leadId: doc._id,
    leadStatus: doc.leadStatus,
  });

  return res.json({ item: toSafePublic(doc) });
});

export default router;
