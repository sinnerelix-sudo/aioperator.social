import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const PLANS = [
  { id: 'instagram', price: 29.9, botLimit: 1 },
  { id: 'whatsapp', price: 29.9, botLimit: 1 },
  { id: 'combo', price: 39.9, botLimit: 1, popular: true },
  { id: 'business', price: 99.9, botLimit: 5 },
];

export function formatPrice(amount, locale = 'az') {
  const symbol = locale === 'tr' ? '₺' : '₼';
  return `${amount.toFixed(2)} ${symbol}`;
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
