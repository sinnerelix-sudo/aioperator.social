import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const ActivitySchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    botId: { type: String, default: null },
    platform: { type: String, default: '' },
    type: { type: String, required: true },
    text: { type: String, default: '' },
    message: { type: String, required: true },
    status: { type: String, default: 'logged' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

ActivitySchema.methods.toPublic = function () {
  return {
    id: this._id,
    userId: this.userId,
    botId: this.botId,
    platform: this.platform,
    type: this.type,
    text: this.text || this.message,
    message: this.message,
    status: this.status,
    meta: this.meta,
    createdAt: this.createdAt,
  };
};

export const Activity = mongoose.model('Activity', ActivitySchema);
