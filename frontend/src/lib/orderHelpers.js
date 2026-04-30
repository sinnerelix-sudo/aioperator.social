// Helpers specific to the Orders page.
// Keep them pure (no React) so they can be tested easily.

export const STATUS_ORDER = ['new', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'];

export const STATUS_TONES = {
  new: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  confirmed: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  preparing: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  shipped: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

/**
 * Extract a full customer display name with a prioritised fallback chain.
 * Never returns undefined/null/[object Object].
 */
export function getCustomerFullName(order, fallback = 'Adsız müştəri') {
  if (!order) return fallback;
  if (typeof order.fullName === 'string' && order.fullName.trim()) return order.fullName.trim();
  if (typeof order.customerFullName === 'string' && order.customerFullName.trim()) return order.customerFullName.trim();
  const c = order.customer;
  if (c && typeof c === 'object') {
    if (typeof c.name === 'string' && c.name.trim()) return c.name.trim();
    const joined = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
    if (joined) return joined;
  }
  const joined = [order.firstName, order.lastName].filter(Boolean).join(' ').trim();
  if (joined) return joined;
  if (typeof order.customerName === 'string' && order.customerName.trim()) return order.customerName.trim();
  if (typeof order.customer === 'string' && order.customer.trim()) return order.customer.trim();
  return fallback;
}

/**
 * Keep only digits. Used to build wa.me and tel: links.
 * Caps at 15 digits (E.164 max).
 */
export function onlyDigits(raw, maxLen = 15) {
  if (raw == null) return '';
  const digits = String(raw).replace(/\D+/g, '');
  return digits.slice(0, maxLen);
}

/**
 * Pretty phone for display. Keeps leading `+` but also caps digit length at 15.
 * Example: "+994 50 309 22 14"
 */
export function formatPhoneDisplay(raw) {
  if (!raw) return '';
  const digits = onlyDigits(raw, 15);
  if (!digits) return '';
  // AZ pattern: +994 50 309 22 14
  if (digits.startsWith('994') && digits.length >= 12) {
    const rest = digits.slice(3, 12); // 9 digits after country
    const a = rest.slice(0, 2);
    const b = rest.slice(2, 5);
    const c = rest.slice(5, 7);
    const d = rest.slice(7, 9);
    return `+994 ${a} ${b} ${c} ${d}`.trim();
  }
  // Generic: group in 3s after country code (first 1-3 digits)
  return `+${digits}`;
}

/** wa.me expects only digits, no `+`, no spaces. */
export function buildWhatsAppLink(raw) {
  const digits = onlyDigits(raw, 15);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

/** tel: uses `+` + digits. */
export function buildTelLink(raw) {
  const digits = onlyDigits(raw, 15);
  if (!digits) return null;
  return `tel:+${digits}`;
}

/** Strip @, spaces, slashes from a handle. */
export function normaliseInstagramHandle(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/^@+/, '').replace(/\s+/g, '').replace(/\/+$/, '');
}

export function buildInstagramLink(raw) {
  const h = normaliseInstagramHandle(raw);
  if (!h) return null;
  return `https://instagram.com/${h}`;
}

/** Compact index for sort (smaller = earlier in table) */
export function statusSortIndex(status) {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? STATUS_ORDER.length : idx;
}

/**
 * Sort orders by STATUS_ORDER then date desc (newest first within same status).
 * Returns a NEW array.
 */
export function sortOrders(orders) {
  return [...orders].sort((a, b) => {
    const sa = statusSortIndex(a.status);
    const sb = statusSortIndex(b.status);
    if (sa !== sb) return sa - sb;
    const da = new Date(a.date || 0).getTime();
    const db = new Date(b.date || 0).getTime();
    return db - da;
  });
}

/**
 * Apply filters. `statusFilters` is a Set of status strings ('new', 'confirmed', ...).
 * `dateFilter` is null | 'today' | 'week'.
 * An empty status filter set means "all statuses".
 */
export function applyFilters(orders, statusFilters, dateFilter) {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const weekMs = now - 7 * 24 * 60 * 60 * 1000;
  return orders.filter((o) => {
    if (statusFilters && statusFilters.size > 0 && !statusFilters.has(o.status)) return false;
    if (dateFilter) {
      const t = new Date(o.date || 0).getTime();
      if (dateFilter === 'today' && t < todayMs) return false;
      if (dateFilter === 'week' && t < weekMs) return false;
    }
    return true;
  });
}

/**
 * Resolve display + link for the "platform" column.
 * Returns { kind: 'instagram' | 'whatsapp' | 'other', label, href }.
 */
export function resolvePlatformContact(order) {
  const platform = order.platform;
  if (platform === 'instagram') {
    const h = normaliseInstagramHandle(order.instagramHandle || order.instagram || '');
    if (h) return { kind: 'instagram', label: `@${h}`, href: `https://instagram.com/${h}` };
    return { kind: 'instagram', label: '—', href: null };
  }
  if (platform === 'whatsapp') {
    const raw = order.whatsappNumber || order.phone || '';
    const label = formatPhoneDisplay(raw);
    const href = buildWhatsAppLink(raw);
    return { kind: 'whatsapp', label: label || '—', href };
  }
  return { kind: 'other', label: '—', href: null };
}
