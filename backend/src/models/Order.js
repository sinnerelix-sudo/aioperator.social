import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const ORDER_STATUSES = ['new', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'];

const StatusHistoryEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true, enum: ORDER_STATUSES },
    changedAt: { type: Date, default: () => new Date() },
    changedBy: { type: String, default: '' }, // userId, 'bot', 'system'
  },
  { _id: false }
);

/**
 * A real order created from a conversation (or manually by the seller).
 * Tracks the customer, product, delivery, status timeline and AI-extracted
 * structured data so the seller can ship quickly.
 */
const OrderSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    botId: { type: String, default: null, index: true },
    conversationId: { type: String, default: null, index: true },
    platform: { type: String, default: null, enum: [null, 'instagram', 'whatsapp'] },

    orderCode: { type: String, default: '' }, // human-friendly, e.g. AIO-1042

    customerFullName: { type: String, default: '' },
    customerName: { type: String, default: '' },
    instagramHandle: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    phone: { type: String, default: '' },

    productId: { type: String, default: null },
    productName: { type: String, default: '' },
    productSlug: { type: String, default: '' },
    productUrl: { type: String, default: '' },

    quantity: { type: Number, default: 1, min: 1 },
    price: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'AZN' },

    size: { type: String, default: '' },
    color: { type: String, default: '' },
    variant: { type: String, default: '' },
    note: { type: String, default: '' },

    deliveryAddress: {
      fullAddress: { type: String, default: '' },
      city: { type: String, default: '' },
      district: { type: String, default: '' },
      street: { type: String, default: '' },
      apartment: { type: String, default: '' },
      note: { type: String, default: '' },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },

    status: { type: String, default: 'new', enum: ORDER_STATUSES },
    statusHistory: { type: [StatusHistoryEntrySchema], default: [] },

    extractedData: { type: mongoose.Schema.Types.Mixed, default: {} },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ conversationId: 1 });

OrderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [{ status: this.status, changedAt: new Date(), changedBy: this.userId || 'system' }];
  }
  next();
});

OrderSchema.methods.toPublic = function () {
  return {
    id: this._id,
    userId: this.userId,
    botId: this.botId,
    conversationId: this.conversationId,
    platform: this.platform,
    orderCode: this.orderCode || `AIO-${String(this._id).slice(0, 6).toUpperCase()}`,
    customerFullName: this.customerFullName,
    customerName: this.customerName,
    instagramHandle: this.instagramHandle,
    whatsappNumber: this.whatsappNumber,
    phone: this.phone,
    productId: this.productId,
    productName: this.productName,
    productSlug: this.productSlug,
    productUrl: this.productUrl,
    quantity: this.quantity,
    price: this.price,
    discount: this.discount,
    total: this.total,
    currency: this.currency,
    size: this.size,
    color: this.color,
    variant: this.variant,
    note: this.note,
    deliveryAddress: this.deliveryAddress || {},
    status: this.status,
    statusHistory: (this.statusHistory || []).map((h) => ({
      status: h.status,
      changedAt: h.changedAt,
      changedBy: h.changedBy,
    })),
    extractedData: this.extractedData || {},
    metadata: this.metadata || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Order = mongoose.model('Order', OrderSchema);
