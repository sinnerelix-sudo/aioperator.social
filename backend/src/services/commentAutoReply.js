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
 * Hard constraints per comment:
 *   - at most 1 public reply
 *   - at most 1 private reply
 *   - no processing of the bot's own reply comments (prevents loops)
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

// Substrings that identify one of our past / current public reply templates.
// Matched case-insensitively against incoming comment text.
const OWN_PUBLIC_REPLY_MARKERS = [
  'ətraflı məlumatı dm',
  'etrafli melumati dm',
  'detaylı bilgiyi dm',
  'detayli bilgiyi dm',
  'dm-də göndərdik',
  'dm-de gonderdik',
  'dm’de gönderdik',
  'dm\'de gonderdik',
  'отправили в dm',
  'отправили в личные',
  'sent in dm',
  'sent to your dm',
  'sent you a dm',
  'sent the details to your dm',
];

/* ------------------------------ helpers ------------------------------ */

function detectLanguage(text, training) {
  const mode = training?.languageMode;
  if (mode === 'az' || mode === 'tr') return mode;
  const t = String(text || '').toLowerCase();
  if (!t) return 'az';
  if (/[а-яё]/i.test(t)) return 'ru';
  if (/ə/.test(t)) return 'az';
  if (/\b(merhaba|nasılsın|nasilsin|teşekkür|tesekkur|fiyat|fiyatı|kaç|kac|nasıl|nasil)\b/.test(t)) {
    return 'tr';
  }
  if (/\b(salam|necəsən|qiymət|qiymeti|qiymet|neçə|nece|çatdırılma|catdirilma)\b/.test(t)) {
    return 'az';
  }
  if (/[a-z]/.test(t)) return 'en';
  return 'az';
}

function isMeaningfulComment(text) {
  if (!text) return false;
  const trimmed = String(text).trim();
  if (trimmed.length < 2) return false;
  if (!/[\p{L}\p{N}]/u.test(trimmed)) return false;
  return true;
}

/** All IG account identifiers we consider "ours" for loop detection. */
function ownIgIdSet(connection) {
  const set = new Set();
  const add = (v) => {
    if (v !== undefined && v !== null && String(v) !== '') set.add(String(v));
  };
  add(connection?.instagramBusinessAccountId);
  add(connection?.instagramUserId);
  add(connection?.instagramPageId);
  add(connection?.externalAccountId);
  add(connection?.platformAccountId);
  add(connection?.accountId);
  return set;
}

function textLooksLikeOwnPublicReply(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  for (const marker of OWN_PUBLIC_REPLY_MARKERS) {
    if (t.includes(marker)) return true;
  }
  return false;
}

/**
 * Return true when the incoming comment was written by us (the connected
 * Instagram business account). We evaluate every signal available in the
 * payload so that a missing `from.id` cannot defeat the check.
 */
async function isOwnComment({ connection, parsed }) {
  const ownIds = ownIgIdSet(connection);
  const ownUsername = String(connection?.instagramUsername || '').toLowerCase();

  if (parsed.customerExternalId && ownIds.has(String(parsed.customerExternalId))) {
    return { own: true, reason: 'own_account_id' };
  }
  if (
    ownUsername &&
    parsed.customerUsername &&
    String(parsed.customerUsername).toLowerCase() === ownUsername
  ) {
    return { own: true, reason: 'own_username' };
  }

  // Text template match — catches edge cases where Instagram delivers no
  // `from.id` on our own reply event.
  if (textLooksLikeOwnPublicReply(parsed.text)) {
    return { own: true, reason: 'own_text_template' };
  }

  // Reply-to-our-own-reply: if parent_id matches a comment we have already
  // public-replied to, this event is almost certainly our own reply echo
  // OR a nested reply chain started by our reply. We skip to break the loop.
  if (parsed.parentCommentId) {
    const parent = await InstagramComment.findOne({
      $or: [
        { publicReplyExternalId: String(parsed.parentCommentId) },
        { externalCommentId: String(parsed.parentCommentId) },
      ],
    }).lean();
    if (parent) {
      // If the parent is OUR public reply, this is the echo of our reply — skip.
      if (parent.publicReplyExternalId && String(parent.publicReplyExternalId) === String(parsed.parentCommentId)) {
        return { own: true, reason: 'reply_echo_of_own_reply' };
      }
      // If the parent is the original customer comment and we have already
      // public-replied to it, and this new event's author id is also in our
      // own ids — treat as our reply echo. (Defensive — already covered above.)
      if (
        parent.externalCommentId &&
        String(parent.externalCommentId) === String(parsed.parentCommentId) &&
        parent.publicReplyStatus === 'sent' &&
        parsed.customerExternalId &&
        ownIds.has(String(parsed.customerExternalId))
      ) {
        return { own: true, reason: 'reply_echo_on_original' };
      }
    }
  }

  return { own: false };
}

