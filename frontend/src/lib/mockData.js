// Mock data for the AI Operator front-end. No backend required.
// Numbers are illustrative — they represent monthly message usage and
// estimated AI token cost (admin-only metric).

export const ADMIN_CREDENTIALS = {
  email: 'admin@aioperator.social',
  password: 'AdminAIO2026!',
  twoFactor: '482910',
};

export const MOCK_CUSTOMERS = [
  {
    id: 'cust_01',
    firstName: 'Rəşad',
    lastName: 'Əliyev',
    company: 'RA Boutique',
    email: 'rashad@raboutique.az',
    phone: '+994 50 555 11 22',
    plan: 'instagram',
    bots: 1,
    channels: 1,
    messageLimit: 10000,
    messagesUsed: 8920,
    estimatedTokens: 382847,
    estimatedCost: 4.21,
    status: 'active',
    risk: 'high',
    lastActiveAt: '2026-04-26T15:32:00Z',
    createdAt: '2026-01-12T09:10:00Z',
    note: '',
  },
  {
    id: 'cust_02',
    firstName: 'Ruslan',
    lastName: 'Quliyev',
    company: 'Ruslan Style',
    email: 'ruslan@rstyle.az',
    phone: '+994 55 222 33 44',
    plan: 'instagram',
    bots: 1,
    channels: 1,
    messageLimit: 10000,
    messagesUsed: 1240,
    estimatedTokens: 38482,
    estimatedCost: 0.42,
    status: 'active',
    risk: 'normal',
    lastActiveAt: '2026-04-27T20:11:00Z',
    createdAt: '2026-02-04T14:00:00Z',
    note: '',
  },
  {
    id: 'cust_03',
    firstName: 'Aysel',
    lastName: 'Məmmədova',
    company: 'Aysel Atelier',
    email: 'aysel@atelier.az',
    phone: '+994 70 888 22 11',
    plan: 'combo',
    bots: 1,
    channels: 2,
    messageLimit: 50000,
    messagesUsed: 21800,
    estimatedTokens: 938521,
    estimatedCost: 10.32,
    status: 'active',
    risk: 'normal',
    lastActiveAt: '2026-04-28T11:00:00Z',
    createdAt: '2025-12-22T08:00:00Z',
    note: '',
  },
  {
    id: 'cust_04',
    firstName: 'Murad',
    lastName: 'Həsənov',
    company: 'Murad Group',
    email: 'murad@muradgroup.az',
    phone: '+994 51 100 55 77',
    plan: 'business',
    bots: 5,
    channels: 5,
    messageLimit: 150000,
    messagesUsed: 142000,
    estimatedTokens: 6205000,
    estimatedCost: 68.30,
    status: 'active',
    risk: 'critical',
    lastActiveAt: '2026-04-28T17:45:00Z',
    createdAt: '2025-11-08T10:00:00Z',
    note: 'Çox aktiv müştəri, custom pricing tövsiyə edilir.',
  },
  {
    id: 'cust_05',
    firstName: 'Leyla',
    lastName: 'Əhmədli',
    company: 'Leyla Cosmetics',
    email: 'leyla@cosmetics.az',
    phone: '+994 77 444 88 99',
    plan: 'whatsapp',
    bots: 1,
    channels: 1,
    messageLimit: 10000,
    messagesUsed: 320,
    estimatedTokens: 9120,
    estimatedCost: 0.10,
    status: 'trial',
    risk: 'normal',
    lastActiveAt: '2026-04-25T09:32:00Z',
    createdAt: '2026-04-22T13:00:00Z',
    note: '',
  },
  {
    id: 'cust_06',
    firstName: 'Tural',
    lastName: 'Babayev',
    company: 'Tural Sport',
    email: 'tural@sport.az',
    phone: '+994 50 333 22 11',
    plan: 'combo',
    bots: 1,
    channels: 2,
    messageLimit: 50000,
    messagesUsed: 9100,
    estimatedTokens: 287400,
    estimatedCost: 3.16,
    status: 'active',
    risk: 'normal',
    lastActiveAt: '2026-04-28T16:01:00Z',
    createdAt: '2026-02-19T11:00:00Z',
    note: '',
  },
  {
    id: 'cust_07',
    firstName: 'Nigar',
    lastName: 'Hüseynli',
    company: 'Nigar Décor',
    email: 'nigar@decor.az',
    phone: '+994 55 100 22 33',
    plan: 'business',
    bots: 4,
    channels: 4,
    messageLimit: 150000,
    messagesUsed: 78900,
    estimatedTokens: 3105000,
    estimatedCost: 34.18,
    status: 'active',
    risk: 'normal',
    lastActiveAt: '2026-04-28T14:22:00Z',
    createdAt: '2025-10-18T08:00:00Z',
    note: '',
  },
  {
    id: 'cust_08',
    firstName: 'Vüsal',
    lastName: 'Cəfərov',
    company: 'Vusal Tech',
    email: 'vusal@vutech.az',
    phone: '+994 50 999 00 11',
    plan: 'instagram',
    bots: 1,
    channels: 1,
    messageLimit: 10000,
    messagesUsed: 6420,
    estimatedTokens: 245100,
    estimatedCost: 2.71,
    status: 'active',
    risk: 'medium',
    lastActiveAt: '2026-04-27T22:40:00Z',
    createdAt: '2026-03-11T10:30:00Z',
    note: '',
  },
];

