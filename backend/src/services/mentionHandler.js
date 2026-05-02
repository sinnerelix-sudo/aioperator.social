import { InstagramMention } from '../models/InstagramMention.js';

/**
 * Handle Instagram mention / tag webhook events.
 *
 * Default strategy: `lead_only` — we persist the event so the seller sees it
 * as a lead but we do NOT send an automatic reply. This keeps the API-surface
 * tight while Meta's mention/tag payloads evolve.
 *
 * Supported `field` values (from entry.changes[]):
 *   - mentions
 *   - tags
 *   - media_tags
 *   - comment_mentions
 *   - caption_mentions
 *   (anything else → safe skip with `unsupported_field`).
 *
 * SECURITY: never logs tokens, api keys, prompts, text, full payloads, or
 * raw API bodies. Only safe labels + ids.
 */

// Webhook field → our internal sourceType.
const FIELD_TO_SOURCE_TYPE = {
  mentions: 'caption_mention',          // default to caption; refined by payload shape below
  tags: 'tag',
  media_tags: 'media_tag',
  comment_mentions: 'comment_mention',
  caption_mentions: 'caption_mention',
};

const SUPPORTED_FIELDS = new Set(Object.keys(FIELD_TO_SOURCE_TYPE));

// Text markers that hint the event was produced by our own reply (loop guard).
// Mirrors the comment auto-reply own-text detection.
const OWN_REPLY_MARKERS = [
  'ətraflı məlumatı dm',
  'etrafli melumati dm',
  'detaylı bilgiyi dm',
  'detayli bilgiyi dm',
  'dm-də göndərdik',
  'dm-de gonderdik',
  'dm’de gönderdik',
  "dm'de gonderdik",
  'отправили в dm',
  'отправили в личные',
  'sent in dm',
  'sent to your dm',
];

/* ----------------------------- helpers ----------------------------- */

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

function textLooksLikeOwnReply(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  for (const marker of OWN_REPLY_MARKERS) {
    if (t.includes(marker)) return true;
  }
  return false;
}

/**
 * Best-effort parsing of an Instagram mention/tag change event. Returns
 * null when the payload doesn't look like a mention/tag event at all.
 */
export function parseMentionChange(change) {
  try {
    if (!change || typeof change !== 'object') return null;
    const field = change.field ? String(change.field) : '';
    if (!SUPPORTED_FIELDS.has(field)) return null;

    const v = change.value || {};
    const from = v.from || {};
    const media = v.media || {};

    const externalCommentId = v.comment_id
      ? String(v.comment_id)
      : v.id && field.includes('comment')
      ? String(v.id)
      : '';
    const externalMediaId =
      (v.media_id && String(v.media_id)) ||
      (media.id && String(media.id)) ||
      (v.media && typeof v.media === 'string' ? v.media : '') ||
      '';

    // Prefer mention_id when Meta provides it; otherwise fall back to a
    // deterministic composite so retries still dedupe.
    const explicitId = v.mention_id || v.id || '';
    const externalMentionId = explicitId
      ? String(explicitId)
      : '';

    // Refine sourceType based on the payload contents.
    let sourceType = FIELD_TO_SOURCE_TYPE[field] || 'unknown_mention';
    if (field === 'mentions') {
      if (externalCommentId) sourceType = 'comment_mention';
      else if (externalMediaId) sourceType = 'caption_mention';
    }
    if (field === 'comment_mentions') sourceType = 'comment_mention';
    if (field === 'caption_mentions') sourceType = 'caption_mention';
    if (field === 'tags') sourceType = 'tag';
    if (field === 'media_tags') sourceType = 'media_tag';

    return {
      field,
      sourceType,
      externalMentionId,
      externalMediaId,
      externalCommentId,
      customerExternalId: from.id ? String(from.id) : '',
      customerUsername: from.username ? String(from.username) : '',
      text: v.text ? String(v.text) : '',
      permalink: v.permalink ? String(v.permalink) : '',
      timestamp: v.timestamp ? new Date(v.timestamp) : null,
    };
  } catch {
    return null;
  }
}

