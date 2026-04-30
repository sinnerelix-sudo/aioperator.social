import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { isReservedSlug } from './public.js';
import { logActivity } from '../services/activity.js';

const router = Router();
router.use(authMiddleware);

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{2,31}$/;

const storeSchema = z.object({
  storeSlug: z.string().min(3).max(32),
  storeName: z.string().max(120).optional(),
  instagramHandle: z.string().max(80).optional(),
  whatsappNumber: z.string().max(40).optional(),
});

router.put('/store', async (req, res) => {
  const parsed = storeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const slug = parsed.data.storeSlug.toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({
      error: 'invalid_slug',
      message: 'Slug yalnız kiçik hərf, rəqəm, "_" və "-" ehtiva edə bilər (3-32).',
    });
  }
  if (isReservedSlug(slug)) {
    return res.status(400).json({ error: 'reserved_slug', message: 'Bu slug istifadə olunmur.' });
  }

  const clash = await User.findOne({ storeSlug: slug, _id: { $ne: req.userId } });
  if (clash) {
    return res.status(409).json({ error: 'slug_taken', message: 'Bu mağaza linki artıq istifadə olunur.' });
  }

  const user = req.user;
  user.storeSlug = slug;
  if (parsed.data.storeName !== undefined) user.storeName = parsed.data.storeName;
  if (parsed.data.instagramHandle !== undefined) user.instagramHandle = parsed.data.instagramHandle;
  if (parsed.data.whatsappNumber !== undefined) user.whatsappNumber = parsed.data.whatsappNumber;
  await user.save();

  await logActivity(req.userId, 'store.update', `Store slug set to ${slug}`, { slug });
  return res.json({ user: user.toPublic() });
});

export default router;