export const MOCK_LEADS = [
  { id: 'lead_01', name: 'Səbinə Rzayeva', platform: 'instagram', product: 'Qara koktey paltarı', score: 92, value: 89.9, lastActiveAt: '2026-04-28T17:00:00Z', stage: 'closeToOrder' },
  { id: 'lead_02', name: 'Kamran A.', platform: 'whatsapp', product: 'Idman ayaqqabı 42', score: 78, value: 119.0, lastActiveAt: '2026-04-28T15:42:00Z', stage: 'priceAsked' },
  { id: 'lead_03', name: 'Lalə M.', platform: 'instagram', product: 'Çiçəkli paltar', score: 64, value: 65.5, lastActiveAt: '2026-04-28T14:08:00Z', stage: 'interested' },
  { id: 'lead_04', name: 'Anar Q.', platform: 'whatsapp', product: 'Dəri çanta', score: 58, value: 145.0, lastActiveAt: '2026-04-28T11:50:00Z', stage: 'new' },
  { id: 'lead_05', name: 'Cavid Ə.', platform: 'instagram', product: 'Trikotaj sviter', score: 88, value: 79.0, lastActiveAt: '2026-04-28T10:30:00Z', stage: 'confirmed' },
  { id: 'lead_06', name: 'Pərvinə H.', platform: 'whatsapp', product: 'Ofis pencəyi', score: 41, value: 110.0, lastActiveAt: '2026-04-27T19:14:00Z', stage: 'lost' },
  { id: 'lead_07', name: 'Elgün B.', platform: 'instagram', product: 'Hijab paltar', score: 71, value: 95.0, lastActiveAt: '2026-04-28T13:00:00Z', stage: 'priceAsked' },
  { id: 'lead_08', name: 'Sevinc R.', platform: 'whatsapp', product: 'Yay paltarı', score: 55, value: 49.9, lastActiveAt: '2026-04-28T09:12:00Z', stage: 'interested' },
];

export const LEAD_STAGES = ['new', 'interested', 'priceAsked', 'closeToOrder', 'confirmed', 'lost'];

export const MOCK_ORDERS = [
  { id: 'AIO-1042', customer: 'Cavid Ə.', product: 'Trikotaj sviter', price: 79.0, status: 'shipped', platform: 'instagram', date: '2026-04-28T10:30:00Z' },
  { id: 'AIO-1041', customer: 'Səbinə Rzayeva', product: 'Qara koktey paltarı', price: 89.9, status: 'preparing', platform: 'instagram', date: '2026-04-28T08:12:00Z' },
  { id: 'AIO-1040', customer: 'Sənan Z.', product: 'Idman ayaqqabı', price: 119.0, status: 'completed', platform: 'whatsapp', date: '2026-04-27T22:01:00Z' },
  { id: 'AIO-1039', customer: 'Aytac M.', product: 'Yay paltarı', price: 49.9, status: 'confirmed', platform: 'whatsapp', date: '2026-04-27T18:42:00Z' },
  { id: 'AIO-1038', customer: 'Rauf B.', product: 'Dəri pencək', price: 240.0, status: 'new', platform: 'instagram', date: '2026-04-27T11:20:00Z' },
  { id: 'AIO-1037', customer: 'Lalə M.', product: 'Çiçəkli paltar', price: 65.5, status: 'cancelled', platform: 'instagram', date: '2026-04-26T15:00:00Z' },
];

