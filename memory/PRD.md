# AI Operator — PRD

## Original Problem Statement
Build AI Operator MVP — Instagram + WhatsApp AI sales operator SaaS platform. Stable foundation, NO real Instagram/WhatsApp/payment/AI yet. Mobile-first, AZ + TR i18n. Trial mode active by default.

**Iteration 2 (2026-04-28):** Comprehensive frontend mockup expansion — Inbox, Leads pipeline, Orders, enhanced Bot Training, hidden Super Admin Panel (`/control-center-aio-2026`) with Login+2FA, Customers, Usage (token + cost), Pricing edit, Security (IP allowlist + audit logs). Strict rule: word **"token" must NEVER appear in seller-facing pages** — only in admin panel.

## User Personas
- **Small business owner** running an Instagram or WhatsApp store, sees only message-based metrics.
- **Multi-store entrepreneur** managing 2–5 storefronts on the Business plan with 5 bots.
- **System owner / Super Admin (you)** monitors token usage and AI cost via the hidden `/control-center-aio-2026` panel.

## Core Requirements
- React + Vite SPA. Node.js + Express + Mongoose backend. MongoDB.
- `PAYMENT_ENABLED=false`, `TRIAL_MODE=true` — every authenticated user gets auto-trial subscription. **"Subscription not found" error must never appear.**
- i18n via `/az` and `/tr`. Default `/` → `/az`. Translation files: `frontend/src/locales/{az,tr}.json`.
- 4 plans with message limits:
  - Instagram 29.90 ₼ — 1 bot, 1 channel, 10.000 msg/ay
  - WhatsApp 29.90 ₼ — 1 bot, 1 channel, 10.000 msg/ay
  - Combo 49.90 ₼ (popular) — 1 bot, 2 channels, 50.000 msg/ay
  - Business 99.90 ₼ — 5 bots, 5 channels, 150.000 msg/ay
- No `alert()`/`confirm()`/`prompt()`. Toast at `z-[9999]`, fixed top, mobile-visible.
- React `ErrorBoundary` → no white screens.
- Mobile-first: 360 / 390 / 430 / iPhone SE / iPhone 12-14. Sidebar collapses to hamburger.
- All interactive elements include `data-testid`.
- Deployable: `frontend/vercel.json`, root `render.yaml`, `.env.example`.
- **Hidden Super Admin route `/control-center-aio-2026`** — no public link, sessionStorage auth, mock 2FA.

## Architecture
```
/app
├── backend/                Node.js + Express (Render-ready)
│   ├── src/{config,db,index}.js, middleware/auth.js
│   ├── services/{subscription,activity}.js
│   ├── models/{User,Subscription,Bot,Product,Activity}.js (UUID _id)
│   └── routes/{auth,bots,products,activities,subscription}.js
├── frontend/               React + Vite + Tailwind + i18next
│   ├── src/
│   │   ├── lib/{api,utils,mockData}.js
│   │   ├── context/{AuthContext,ToastContext,AdminContext}.jsx
│   │   ├── components/{ErrorBoundary,LanguageSwitcher,PublicHeader,Footer,UsageBar}.jsx
│   │   ├── locales/{az,tr}.json
│   │   ├── pages/{LandingPage,RegisterPage,LoginPage}.jsx
│   │   ├── pages/dashboard/{DashboardLayout,OverviewPage,BotsPage,CreateBotPage,
│   │   │       TrainingPage,ProductsPage,InboxPage,LeadsPage,OrdersPage,
│   │   │       ActivityPage,SubscriptionPage,SettingsPage}.jsx
│   │   └── pages/admin/{AdminLoginPage,AdminLayout,AdminOverviewPage,
│   │           AdminCustomersPage,AdminCustomerDetailPage,AdminUsagePage,
│   │           AdminPricingPage,AdminSecurityPage,AdminAuditPage}.jsx
│   ├── vercel.json
│   └── .env(.example)
├── render.yaml
└── README.md
```

## What's Been Implemented

### Iteration 1 — 2026-04-28 (Foundation)
- Express + Mongoose backend, JWT auth, UUID `_id`
- Auto-trial subscription middleware (never returns null)
- Bots/Products full CRUD + plan-based bot limits + Instagram connect placeholder
- Activity log auto-recording, helmet+CORS+rate limit
- React landing (hero/features/pricing/FAQ/CTA), Register, Login, Dashboard skeleton
- Toast `z-[9999]`, ErrorBoundary, AZ/TR i18n with `/az` `/tr` routes
- Vercel + Render deploy configs
- ✅ 19/19 backend tests + e2e frontend tests pass

### Iteration 2 — 2026-04-28 (Mockup Expansion)
**Pricing redesign:** combo bumped to 49.90 ₼; every plan now displays `messageLimit` badge (10k/10k/50k/150k). Backend PLANS config + frontend PLANS array updated.

