import { InstagramComment } from '../models/InstagramComment.js';
import { Product } from '../models/Product.js';
import { BotTraining } from '../models/BotTraining.js';
import { generateReply } from './ai.js';
import { matchProducts } from './productMatcher.js';
import {
  replyToInstagramComment,
  sendInstagramPrivateReplyToComment,
} from './instagramCommentService.js';
import { config } from '../config.js';

/**
 * Orchestrate auto-reply for a single Instagram comment event.
 *
 * Flow:
 *   1. Parse + validate inbound comment event.
 *   2. Dedupe by externalCommentId (upsert).
 *   3. Intent / spam filter — bail early with a safe-skip log.
 *   4. Generate sales reply via Gemini (existing generateReply service).
 *   5. Send public reply ("Salam, məlumatı DM-də göndəririk.") and private reply
 *      (full Gemini answer) according to replyMode.
 *   6. Persist per-side status (sent / failed) + error codes — never throws.
 *
 * SECURITY: never logs tokens, api keys, prompts, comment/reply text, or
 * full payloads. Only safe labels + ids.
 */

const DEFAULT_REPLY_MODE = 'public_then_private';

// Short public reply shown under the comment. Kept deliberately generic so we
// never promise specific product details in a public thread.
const PUBLIC_REPLY_BY_LANG = {
  az: 'Salam! Ətraflı məlumatı DM-də göndərdik 💬',
  tr: 'Merhaba! Detaylı bilgiyi DM olarak ilettik 💬',
  ru: 'Здравствуйте! Подробности отправили вам в личные сообщения 💬',
  en: 'Hi! We’ve just sent the details to your DMs 💬',
};

/* ------------------------------ helpers ------------------------------ */

function detectLanguage(text, training) {
  const mode = training?.languageMode;
  if (mode === 'az' || mode === 'tr') return mode;
  const t = String(text || '').toLowerCase();
  if (!t) return 'az';
  // Cyrillic → ru
  if (/[а-яё]/i.test(t)) return 'ru';
  // AZ-specific ə
  if (/ə/.test(t)) return 'az';
  if (/\b(merhaba|nasılsın|nasilsin|teşekkür|tesekkur|fiyat|fiyatı|kaç|kac|nasıl|nasil)\b/.test(t)) {
    return 'tr';
  }
  if (/\b(salam|necəsən|qiymət|qiymeti|qiymet|neçə|nece|çatdırılma|catdirilma)\b/.test(t)) {
    return 'az';
  }
  // Latin fallback → English as safe default for truly random text.
  if (/[a-z]/.test(t)) return 'en';
  return 'az';
}

// Lightweight spam / empty / emoji-only filter.
function isMeaningfulComment(text) {
  if (!text) return false;
  const trimmed = String(text).trim();
  if (trimmed.length < 2) return false;
  // Letter OR digit must be present (so pure emoji / punctuation is filtered out).
  if (!/[\p{L}\p{N}]/u.test(trimmed)) return false;
  return true;
}

/**
 * Extract the minimal fields we need from an Instagram webhook change event.
 * Supports both `changes[{field:'comments', value:{...}}]` and best-effort
 * parsing of nested shapes. Returns null on unknown shapes.
 */
export function parseCommentChange(change) {
  try {
    if (!change || typeof change !== 'object') return null;
    if (change.field !== 'comments') return null;
    const v = change.value || {};
    const commentId = v.id ? String(v.id) : '';
    if (!commentId) return null;

    const from = v.from || {};
    const media = v.media || {};

    return {
      externalCommentId: commentId,
      externalMediaId: media.id ? String(media.id) : '',
      parentCommentId: v.parent_id ? String(v.parent_id) : '',
      customerExternalId: from.id ? String(from.id) : '',
      customerUsername: from.username ? String(from.username) : '',
      text: v.text ? String(v.text) : '',
      timestamp: v.timestamp ? new Date(v.timestamp) : null,
    };
  } catch {
    return null;
  }
}

