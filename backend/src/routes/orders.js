import { Router } from 'express';
import { z } from 'zod';
import { Order, ORDER_STATUSES } from '../models/Order.js';
import { Message } from '../models/Message.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { status, botId, conversationId } = req.query;
  const filter = { userId: req.userId };
  if (status && ORDER_STATUSES.includes(String(status))) filter.status = status;
  if (botId) filter.botId = String(botId);
  if (conversationId) filter.conversationId = String(conversationId);
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(500);
  return res.json({ orders: orders.map((o) => o.toPublic()) });
});

router.get('/:id', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.userId });
  if (!order) return res.status(404).json({ error: 'not_found' });
  return res.json({ order: order.toPublic() });
});

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
router.patch('/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const order = await Order.findOne({ _id: req.params.id, userId: req.userId });
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (order.status !== parsed.data.status) {
    order.statusHistory.push({
      status: parsed.data.status,
      changedAt: new Date(),
      changedBy: req.userId,
    });
    order.status = parsed.data.status;
    await order.save();
  }
  return res.json({ order: order.toPublic() });
});

/**
 * Pull all messages from the conversation that produced this order.
 * Useful so the seller can review the chat that led to the sale.
 */
router.get('/:id/messages', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.userId });
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (!order.conversationId) return res.json({ messages: [] });
  const messages = await Message.find({ conversationId: order.conversationId, userId: req.userId })
    .sort({ createdAt: 1 })
    .limit(500);
  return res.json({ messages: messages.map((m) => m.toPublic()) });
});

export default router;
