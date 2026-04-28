import { Subscription } from '../models/Subscription.js';
import { config, PLANS } from '../config.js';

/**
 * Returns existing active subscription, OR creates a trial one when TRIAL_MODE=true.
 * Never returns null when TRIAL_MODE is enabled.
 */
export async function ensureSubscription(userId, plan = 'instagram') {
  let sub = await Subscription.findOne({ userId, status: 'active' });
  if (sub) return sub;

  const planDef = PLANS[plan] || PLANS.instagram;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (config.trialMode ? config.trialDays : 30));

  sub = await Subscription.create({
    userId,
    plan: planDef.id,
    status: 'active',
    paymentStatus: config.trialMode ? 'trial' : 'paid',
    isTrial: config.trialMode,
    botLimit: planDef.botLimit,
    channels: planDef.channels,
    price: planDef.price,
    currency: planDef.currency,
    expiresAt,
  });
  return sub;
}

export async function getActiveSubscription(userId) {
  const sub = await Subscription.findOne({ userId, status: 'active' });
  if (sub) return sub;
  // Auto-heal: if trial mode is on, ensure a subscription exists
  if (config.trialMode) {
    return ensureSubscription(userId, 'instagram');
  }
  return null;
}
