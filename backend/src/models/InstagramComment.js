import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Instagram post/reel comment event.
 *
 * Kept as a separate collection (not mixed into Conversation/Message) so the
 * DM auto-reply flow and the manual operator send logic stay completely
 * untouched. Each document represents one inbound Instagram comment plus the
 * bot's public + private reply attempts.
 */
const InstagramCommentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    platform: { type: String, default: 'instagram', enum: ['instagram'] },

    // Instagram identifiers (idempotency is keyed on externalCommentId).
    externalCommentId: { type: String, required: true, unique: true, index: true },
    externalMediaId: { type: String, default: '' },
    parentCommentId: { type: String, default: '' },
    customerExternalId: { type: String, default: '' },
    customerUsername: { type: String, default: '' },

    text: { type: String, default: '' },
    timestamp: { type: Date, default: null },

    // Bot public reply (visible under the comment).
    publicReplyStatus: {
      type: String,
      default: 'pending',
      enum: ['pending', 'skipped', 'sent', 'failed'],
    },
    publicReplyText: { type: String, default: '' },
    publicReplyExternalId: { type: String, default: '' },
    publicReplyError: { type: String, default: '' },
    publicReplyAt: { type: Date, default: null },

    // Bot private reply (DM to the commenter).
    privateReplyStatus: {
      type: String,
      default: 'pending',
      enum: ['pending', 'skipped', 'sent', 'failed'],
    },
    privateReplyText: { type: String, default: '' },
    privateReplyExternalMessageId: { type: String, default: '' },
    privateReplyError: { type: String, default: '' },
    privateReplyAt: { type: Date, default: null },

    replyMode: {
      type: String,
      default: 'public_then_private',
      enum: ['public_only', 'private_only', 'public_then_private'],
    },

    // Seller-managed lead workflow fields.
    leadStatus: {
      type: String,
      default: 'new',
      enum: ['new', 'viewed', 'contacted', 'converted', 'dismissed'],
      index: true,
    },
    note: { type: String, default: '', maxlength: 2000 },
    permalink: { type: String, default: '' },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

InstagramCommentSchema.index({ userId: 1, createdAt: -1 });
InstagramCommentSchema.index({ botId: 1, createdAt: -1 });

InstagramCommentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const InstagramComment = mongoose.model('InstagramComment', InstagramCommentSchema);
