import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const AiUsageLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    messageId: { type: String, default: () => uuidv4() },
    model: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    source: { type: String, default: 'test', enum: ['test', 'instagram', 'whatsapp', 'other'] },
    mock: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  { _id: false, versionKey: false }
);

export const AiUsageLog = mongoose.model('AiUsageLog', AiUsageLogSchema);