/**
 * Extract the minimal fields we need from an Instagram webhook change event.
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
    if (err?.code === 11000) {
      const existing = await InstagramComment.findOne({
        externalCommentId: parsed.externalCommentId,
      });
      return { doc: existing, duplicate: true };
    }
    throw err;
  }
}

/**
 * Atomically claim a send side so at most one worker can proceed.
 * Returns true on a successful claim, false if already claimed / sent / skipped.
 */
async function claimSendSide(commentDocId, side) {
  const statusField = side === 'public' ? 'publicReplyStatus' : 'privateReplyStatus';
  const claimField = side === 'public' ? 'publicReplyClaimedAt' : 'privateReplyClaimedAt';
  // Only claim when status is still 'pending' AND not claimed within the last 2 minutes
  // (the second condition guards against a stuck/crashed first attempt).
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
  const res = await InstagramComment.findOneAndUpdate(
    {
      _id: commentDocId,
      [statusField]: 'pending',
      $or: [
        { [`metadata.${claimField}`]: { $exists: false } },
        { [`metadata.${claimField}`]: null },
        { [`metadata.${claimField}`]: { $lt: twoMinAgo } },
      ],
    },
    {
      $set: { [`metadata.${claimField}`]: new Date() },
    },
    { new: true }
  );
  return Boolean(res);
}

/* ------------------------------- main ------------------------------- */

/**
 * Process a single comment `change` from the Instagram webhook.
 * Safe to await from the webhook — never throws.
 */
