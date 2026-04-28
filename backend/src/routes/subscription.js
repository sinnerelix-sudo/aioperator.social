import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getActiveSubscription, ensureSubscription } from '../services/subscription.js';
import { PLANS, config } from '../config.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const sub = await getActiveSubscription(req.userId);
  return res.json({
    subscription: sub ? sub.toPublic() : null,
    trialMode: config.trialMode,
    paymentEnabled: config.paymentEnabled,
  });
});

router.post('/select-plan', async (req, res) => {
  const { plan } = req.body || {};
  if (!PLANS[plan]) return res.status(400).json({ error: 'invalid_plan' });
  // In trial mode, just upgrade subscription metadata without payment
  const planDef = PLANS[plan];
  const sub = await ensureSubscription(req.userId, plan);
  sub.plan = planDef.id;
  sub.botLimit = planDef.botLimit;
  sub.channels = planDef.channels;
  sub.price = planDef.price;
  sub.currency = planDef.currency;
  await sub.save();
  return res.json({ subscription: sub.toPublic() });
});

export default router;
