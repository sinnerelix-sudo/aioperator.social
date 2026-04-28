import { Activity } from '../models/Activity.js';

export async function logActivity(userId, type, message, meta = {}) {
  try {
    await Activity.create({ userId, type, message, meta });
  } catch (err) {
    console.error('[activity] log error', err.message);
  }
}