/* --------------------------- persistence --------------------------- */

async function upsertCommentRecord({ connection, parsed }) {
  // Try insert; if unique externalCommentId collides → treat as duplicate.
  try {
    const doc = await InstagramComment.create({
      userId: connection.userId,
      botId: connection.botId,
      externalCommentId: parsed.externalCommentId,
      externalMediaId: parsed.externalMediaId,
      parentCommentId: parsed.parentCommentId,
      customerExternalId: parsed.customerExternalId,
      customerUsername: parsed.customerUsername,
      text: parsed.text,
      timestamp: parsed.timestamp,
      replyMode: DEFAULT_REPLY_MODE,
    });
    return { doc, duplicate: false };
  } catch (err) {
    // Duplicate key on externalCommentId → fetch existing.
    if (err?.code === 11000) {
      const existing = await InstagramComment.findOne({
        externalCommentId: parsed.externalCommentId,
      });
      return { doc: existing, duplicate: true };
    }
    throw err;
  }
}

/* ------------------------------- main ------------------------------- */

/**
 * Process a single comment `change` from the Instagram webhook.
 * Safe to await from the webhook — never throws.
 *
 * @param {object} opts
 * @param {object} opts.connection  PlatformConnection (instagram, connected)
 * @param {object} opts.change      One entry.changes[*] object from the payload
 * @param {string} opts.entryId     Diagnostic entry.id (for safe logs)
 */