export async function handleInstagramCommentChange({ connection, change, entryId }) {
  const entryIdStr = String(entryId || '');
  let parsed = null;
  try {
    parsed = parseCommentChange(change);
    if (!parsed) {
      console.warn('[ig-comment] skipped', { reason: 'unsupported_shape', entryId: entryIdStr });
      return;
    }

    // ---- OWN-COMMENT DETECTION — *before* any DB write / Gemini call. ----
    // Instagram webhook also delivers events for OUR OWN public replies. If
    // we let them through, we'd create a new InstagramComment record and
    // fire yet another public reply, producing an infinite loop.
    const own = await isOwnComment({ connection, parsed });
    if (own.own) {
      console.warn('[ig-comment] skipped', {
        reason: 'own_comment',
        detail: own.reason,
        commentId: parsed.externalCommentId,
      });
      return;
    }

    // Empty / emoji-only / noise filter — also before DB write so we don't
    // pollute the collection with useless records.
    if (!isMeaningfulComment(parsed.text)) {
      console.warn('[ig-comment] skipped', {
        reason: 'empty_text',
        commentId: parsed.externalCommentId,
      });
      return;
    }

    // Persist (idempotent on externalCommentId).
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
      languageHint: languageHint === 'ru' || languageHint === 'en' ? 'az' : languageHint,
    });

    const privateReplyText = String(ai?.reply || '').trim();
    const publicReplyText = PUBLIC_REPLY_BY_LANG[languageHint] || PUBLIC_REPLY_BY_LANG.az;

    const replyMode = doc.replyMode || DEFAULT_REPLY_MODE;

    /* ---------------- public reply ---------------- */
    if (replyMode === 'public_only' || replyMode === 'public_then_private') {
      // Second guard: only one public reply per externalCommentId.
      const fresh = await InstagramComment.findById(doc._id).lean();
      if (fresh?.publicReplyStatus === 'sent') {
        console.warn('[ig-comment] skipped', {
          reason: 'already_public_replied',
          commentId: parsed.externalCommentId,
        });
      } else {
        // Atomic claim — wins the race when two webhooks arrive in parallel.
        const claimed = await claimSendSide(doc._id, 'public');
        if (!claimed) {
          console.warn('[ig-comment] skipped', {
            reason: 'public_claim_lost',
            commentId: parsed.externalCommentId,
          });
        } else {
          const pub = await replyToInstagramComment(connection, parsed.externalCommentId, publicReplyText);
          if (pub.ok) {
            await InstagramComment.updateOne(
              { _id: doc._id },
              {
                $set: {
                  publicReplyStatus: 'sent',
                  publicReplyText: publicReplyText,
                  publicReplyExternalId: pub.replyId || '',
                  publicReplyAt: new Date(),
                },
              }
            );
            console.log('[ig-comment] public-reply-sent', {
              commentId: parsed.externalCommentId,
              replyId: pub.replyId || '',
            });
          } else {
            await InstagramComment.updateOne(
              { _id: doc._id },
              {
                $set: {
                  publicReplyStatus: 'failed',
                  publicReplyError: pub.error || 'unknown',
                },
              }
            );
            console.warn('[ig-comment] failed', {
              commentId: parsed.externalCommentId,
              stage: 'public_reply',
              errorCode: pub.errorCode || '',
              error: pub.error || 'unknown',
            });
          }
        }
      }
    } else {
      await InstagramComment.updateOne(
        { _id: doc._id },
        { $set: { publicReplyStatus: 'skipped' } }
      );
    }

    /* ---------------- private reply ---------------- */
    if (replyMode === 'private_only' || replyMode === 'public_then_private') {
      const fresh = await InstagramComment.findById(doc._id).lean();
      if (fresh?.privateReplyStatus === 'sent') {
        console.warn('[ig-comment] skipped', {
          reason: 'already_private_replied',
          commentId: parsed.externalCommentId,
        });
      } else if (!privateReplyText) {
        await InstagramComment.updateOne(
          { _id: doc._id },
          { $set: { privateReplyStatus: 'failed', privateReplyError: 'empty_reply' } }
        );
        console.warn('[ig-comment] failed', {
          commentId: parsed.externalCommentId,
          stage: 'private_reply',
          errorCode: 'empty_reply',
          error: 'empty_reply',
        });
      } else {
        const claimed = await claimSendSide(doc._id, 'private');
        if (!claimed) {
          console.warn('[ig-comment] skipped', {
            reason: 'private_claim_lost',
            commentId: parsed.externalCommentId,
          });
        } else {
          const priv = await sendInstagramPrivateReplyToComment(
            connection,
            parsed.externalCommentId,
            privateReplyText
          );
          if (priv.ok) {
            await InstagramComment.updateOne(
              { _id: doc._id },
              {
                $set: {
                  privateReplyStatus: 'sent',
                  privateReplyText: privateReplyText,
                  privateReplyExternalMessageId: priv.messageId || '',
                  privateReplyAt: new Date(),
                  'metadata.aiModel': ai?.model || '',
                  'metadata.aiMock': Boolean(ai?.mock),
                },
              }
            );
            console.log('[ig-comment] private-reply-sent', {
              commentId: parsed.externalCommentId,
              messageId: priv.messageId || '',
            });
          } else {
            await InstagramComment.updateOne(
              { _id: doc._id },
              {
                $set: {
                  privateReplyStatus: 'failed',
                  privateReplyError: priv.error || 'unknown',
                },
              }
            );
            console.warn('[ig-comment] failed', {
              commentId: parsed.externalCommentId,
              stage: 'private_reply',
              errorCode: priv.errorCode || '',
              error: priv.error || 'unknown',
            });
          }
        }
      }
    } else {
      await InstagramComment.updateOne(
        { _id: doc._id },
        { $set: { privateReplyStatus: 'skipped' } }
      );
    }
  } catch (err) {
    console.warn('[ig-comment] failed', {
      commentId: parsed?.externalCommentId || change?.value?.id || '',
      stage: 'unhandled',
      errorCode: 'unhandled',
      error: err?.message || 'unknown',
    });
  }
}
