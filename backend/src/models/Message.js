import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Single message inside a Conversation. Stores both inbound (customer)
 * and outbound (bot/operator) messages from any supported platform.
 */
const MessageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    conversationId: { type: String, required: true },
    platform: { type: String, required: true, enum: ['instagram', 'whatsapp'] },

    direction: { type: String, required: true, enum: ['inbound', 'outbound'] },
    senderType: { type: String, required: true, enum: ['customer', 'bot', 'operator'] },

    externalMessageId: { type: String, default: '' },

    text: { type: String, default: '' },
    messageType: {
      type: String,
      default: 'text',
      enum: ['text', 'image', 'audio', 'video', 'file', 'location', 'unknown'],
    },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      addressText: { type: String, default: '' },
    },

    status: {
      type: String,
      default: 'received',
      enum: ['received', 'sent', 'delivered', 'failed'],
    },
    aiGenerated: { type: Boolean, default: false },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ userId: 1, botId: 1, createdAt: -1 });
MessageSchema.index({ externalMessageId: 1 });

MessageSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

MessageSchema.methods.toPublic = function () {
  return {
    id: this._id,
    userId: this.userId,
    botId: this.botId,
    conversationId: this.conversationId,
    platform: this.platform,
    direction: this.direction,
    senderType: this.senderType,
    externalMessageId: this.externalMessageId,
    text: this.text,
    messageType: this.messageType,
    attachments: this.attachments || [],
    location: this.location || {},
    status: this.status,
    aiGenerated: this.aiGenerated,
    metadata: this.metadata || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Message = mongoose.model('Message', MessageSchema);
