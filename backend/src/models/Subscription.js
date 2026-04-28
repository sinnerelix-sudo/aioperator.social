import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const SubscriptionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    plan: { type: String, required: true, enum: ['instagram', 'whatsapp', 'combo', 'business'] },
    status: { type: String, default: 'active', enum: ['active', 'inactive', 'cancelled'] },
    paymentStatus: { type: String, default: 'paid', enum: ['paid', 'pending', 'failed', 'trial'] },
    isTrial: { type: Boolean, default: true },
    botLimit: { type: Number, required: true },
    channels: { type: [String], default: [] },
    price: { type: Number, required: true },
    currency: { type: String, default: 'AZN' },
    startedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

SubscriptionSchema.methods.toPublic = function () {
  return {
    id: this._id,
    userId: this.userId,
    plan: this.plan,
    status: this.status,
    paymentStatus: this.paymentStatus,
    isTrial: this.isTrial,
    botLimit: this.botLimit,
    channels: this.channels,
    price: this.price,
    currency: this.currency,
    startedAt: this.startedAt,
    expiresAt: this.expiresAt,
  };
};

export const Subscription = mongoose.model('Subscription', SubscriptionSchema);
