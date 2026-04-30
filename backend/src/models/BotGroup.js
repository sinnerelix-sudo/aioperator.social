import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const BotGroupSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    botIds: { type: [String], default: [] },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

BotGroupSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

BotGroupSchema.methods.toPublic = function () {
  return {
    id: this._id,
    userId: this.userId,
    name: this.name,
    botIds: this.botIds || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const BotGroup = mongoose.model('BotGroup', BotGroupSchema);
