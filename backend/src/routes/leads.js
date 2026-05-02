import { Router } from 'express';
import { z } from 'zod';
import { InstagramComment } from '../models/InstagramComment.js';
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

  const [items, total] = await Promise.all([
    InstagramComment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    InstagramComment.countDocuments(filter),
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
  const base = { userId: req.userId };
  const [total, fresh, publicSent, privateSent, converted, failedPublic, failedPrivate] =
    await Promise.all([
      InstagramComment.countDocuments(base),
      InstagramComment.countDocuments({ ...base, leadStatus: 'new' }),
      InstagramComment.countDocuments({ ...base, publicReplyStatus: 'sent' }),
      InstagramComment.countDocuments({ ...base, privateReplyStatus: 'sent' }),
      InstagramComment.countDocuments({ ...base, leadStatus: 'converted' }),
      InstagramComment.countDocuments({ ...base, publicReplyStatus: 'failed' }),
      InstagramComment.countDocuments({ ...base, privateReplyStatus: 'failed' }),
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
  const doc = await InstagramComment.findOne({ _id: req.params.id, userId: req.userId });
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