export const ORDER_STATUSES = ['new', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'];

export const MOCK_INBOX = [
  {
    id: 'conv_01',
    customer: 'Səbinə Rzayeva',
    avatar: 'SR',
    platform: 'instagram',
    lastMessage: 'M ölçü hələ varmı?',
    leadScore: 92,
    status: 'open',
    unread: 2,
    messages: [
      { from: 'customer', text: 'Salam, qara koktey paltarın qiyməti nədir?', at: '2026-04-28T16:50:00Z' },
      { from: 'bot', text: 'Salam Səbinə xanım! 89.90 ₼-dir. Bu həftə 10% endirim aktivdir.', at: '2026-04-28T16:50:30Z' },
      { from: 'customer', text: 'M ölçü varmı?', at: '2026-04-28T16:52:00Z' },
      { from: 'bot', text: 'Bəli, M ölçü stokda 3 ədəddir. Ödəniş üçün link göndərimmi?', at: '2026-04-28T16:52:30Z' },
      { from: 'customer', text: 'M ölçü hələ varmı?', at: '2026-04-28T17:00:00Z' },
    ],
  },
  {
    id: 'conv_02',
    customer: 'Kamran A.',
    avatar: 'KA',
    platform: 'whatsapp',
    lastMessage: '42 nömrə var, çatdırılma neçə günə?',
    leadScore: 78,
    status: 'open',
    unread: 1,
    messages: [
      { from: 'customer', text: 'Salam, idman ayaqqabısı 42 nömrə var?', at: '2026-04-28T15:30:00Z' },
      { from: 'bot', text: 'Salam! 42 nömrə stokdadır, qiyməti 119 ₼.', at: '2026-04-28T15:30:25Z' },
      { from: 'customer', text: '42 nömrə var, çatdırılma neçə günə?', at: '2026-04-28T15:42:00Z' },
    ],
  },
  {
    id: 'conv_03',
    customer: 'Lalə M.',
    avatar: 'LM',
    platform: 'instagram',
    lastMessage: 'Endirim ola bilərmi?',
    leadScore: 64,
    status: 'open',
    unread: 0,
    messages: [
      { from: 'customer', text: 'Çiçəkli paltarın qiyməti nə qədərdi?', at: '2026-04-28T13:55:00Z' },
      { from: 'bot', text: '65.50 ₼-dir. Sizə yaraşacaq düşünürəm.', at: '2026-04-28T13:55:20Z' },
      { from: 'customer', text: 'Endirim ola bilərmi?', at: '2026-04-28T14:08:00Z' },
    ],
  },
  {
    id: 'conv_04',
    customer: 'Anar Q.',
    avatar: 'AQ',
    platform: 'whatsapp',
    lastMessage: 'Salam, dəri çanta var?',
    leadScore: 58,
    status: 'open',
    unread: 1,
    messages: [{ from: 'customer', text: 'Salam, dəri çanta var?', at: '2026-04-28T11:50:00Z' }],
  },
  {
    id: 'conv_05',
    customer: 'Cavid Ə.',
    avatar: 'CƏ',
    platform: 'instagram',
    lastMessage: 'Sifariş təsdiqləndi, sağ olun!',
    leadScore: 88,
    status: 'closed',
    unread: 0,
    messages: [
      { from: 'customer', text: 'Trikotaj sviter götürürəm.', at: '2026-04-28T10:15:00Z' },
      { from: 'bot', text: 'Çox gözəl seçim. Ünvan və ödəniş linki göndərirəm.', at: '2026-04-28T10:15:25Z' },
      { from: 'customer', text: 'Sifariş təsdiqləndi, sağ olun!', at: '2026-04-28T10:30:00Z' },
    ],
  },
];

export const MOCK_AUDIT_LOGS = [
  { id: 'log_01', actor: 'admin@aioperator.social', action: 'admin.login', target: '—', ip: '185.244.180.11', at: '2026-04-28T18:00:14Z', status: 'success' },
  { id: 'log_02', actor: 'admin@aioperator.social', action: 'pricing.update', target: 'plan:combo', ip: '185.244.180.11', at: '2026-04-28T17:45:00Z', status: 'success' },
  { id: 'log_03', actor: 'unknown', action: 'admin.login', target: '—', ip: '92.50.30.110', at: '2026-04-28T16:12:08Z', status: 'failed' },
  { id: 'log_04', actor: 'admin@aioperator.social', action: 'customer.limit_changed', target: 'cust_04', ip: '185.244.180.11', at: '2026-04-28T15:02:11Z', status: 'success' },
  { id: 'log_05', actor: 'admin@aioperator.social', action: 'ip.blocked', target: '92.50.30.110', ip: '185.244.180.11', at: '2026-04-28T16:13:00Z', status: 'success' },
  { id: 'log_06', actor: 'admin@aioperator.social', action: 'admin.logout', target: '—', ip: '185.244.180.11', at: '2026-04-27T22:08:05Z', status: 'success' },
];

export const MOCK_IP_ALLOWLIST = [
  { ip: '185.244.180.11', label: 'Office #1', addedAt: '2026-01-04T08:00:00Z', active: true },
  { ip: '46.27.114.55', label: 'Home VPN', addedAt: '2026-02-12T18:00:00Z', active: true },
];

export const MOCK_ADMIN_SESSIONS = [
  { id: 's1', device: 'Chrome 124 / macOS', ip: '185.244.180.11', city: 'Bakı, AZ', startedAt: '2026-04-28T18:00:14Z', current: true },
  { id: 's2', device: 'Safari iOS 17', ip: '46.27.114.55', city: 'Bakı, AZ', startedAt: '2026-04-26T07:30:00Z', current: false },
];

export const MOCK_FAILED_LOGINS = [
  { ip: '92.50.30.110', country: 'TR', email: 'admin@aioperator.social', at: '2026-04-28T16:12:08Z' },
  { ip: '5.188.62.10', country: 'RU', email: 'admin@aio.com', at: '2026-04-28T13:01:50Z' },
  { ip: '198.51.100.7', country: 'US', email: 'root@aio', at: '2026-04-27T23:50:11Z' },
];

export const MOCK_REVENUE_TIMELINE = [
  { month: 'Yan', revenue: 1850, customers: 22 },
  { month: 'Fev', revenue: 2380, customers: 31 },
  { month: 'Mar', revenue: 3120, customers: 42 },
  { month: 'Apr', revenue: 4210, customers: 58 },
];

export const MOCK_USAGE_TIMELINE = [
  { month: 'Yan', messages: 180000, tokens: 7200000, cost: 79.2 },
  { month: 'Fev', messages: 245000, tokens: 9800000, cost: 107.8 },
  { month: 'Mar', messages: 310000, tokens: 12400000, cost: 136.4 },
  { month: 'Apr', messages: 442000, tokens: 17680000, cost: 194.5 },
];

export function aggregateAdminStats() {
  const totalCustomers = MOCK_CUSTOMERS.length;
  const activeCustomers = MOCK_CUSTOMERS.filter((c) => c.status === 'active').length;
  const trialCustomers = MOCK_CUSTOMERS.filter((c) => c.status === 'trial').length;
  const totalMessages = MOCK_CUSTOMERS.reduce((s, c) => s + c.messagesUsed, 0);
  const totalTokens = MOCK_CUSTOMERS.reduce((s, c) => s + c.estimatedTokens, 0);
  const estimatedCost = MOCK_CUSTOMERS.reduce((s, c) => s + c.estimatedCost, 0);
  const monthlyRevenue = MOCK_CUSTOMERS.reduce((s, c) => {
    const map = { instagram: 29.9, whatsapp: 29.9, combo: 49.9, business: 99.9 };
    return s + (map[c.plan] || 0);
  }, 0);
  return {
    totalCustomers,
    activeCustomers,
    trialCustomers,
    totalMessages,
    totalTokens,
    estimatedCost: Number(estimatedCost.toFixed(2)),
    monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
  };
}
