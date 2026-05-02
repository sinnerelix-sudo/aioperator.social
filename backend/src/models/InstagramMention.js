import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Instagram mention / tag event.
 *
 * Kept as a separate collection so the DM (Conversation/Message) and the
 * comment auto-reply (InstagramComment) flows are not disturbed. Each
 * document represents one received mention/tag event plus — optionally —
 * the bot's reply attempt metadata.
 *
 * Mention events are much more schema-flexible than comment events:
 * Instagram delivers different payload shapes for caption mentions, comment
 * mentions, and media tags. We store the minimum we can safely extract and
 * keep the original identifiers for future enrichment.
 */
const SOURCE_TYPES = [
  'caption_mention',
  'comment_mention',
  'tag',
  'media_tag',
  'unknown_mention',
];

const InstagramMentionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    botId: { type: String, default: '', index: true },
    connectionId: { type: String, default: '' },
    platform: { type: String, default: 'instagram', enum: ['instagram'] },

    // Primary external key — idempotency is keyed on this when present.
    externalMentionId: { type: String, default: '' },

    // Related IG identifiers. One or more of these will be present depending
    // on whether the mention was on a post caption, a comment, or a media tag.
    externalMediaId: { type: String, default: '' },
    externalCommentId: { type: String, default: '' },
    customerExternalId: { type: String, default: '' },
    customerUsername: { type: String, default: '' },

    sourceType: { type: String, default: 'unknown_mention', enum: SOURCE_TYPES },
    text: { type: String, default: '' },
    permalink: { type: String, default: '' },
    timestamp: { type: Date, default: null },

    status: {
      type: String,
      default: 'received',
      enum: ['received', 'processed', 'skipped', 'failed'],
    },

    replyStatus: {
      type: String,
      default: 'not_attempted',
      enum: ['not_attempted', 'sent', 'failed', 'skipped'],
    },
    replyText: { type: String, default: '' },
    replyExternalId: { type: String, default: '' },
    replyError: { type: String, default: '' },
    replyAt: { type: Date, default: null },

    replyMode: {
      type: String,
      default: 'lead_only',
      enum: ['lead_only', 'public_reply', 'private_reply_if_possible'],
    },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

InstagramMentionSchema.index({ userId: 1, createdAt: -1 });
InstagramMentionSchema.index({ botId: 1, createdAt: -1 });
// Partial unique on externalMentionId (only when it's a non-empty string).
InstagramMentionSchema.index(
  { externalMentionId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalMentionId: { $exists: true, $gt: '' } },
  }
);
// Composite fallback uniqueness when externalMentionId is missing.
InstagramMentionSchema.index(
  { externalMediaId: 1, externalCommentId: 1, sourceType: 1, customerExternalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      externalMentionId: '',
      externalMediaId: { $gt: '' },
    },
  }
);

InstagramMentionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const InstagramMention = mongoose.model('InstagramMention', InstagramMentionSchema);
