import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const PLANS = [
  { id: 'instagram', price: 29.9, botLimit: 1, channelLimit: 1, messageLimit: 10000 },
  { id: 'whatsapp', price: 29.9, botLimit: 1, channelLimit: 1, messageLimit: 10000 },
  { id: 'combo', price: 49.9, botLimit: 1, channelLimit: 2, messageLimit: 50000, popular: true },
  { id: 'business', price: 99.9, botLimit: 5, channelLimit: 5, messageLimit: 150000 },
];

export function getPlan(id) {
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

export function formatPrice(amount, locale = 'az') {
  const symbol = locale === 'tr' ? '₺' : '₼';
  return `${amount.toFixed(2)} ${symbol}`;
}

export function formatNumber(value, locale = 'az') {
  if (value == null) return '0';
  // AZ uses dot thousands separator (50.000), TR also uses dot (50.000).
  // de-DE locale produces dot-as-thousands which matches both AZ + TR conventions.
  const tag = locale === 'tr' ? 'tr-TR' : 'de-DE';
  return new Intl.NumberFormat(tag).format(value);
}

export function formatDate(value, locale = 'az') {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(value, locale = 'az') {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString(locale === 'tr' ? 'tr-TR' : 'az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Deterministic per-user mock usage so the bar is stable across reloads
export function mockUsageForUser(userId, plan) {
  const planObj = getPlan(plan);
  const limit = planObj.messageLimit;
  const seed = (userId || 'guest').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  // 5–60% used by default
  const ratio = (seed % 56) / 100 + 0.05;
  const used = Math.floor(limit * ratio);
  return { used, limit, remaining: limit - used, percent: (used / limit) * 100 };
}
