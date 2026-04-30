import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const CoachMessageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ['seller', 'bot'] },
    message: { type: String, required: true },
    // Structured partial training update the bot suggested. Empty when role=seller.
    suggestedTrainingUpdate: { type: mongoose.Schema.Types.Mixed, default: null },
    applied: { type: Boolean, default: false },
    mock: { type: Boolean, default: false },
    model: { type: String, default: '' },
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  { _id: false, versionKey: false }
);

CoachMessageSchema.methods.toPublic = function () {
  return {
    id: this._id,
    botId: this.botId,
    role: this.role,
    message: this.message,
    suggestedTrainingUpdate: this.suggestedTrainingUpdate || null,
    applied: !!this.applied,
    mock: !!this.mock,
    createdAt: this.createdAt,
  };
};

export const CoachMessage = mongoose.model('CoachMessage', CoachMessageSchema);
