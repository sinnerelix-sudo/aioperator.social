import { Router } from 'express';
import { Activity } from '../models/Activity.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const items = await Activity.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(limit);
  return res.json({ activities: items.map((a) => a.toPublic()) });
});

export default router;
