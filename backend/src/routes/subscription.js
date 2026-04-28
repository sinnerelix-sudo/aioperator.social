import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getActiveSubscription, ensureSubscription, applyPlan } from '../services/subscription.js';
import { PLANS, config } from '../config.js';
import { logActivity } from '../services/activity.js';

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
  let sub = await getActiveSubscription(req.userId);
  if (!sub) sub = await ensureSubscription(req.userId, plan);
  sub = await applyPlan(sub, plan);
  await logActivity(req.userId, 'subscription.update', `Plan changed to ${plan}`, { plan });
  return res.json({ subscription: sub.toPublic() });
});

export default router;
