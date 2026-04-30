import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const BotTrainingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    botId: { type: String, required: true, unique: true, index: true },
    businessName: { type: String, default: '' },
    businessCategory: { type: String, default: '' },
    toneOfVoice: { type: String, default: 'friendly' },
    greetingMessage: { type: String, default: '' },
    salesInstructions: { type: String, default: '' },
    deliveryInfo: { type: String, default: '' },
    paymentInfo: { type: String, default: '' },
    returnPolicy: { type: String, default: '' },
    discountRules: { type: String, default: '' },
    maxDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
    forbiddenTopics: { type: String, default: '' },
    handoffRules: { type: String, default: '' },
    fallbackMessage: {
      type: String,
      default: 'Bu məhsulla bağlı dəqiq məlumat tapmadım. İstəsəniz operator sizi yönləndirə bilər.',
    },
    languageMode: { type: String, default: 'auto', enum: ['az', 'tr', 'auto'] },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

BotTrainingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

BotTrainingSchema.methods.toPublic = function () {
  return {
    id: this._id,
    botId: this.botId,
    businessName: this.businessName,
    businessCategory: this.businessCategory,
    toneOfVoice: this.toneOfVoice,
    greetingMessage: this.greetingMessage,
    salesInstructions: this.salesInstructions,
    deliveryInfo: this.deliveryInfo,
    paymentInfo: this.paymentInfo,
    returnPolicy: this.returnPolicy,
    discountRules: this.discountRules,
    maxDiscountPercent: this.maxDiscountPercent,
    forbiddenTopics: this.forbiddenTopics,
    handoffRules: this.handoffRules,
    fallbackMessage: this.fallbackMessage,
    languageMode: this.languageMode,
    updatedAt: this.updatedAt,
  };
};

export function emptyTraining(botId) {
  return {
    id: null,
    botId,
    businessName: '',
    businessCategory: '',
    toneOfVoice: 'friendly',
    greetingMessage: '',
    salesInstructions: '',
    deliveryInfo: '',
    paymentInfo: '',
    returnPolicy: '',
    discountRules: '',
    maxDiscountPercent: 10,
    forbiddenTopics: '',
    handoffRules: '',
    fallbackMessage: 'Bu məhsulla bağlı dəqiq məlumat tapmadım. İstəsəniz operator sizi yönləndirə bilər.',
    languageMode: 'auto',
    updatedAt: null,
  };
}

export const BotTraining = mongoose.model('BotTraining', BotTrainingSchema);
