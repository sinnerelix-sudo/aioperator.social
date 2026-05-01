import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * A live conversation between a customer and one of the seller's bots,
 * scoped per platform. Mirrors the shape used by the frontend mock so
 * the UI can switch over to real data without UI rewrites.
 */
const ConversationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    platform: { type: String, required: true, enum: ['instagram', 'whatsapp'] },

    // External identifiers — used to deduplicate webhook payloads.
    platformConversationId: { type: String, default: '' },
    customerExternalId: { type: String, default: '' },

    customerName: { type: String, default: '' },
    customerFullName: { type: String, default: '' },
    instagramHandle: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    phone: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },

    lastMessageText: { type: String, default: '' },
    lastMessageAt: { type: Date, default: null },
    unreadCount: { type: Number, default: 0, min: 0 },

    aiStatus: {
      type: String,
      default: null,
      enum: [null, 'price_question', 'complaint', 'delaying', 'unresponsive', 'confirmed', 'off_topic'],
    },

    handoffMode: {
      type: String,
      default: 'bot_only',
      enum: ['bot_only', 'human_only', 'human_only_until', 'human_and_bot', 'bot_only_until'],
    },
    handoffUntil: { type: Date, default: null },
    assignedToHuman: { type: Boolean, default: false },
    botPaused: { type: Boolean, default: false },
    convertedToOrder: { type: Boolean, default: false },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

ConversationSchema.index({ userId: 1, botId: 1, lastMessageAt: -1 });
ConversationSchema.index({ platform: 1, customerExternalId: 1 });
ConversationSchema.index({ userId: 1, lastMessageAt: -1 });

ConversationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

ConversationSchema.methods.toPublic = function () {
  return {
    id: this._id,
    userId: this.userId,
    botId: this.botId,
    platform: this.platform,
    platformConversationId: this.platformConversationId,
    customerExternalId: this.customerExternalId,
    customerName: this.customerName,
    customerFullName: this.customerFullName,
    instagramHandle: this.instagramHandle,
    whatsappNumber: this.whatsappNumber,
    phone: this.phone,
    avatarUrl: this.avatarUrl,
    lastMessageText: this.lastMessageText,
    lastMessageAt: this.lastMessageAt,
    unreadCount: this.unreadCount,
    aiStatus: this.aiStatus,
    handoffMode: this.handoffMode,
    handoffUntil: this.handoffUntil,
    assignedToHuman: this.assignedToHuman,
    botPaused: this.botPaused,
    convertedToOrder: this.convertedToOrder,
    metadata: this.metadata || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Conversation = mongoose.model('Conversation', ConversationSchema);