async function upsertMentionRecord({ connection, parsed }) {
  const base = {
    userId: connection.userId,
    botId: connection.botId || '',
    connectionId: connection._id ? String(connection._id) : '',
    externalMentionId: parsed.externalMentionId || '',
    externalMediaId: parsed.externalMediaId || '',
    externalCommentId: parsed.externalCommentId || '',
    customerExternalId: parsed.customerExternalId || '',
    customerUsername: parsed.customerUsername || '',
    sourceType: parsed.sourceType,
    text: parsed.text || '',
    permalink: parsed.permalink || '',
    timestamp: parsed.timestamp,
    status: 'received',
    replyMode: 'lead_only',
  };

  try {
    const doc = await InstagramMention.create(base);
    return { doc, duplicate: false };
  } catch (err) {
    if (err?.code === 11000) {
      // Either the partial-unique on externalMentionId or the composite
      // fallback fired. Fetch whichever one matches.
      let existing = null;
      if (parsed.externalMentionId) {
        existing = await InstagramMention.findOne({
          externalMentionId: parsed.externalMentionId,
        });
      }
      if (!existing) {
        existing = await InstagramMention.findOne({
          externalMediaId: parsed.externalMediaId,
          externalCommentId: parsed.externalCommentId,
          sourceType: parsed.sourceType,
          customerExternalId: parsed.customerExternalId,
        });
      }
      return { doc: existing, duplicate: true };
    }
    throw err;
  }
}

/* ------------------------------- main ------------------------------- */

/**
 * Handle a single mention/tag change event. Safe to await from the
 * webhook — never throws.
 */
export async function handleInstagramMentionChange({ connection, change, entryId }) {
  const entryIdStr = String(entryId || '');
  let parsed = null;
  try {
    parsed = parseMentionChange(change);
    if (!parsed) {
      console.warn('[ig-mention] skipped', {
        reason: 'unsupported_shape',
        entryId: entryIdStr,
      });
      return;
    }

    // Own-account / own-reply loop guard — BEFORE any DB write.
    const ownIds = ownIgIdSet(connection);
    const ownUsername = String(connection?.instagramUsername || '').toLowerCase();

    if (parsed.customerExternalId && ownIds.has(String(parsed.customerExternalId))) {
      console.warn('[ig-mention] skipped', {
        reason: 'own_account',
        detail: 'own_account_id',
        mentionId: parsed.externalMentionId || parsed.externalCommentId || parsed.externalMediaId,
      });
      return;
    }
    if (
      ownUsername &&
      parsed.customerUsername &&
      String(parsed.customerUsername).toLowerCase() === ownUsername
    ) {
      console.warn('[ig-mention] skipped', {
        reason: 'own_account',
        detail: 'own_username',
        mentionId: parsed.externalMentionId || parsed.externalCommentId || parsed.externalMediaId,
      });
      return;
    }
    if (textLooksLikeOwnReply(parsed.text)) {
      console.warn('[ig-mention] skipped', {
        reason: 'own_reply_text',
        mentionId: parsed.externalMentionId || parsed.externalCommentId || parsed.externalMediaId,
      });
      return;
    }

    // Must have at least SOME identifier so dedupe can work.
    if (
      !parsed.externalMentionId &&
      !parsed.externalMediaId &&
      !parsed.externalCommentId
    ) {
      console.warn('[ig-mention] skipped', {
        reason: 'no_identifiers',
        entryId: entryIdStr,
      });
      return;
    }

    const { doc, duplicate } = await upsertMentionRecord({ connection, parsed });
    if (!doc) {
      console.warn('[ig-mention] skipped', {
        reason: 'persist_failed',
        mentionId: parsed.externalMentionId || parsed.externalCommentId || parsed.externalMediaId,
      });
      return;
    }
    if (duplicate) {
      console.warn('[ig-mention] skipped', {
        reason: 'duplicate_mention',
        mentionId: doc.externalMentionId || doc.externalCommentId || doc.externalMediaId,
      });
      return;
    }

    console.log('[ig-mention] received', {
      connectionId: connection?._id,
      mediaId: doc.externalMediaId,
      mentionId: doc.externalMentionId || doc.externalCommentId || doc.externalMediaId,
      sourceType: doc.sourceType,
    });

    // Default strategy = lead_only. We persist and stop here. Automatic
    // replies are intentionally out of scope for this task; the data shape
    // is ready so a future UI / batch job can act on it.
    doc.status = 'processed';
    doc.replyStatus = 'not_attempted';
    doc.metadata = { ...(doc.metadata || {}), mode: 'lead_only' };
    await doc.save();

    console.log('[ig-mention] saved', {
      mentionId: doc.externalMentionId || doc.externalCommentId || doc.externalMediaId,
      sourceType: doc.sourceType,
    });
  } catch (err) {
    console.warn('[ig-mention] failed', {
      mentionId:
        parsed?.externalMentionId ||
        parsed?.externalCommentId ||
        parsed?.externalMediaId ||
        '',
      stage: 'unhandled',
      errorCode: 'unhandled',
      error: err?.message || 'unknown',
    });
  }
}

export const MENTION_FIELDS = SUPPORTED_FIELDS;
