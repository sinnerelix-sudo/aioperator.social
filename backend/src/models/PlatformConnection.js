import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Stores platform-specific credentials and identifiers needed to
 * receive webhooks from / send messages to Meta / WhatsApp on behalf
 * of a seller's bot.
 *
 * SECURITY: `accessTokenEncrypted` is intended to hold a token encrypted
 * by `services/tokenCrypto.js` (AES-GCM with TOKEN_ENCRYPTION_SECRET).
 * The token is NEVER returned to the frontend — `toPublic()` strips it.
 * Webhook verify token is randomised per connection so each seller's
 * webhook URL is independently verifiable.
 */
const PlatformConnectionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    userId: { type: String, required: true, index: true },
    botId: { type: String, required: true, index: true },
    platform: { type: String, required: true, enum: ['instagram', 'whatsapp'] },

    displayName: { type: String, default: '' },

    // Instagram fields
    instagramUsername: { type: String, default: '' },
    instagramPageId: { type: String, default: '' },
    instagramBusinessAccountId: { type: String, default: '' },
    // `user_id` returned by Instagram Graph `/me?fields=user_id` — the
    // app-scoped / page-scoped ID that Instagram puts in webhook
    // `entry.id` and `messaging.recipient.id` for some account types.
    // We keep it separate from instagramBusinessAccountId because the
    // two can differ (Instagram-scoped vs Meta page-scoped).
    instagramUserId: { type: String, default: '' },

    // Generic cross-platform identifiers — populated in parallel with the
    // platform-specific fields above so webhook lookup can match on any
    // of them regardless of which ID Meta actually sends.
    externalAccountId: { type: String, default: '' },
    platformAccountId: { type: String, default: '' },
    accountId: { type: String, default: '' },

    // WhatsApp fields
    whatsappPhoneNumber: { type: String, default: '' },
    whatsappPhoneNumberId: { type: String, default: '' },
    whatsappBusinessAccountId: { type: String, default: '' },

    metaAppId: { type: String, default: '' },

    // Sensitive — encrypted at rest, never returned via toPublic()
    accessTokenEncrypted: { type: String, default: '' },
    accessTokenRef: { type: String, default: '' }, // alt: external secrets manager id
    tokenExpiresAt: { type: Date, default: null },

    webhookVerifyToken: { type: String, default: () => uuidv4() },

    status: {
      type: String,
      default: 'connected',
      enum: ['connected', 'needs_reconnect', 'disabled'],
    },
    permissions: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false }
);

PlatformConnectionSchema.index({ userId: 1, botId: 1, platform: 1 });
PlatformConnectionSchema.index({ platform: 1, whatsappPhoneNumberId: 1 });
PlatformConnectionSchema.index({ platform: 1, instagramBusinessAccountId: 1 });
PlatformConnectionSchema.index({ platform: 1, instagramPageId: 1 });
PlatformConnectionSchema.index({ platform: 1, instagramUserId: 1 });
PlatformConnectionSchema.index({ platform: 1, externalAccountId: 1 });
PlatformConnectionSchema.index({ platform: 1, platformAccountId: 1 });
PlatformConnectionSchema.index({ platform: 1, accountId: 1 });

PlatformConnectionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

PlatformConnectionSchema.methods.toPublic = function () {
  return {
    id: this._id,
    userId: this.userId,
    botId: this.botId,
    platform: this.platform,
    displayName: this.displayName,
    instagramUsername: this.instagramUsername,
    instagramPageId: this.instagramPageId,
    instagramBusinessAccountId: this.instagramBusinessAccountId,
    instagramUserId: this.instagramUserId,
    externalAccountId: this.externalAccountId,
    platformAccountId: this.platformAccountId,
    accountId: this.accountId,
    whatsappPhoneNumber: this.whatsappPhoneNumber,
    whatsappPhoneNumberId: this.whatsappPhoneNumberId,
    whatsappBusinessAccountId: this.whatsappBusinessAccountId,
    metaAppId: this.metaAppId,
    tokenExpiresAt: this.tokenExpiresAt,
    hasAccessToken: Boolean(this.accessTokenEncrypted || this.accessTokenRef),
    status: this.status,
    permissions: this.permissions || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    // NOTE: webhookVerifyToken intentionally omitted from default toPublic.
  };
};

/**
 * Variant of toPublic that also returns the per-connection webhook verify
 * token. Use this from the integrations route after connect, so the seller
 * can paste it into the Meta webhook config UI.
 */
PlatformConnectionSchema.methods.toPublicWithVerifyToken = function () {
  return {
    ...this.toPublic(),
    webhookVerifyToken: this.webhookVerifyToken,
  };
};

export const PlatformConnection = mongoose.model('PlatformConnection', PlatformConnectionSchema);