export async function handleInstagramCommentChange({ connection, change, entryId }) {
  try {
    const parsed = parseCommentChange(change);
    if (!parsed) {
      console.warn('[ig-comment] skipped', { reason: 'unsupported_shape', entryId: String(entryId || '') });
      return;
    }

    const { doc, duplicate } = await upsertCommentRecord({ connection, parsed });
    if (!doc) {
      console.warn('[ig-comment] skipped', {
        reason: 'persist_failed',
        commentId: parsed.externalCommentId,
      });
      return;
    }

    if (duplicate) {
      console.warn('[ig-comment] skipped', {
        reason: 'duplicate_comment',
        commentId: parsed.externalCommentId,
      });
      return;
    }

    console.log('[ig-comment] received', {
      connectionId: connection?._id,
      mediaId: parsed.externalMediaId,
      commentId: parsed.externalCommentId,
    });

    // Skip our own replies — Instagram delivers a "comments" event for the
    // reply itself. If the commenter id equals the connected IG account, it's us.
    const connectedIgId =
      connection?.instagramBusinessAccountId ||
      connection?.instagramUserId ||
      connection?.platformAccountId ||
      connection?.externalAccountId ||
      connection?.accountId ||
      '';
    if (connectedIgId && parsed.customerExternalId && parsed.customerExternalId === String(connectedIgId)) {
      doc.publicReplyStatus = 'skipped';
      doc.privateReplyStatus = 'skipped';
      doc.metadata = { ...(doc.metadata || {}), skipReason: 'own_comment' };
      await doc.save();
      console.warn('[ig-comment] skipped', { reason: 'own_comment', commentId: parsed.externalCommentId });
      return;
    }

    // Empty / emoji-only / noise filter.
    if (!isMeaningfulComment(parsed.text)) {
      doc.publicReplyStatus = 'skipped';
      doc.privateReplyStatus = 'skipped';
      doc.metadata = { ...(doc.metadata || {}), skipReason: 'empty_or_noise' };
      await doc.save();
      console.warn('[ig-comment] skipped', {
        reason: 'empty_text',
        commentId: parsed.externalCommentId,
      });
      return;
    }

    if (!config.aiEnabled) {
      doc.publicReplyStatus = 'skipped';
      doc.privateReplyStatus = 'skipped';
      doc.metadata = { ...(doc.metadata || {}), skipReason: 'ai_disabled' };
      await doc.save();
      console.warn('[ig-comment] skipped', {
        reason: 'ai_disabled',
        commentId: parsed.externalCommentId,
      });
      return;
    }

    // Build Gemini context (training + matched products, reuse DM services).
    const [training, allProducts] = await Promise.all([
      BotTraining.findOne({ botId: connection.botId }),
      Product.find({
        userId: connection.userId,
        $or: [{ botId: connection.botId }, { botId: null }, { botId: '' }],
      }),
    ]);

    const trainingPublic = training ? training.toPublic() : null;
    const languageHint = detectLanguage(parsed.text, trainingPublic);
    const matched = matchProducts(
      parsed.text,
      allProducts.map((p) => p.toPublic()),
      3
    );

    const ai = await generateReply({
      training: trainingPublic,
      matchedProducts: matched,
      userMessage: parsed.text,
      languageHint: languageHint === 'ru' || languageHint === 'en' ? 'az' : languageHint, // generateReply only knows az/tr
    });

    const privateReplyText = String(ai?.reply || '').trim();
    const publicReplyText =
      PUBLIC_REPLY_BY_LANG[languageHint] || PUBLIC_REPLY_BY_LANG.az;

    const replyMode = doc.replyMode || DEFAULT_REPLY_MODE;

    /* ---------------- public reply ---------------- */
    if (replyMode === 'public_only' || replyMode === 'public_then_private') {
      const pub = await replyToInstagramComment(connection, parsed.externalCommentId, publicReplyText);
      if (pub.ok) {
        doc.publicReplyStatus = 'sent';
        doc.publicReplyText = publicReplyText;
        doc.publicReplyExternalId = pub.replyId || '';
        doc.publicReplyAt = new Date();
        console.log('[ig-comment] public-reply-sent', {
          commentId: parsed.externalCommentId,
          replyId: pub.replyId || '',
        });
      } else {
        doc.publicReplyStatus = 'failed';
        doc.publicReplyError = pub.error || 'unknown';
        console.warn('[ig-comment] failed', {
          commentId: parsed.externalCommentId,
          stage: 'public_reply',
          errorCode: pub.errorCode || '',
          error: pub.error || 'unknown',
        });
      }
    } else {
      doc.publicReplyStatus = 'skipped';
    }

    /* ---------------- private reply ---------------- */
    if (replyMode === 'private_only' || replyMode === 'public_then_private') {
      if (!privateReplyText) {
        doc.privateReplyStatus = 'failed';
        doc.privateReplyError = 'empty_reply';
        console.warn('[ig-comment] failed', {
          commentId: parsed.externalCommentId,
          stage: 'private_reply',
          errorCode: 'empty_reply',
          error: 'empty_reply',
        });
      } else {
        const priv = await sendInstagramPrivateReplyToComment(
          connection,
          parsed.externalCommentId,
          privateReplyText
        );
        if (priv.ok) {
          doc.privateReplyStatus = 'sent';
          doc.privateReplyText = privateReplyText;
          doc.privateReplyExternalMessageId = priv.messageId || '';
          doc.privateReplyAt = new Date();
          doc.metadata = {
            ...(doc.metadata || {}),
            aiModel: ai?.model || '',
            aiMock: Boolean(ai?.mock),
          };
          console.log('[ig-comment] private-reply-sent', {
            commentId: parsed.externalCommentId,
            messageId: priv.messageId || '',
          });
        } else {
          doc.privateReplyStatus = 'failed';
          doc.privateReplyError = priv.error || 'unknown';
          console.warn('[ig-comment] failed', {
            commentId: parsed.externalCommentId,
            stage: 'private_reply',
            errorCode: priv.errorCode || '',
            error: priv.error || 'unknown',
          });
        }
      }
    } else {
      doc.privateReplyStatus = 'skipped';
    }

    await doc.save();
  } catch (err) {
    // Absolutely never throw out of here.
    console.warn('[ig-comment] failed', {
      commentId: change?.value?.id || '',
      stage: 'unhandled',
      errorCode: 'unhandled',
      error: err?.message || 'unknown',
    });
  }
}
