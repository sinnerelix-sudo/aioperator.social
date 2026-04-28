import { Subscription } from '../models/Subscription.js';
import { config, PLANS } from '../config.js';

/**
 * Returns the active subscription, OR creates a trial one when TRIAL_MODE=true.
 * Default plan for first-time users is COMBO (per Faza 2A spec).
 * Initial usedMessages seeded to 129 so the usage UI is meaningful from day 1.
 */
export async function ensureSubscription(userId, plan = 'combo') {
  let sub = await Subscription.findOne({ userId, status: 'active' });
  if (sub) {
    // Backfill any new fields on legacy docs
    let dirty = false;
    if (sub.monthlyMessageLimit == null) {
      const p = PLANS[sub.plan] || PLANS.combo;
      sub.monthlyMessageLimit = p.messageLimit;
      dirty = true;
    }
    if (sub.usedMessages == null) {
      sub.usedMessages = 129;
      dirty = true;
    }
    if (sub.channelLimit == null) {
      const p = PLANS[sub.plan] || PLANS.combo;
      sub.channelLimit = p.channelLimit;
      dirty = true;
    }
    if (dirty) await sub.save();
    return sub;
  }

  const planDef = PLANS[plan] || PLANS.combo;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (config.trialMode ? config.trialDays : 30));

  sub = await Subscription.create({
    userId,
    plan: planDef.id,
    status: 'active',
    paymentStatus: config.trialMode ? 'trial' : 'paid',
    isTrial: config.trialMode,
    botLimit: planDef.botLimit,
    channelLimit: planDef.channelLimit,
    channels: planDef.channels,
    monthlyMessageLimit: planDef.messageLimit,
    usedMessages: 129,
    price: planDef.price,
    currency: planDef.currency,
    expiresAt,
  });
  return sub;
}

export async function getActiveSubscription(userId) {
  const sub = await Subscription.findOne({ userId, status: 'active' });
  if (sub) {
    // Backfill defensively
    let dirty = false;
    if (sub.monthlyMessageLimit == null) {
      const p = PLANS[sub.plan] || PLANS.combo;
      sub.monthlyMessageLimit = p.messageLimit;
      dirty = true;
    }
    if (sub.usedMessages == null) {
      sub.usedMessages = 129;
      dirty = true;
    }
    if (sub.channelLimit == null) {
      const p = PLANS[sub.plan] || PLANS.combo;
      sub.channelLimit = p.channelLimit;
      dirty = true;
    }
    if (dirty) await sub.save();
    return sub;
  }
  if (config.trialMode) {
    return ensureSubscription(userId, 'combo');
  }
  return null;
}

/**
 * Apply a plan change to an existing subscription, syncing all derived fields.
 */
export async function applyPlan(sub, planId) {
  const p = PLANS[planId];
  if (!p) throw new Error('invalid_plan');
  sub.plan = p.id;
  sub.botLimit = p.botLimit;
  sub.channelLimit = p.channelLimit;
  sub.channels = p.channels;
  sub.price = p.price;
  sub.currency = p.currency;
  sub.monthlyMessageLimit = p.messageLimit;
  await sub.save();
  return sub;
}
