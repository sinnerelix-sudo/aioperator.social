import { Router } from 'express';
import { z } from 'zod';
import { Product } from '../models/Product.js';
import { authMiddleware } from '../middleware/auth.js';
import { logActivity } from '../services/activity.js';

const router = Router();

const productSchema = z.object({
  name: z.string().min(1).max(200),
  image: z.string().max(2000).optional().default(''),
  price: z.number().nonnegative(),
  discountPrice: z.number().nonnegative().nullable().optional(),
  maxDiscount: z.number().nonnegative().optional().default(0),
  stock: z.number().int().nonnegative().optional().default(0),
  category: z.string().max(120).optional().default(''),
  description: z.string().max(4000).optional().default(''),
});

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const products = await Product.find({ userId: req.userId }).sort({ createdAt: -1 });
  return res.json({ products: products.map((p) => p.toPublic()) });
});

router.post('/', async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const product = await Product.create({ userId: req.userId, ...parsed.data });
  await logActivity(req.userId, 'product.create', `Product created: ${product.name}`, { productId: product._id });
  return res.status(201).json({ product: product.toPublic() });
});

router.put('/:id', async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const product = await Product.findOne({ _id: req.params.id, userId: req.userId });
  if (!product) return res.status(404).json({ error: 'not_found' });
  Object.assign(product, parsed.data);
  await product.save();
  return res.json({ product: product.toPublic() });
});

router.delete('/:id', async (req, res) => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!product) return res.status(404).json({ error: 'not_found' });
  return res.json({ ok: true });
});

export default router;
