import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken, authMiddleware } from '../middleware/auth.js';
import { ensureSubscription, getActiveSubscription } from '../services/subscription.js';
import { logActivity } from '../services/activity.js';
import { PLANS } from '../config.js';

const router = Router();

const registerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().min(4).max(40),
  password: z.string().min(6).max(200),
  plan: z.enum(['instagram', 'whatsapp', 'combo', 'business']).optional(),
  locale: z.enum(['az', 'tr']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const { firstName, lastName, email, phone, password, plan = 'instagram', locale = 'az' } = parsed.data;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'email_exists', message: 'Email already registered' });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone,
    password: hash,
    locale,
  });

  const subscription = await ensureSubscription(user._id, plan);
  const token = signToken(user._id);
  await logActivity(user._id, 'auth.register', `User registered with plan ${plan}`, { plan });

  return res.status(201).json({
    token,
    user: user.toPublic(),
    subscription: subscription.toPublic(),
  });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Email or password is incorrect' });
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Email or password is incorrect' });
  }
  const subscription = await getActiveSubscription(user._id);
  const token = signToken(user._id);
  await logActivity(user._id, 'auth.login', 'User logged in');

  return res.json({
    token,
    user: user.toPublic(),
    subscription: subscription ? subscription.toPublic() : null,
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  const subscription = await getActiveSubscription(req.userId);
  return res.json({
    user: req.user.toPublic(),
    subscription: subscription ? subscription.toPublic() : null,
  });
});

router.get('/plans', (_req, res) => {
  return res.json({ plans: Object.values(PLANS) });
});

export default router;
