import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const ActivitySchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

ActivitySchema.methods.toPublic = function () {
  return {
    id: this._id,
    userId: this.userId,
    type: this.type,
    message: this.message,
    meta: this.meta,
    createdAt: this.createdAt,
  };
};

export const Activity = mongoose.model('Activity', ActivitySchema);
