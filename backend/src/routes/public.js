import { Router } from 'express';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';

const router = Router();

// Reserved path fragments that must never be treated as a store slug, to avoid
// colliding with locale prefixes, auth/dashboard routes, and the admin URL.
const RESERVED_SLUGS = new Set([
  'az', 'tr', 'en',
  'login', 'register', 'dashboard', 'pricing',
  'control-center-aio-2026', 'api',
  'admin', 'assets', 'static', 'public',
]);

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(String(slug || '').toLowerCase());
}

router.get('/store/:slug', async (req, res) => {
  const slug = String(req.params.slug || '').toLowerCase();
  if (!slug || isReservedSlug(slug)) {
    return res.status(404).json({ error: 'not_found' });
  }
  const owner = await User.findOne({ storeSlug: slug });
  if (!owner) return res.status(404).json({ error: 'not_found' });

  const products = await Product.find({
    userId: owner._id,
    status: 'active',
  }).sort({ createdAt: -1 });

  return res.json({
    store: {
      slug: owner.storeSlug,
      name: owner.storeName || `${owner.firstName} ${owner.lastName}`,
      instagramHandle: owner.instagramHandle || '',
      whatsappNumber: owner.whatsappNumber || '',
    },
    products: products.map((p) => p.toPublic()),
  });
});

export default router;