**Seller dashboard expansion:**
- Word "token" purged from all seller pages — replaced with "mesaj/cavablandırılan/limit/qalan/istifadə faizi"
- Overview KPIs reshuffled: messagesUsed, messageLimit, messagesRemaining, bots, leads, orders, products, plan
- New shared `UsageBar` component (fill width = `used/limit`, 80%+ amber, 95%+ red, with bilingual warnings)
- New page **Inbox** (`/dashboard/inbox`) — sidebar conversation list + chat preview, handoff & convert-to-order buttons (mock)
- New page **Leads** (`/dashboard/leads`) — 6-stage Kanban (new/interested/priceAsked/closeToOrder/confirmed/lost) with score+value cards
- New page **Orders** (`/dashboard/orders`) — table with id/customer/product/price/platform/status/date
- New page **Training** (`/dashboard/training`) — 9-field bot instruction form + live chat preview reflecting rules
- Subscription page reworked into `İstifadə və tarif`: progress bar, used/remaining/limit cards, recommended-plan upsell when usage > 70%
- Sidebar nav extended (Mesajlar, Potensial müştərilər, Sifarişlər, Bota təlimat ver)

**Hidden Super Admin Panel** at `/control-center-aio-2026` (NO public link):
- Dark-theme login with Email + Password + 2FA mock — credentials `admin@aioperator.social / AdminAIO2026! / 482910`
- Session stored in `sessionStorage` (60-min expiry mock); private admin routes guard against unauthenticated access
- **Overview** — 7 KPIs (totalCustomers, activeCustomers, trialCustomers, totalMessages, totalTokens, estimatedCost, monthlyRevenue), revenue + usage bar charts, top customers, at-risk customers, plan distribution
- **Customers** — sortable table with all metrics including `tokens` and AI `cost` (admin-only); search + plan filter
- **Customer Detail** — full profile, mini-chart, admin note, custom pricing, manual message/token limits, status & plan switcher, privacy notice ("admin sees no message content")
- **Usage** — risk-classified table (normal / yüksək istifadə / limitə yaxın / zərər riski) with recommended-plan and "set custom price" action
- **Pricing** — table of 4 plans + edit modal (name/price/bots/channels/messageLimit/tokenLimit/overagePrice/features); save updates state and toasts
- **Security** — 2FA status, IP allowlist (add/remove), active sessions, failed login attempts (with "Block IP" action), guidance list of future hardening layers
- **Audit Logs** — table of admin actions (login, pricing.update, customer.limit_changed, ip.blocked, etc.) with translated labels and success/failed badges

**Mock data** (`/app/frontend/src/lib/mockData.js`): 8 customers, 8 leads, 6 orders, 5 inbox conversations, 6 audit logs, 2 IP allowlist entries, 2 admin sessions, 3 failed logins, 4-month revenue + usage timelines, deterministic per-user usage.

### Tested ✅ (Iteration 2)
- 28/28 frontend scenarios pass via testing agent
- Backend `/api/health` still ok=true
- Mobile 390x844: no horizontal scroll on any page
- AZ↔TR language toggle works on all pages
- 0 native alert/confirm/prompt detected
- 'token' word absent from all seller pages, present only on admin pages

## Deployment Notes
- **Frontend**: `frontend/vercel.json` configures Vite build + SPA rewrites. Set `VITE_API_URL=<render-url>`.
- **Backend**: root `render.yaml`. Set `MONGO_URL` (Atlas) once. `npm start` → `node src/index.js`.
- Hidden admin route is a frontend-only mock at this stage. **Future backend work** must add: separate admin auth DB, real TOTP 2FA, IP allowlist middleware, super_admin role, brute-force/rate-limit, signed audit logs, short JWT TTL (≤60min).

## Prioritized Backlog
### P0 — done
- [x] Stable register/login/dashboard, auto-trial subscription
- [x] Pricing tiers with message limits (no "token" in seller UI)
- [x] Seller pages: Inbox, Leads, Orders, Training, Usage with progress bar
- [x] Hidden Super Admin panel mockup (Login+2FA, Overview, Customers, Usage, Pricing, Security, Audit)
- [x] Mobile responsive + i18n AZ/TR + ErrorBoundary

### P1 — next phase (real integrations)
- [ ] Real Instagram OAuth + Graph API webhook auto-reply
- [ ] WhatsApp Cloud API integration
- [ ] LLM brain (Claude/GPT) wired to bot instructions + product catalog
- [ ] Real backend for Inbox/Leads/Orders/Customers (replace mocks)
- [ ] Real Super Admin backend with separate auth, TOTP, IP allowlist, audit log persistence
- [ ] Real payment provider (Iyzico / PayTR / Paddle) gated by `PAYMENT_ENABLED=true`

### P2
- [ ] Cloudinary / S3 product image upload
- [ ] Email verification + password reset
- [ ] Multi-user / team seats on Business plan
- [ ] Per-customer custom pricing applied at billing time
- [ ] Real-time AI cost dashboard with alerts

## Test Credentials
- Admin (mock): `admin@aioperator.social` / `AdminAIO2026!` / 2FA `482910`
- Seller: register fresh email per test (`qa.seller+<rand>@aioperator.local` / `Password123!`)
- Full reference at `/app/memory/test_credentials.md`
