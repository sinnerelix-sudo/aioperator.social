import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const BotSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    niche: { type: String, default: '', trim: true },
    salesStyle: { type: String, default: 'friendly' },
    instructions: { type: String, default: '' },
    discountRule: { type: String, default: '' },
    handoffRule: { type: String, default: '' },
    instagramConnected: { type: Boolean, default: false },
    whatsappConnected: { type: Boolean, default: false },
    instagramHandle: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    status: { type: String, default: 'idle', enum: ['idle', 'active', 'paused'] },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

BotSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

BotSchema.methods.toPublic = function () {
  return {
    id: this._id,
    userId: this.userId,
    name: this.name,
    niche: this.niche,
    salesStyle: this.salesStyle,
    instructions: this.instructions,
    discountRule: this.discountRule,
    handoffRule: this.handoffRule,
    instagramConnected: this.instagramConnected,
    whatsappConnected: this.whatsappConnected,
    instagramHandle: this.instagramHandle || '',
    whatsappNumber: this.whatsappNumber || '',
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Bot = mongoose.model('Bot', BotSchema);
