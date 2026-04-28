# AI Operator — PRD

## Original Problem Statement
Build AI Operator MVP — Instagram + WhatsApp AI sales operator SaaS platform. Stable foundation, NO real Instagram/WhatsApp/payment/AI yet. Mobile-first, AZ + TR i18n. Trial mode active by default.

**Iteration 1 (2026-04-28):** Foundational stack — Node.js + Express + MongoDB backend, React + Vite frontend, JWT auth, auto-trial subscription, Bots/Products CRUD, AZ+TR i18n, Vercel/Render deploy configs.

**Iteration 2 (2026-04-28):** Frontend mockup expansion — Inbox, Leads pipeline, Orders, enhanced Bot Training, hidden Super Admin Panel (`/control-center-aio-2026`) with Login+2FA, Customers, Usage (token + cost), Pricing edit, Security (IP allowlist + audit logs). Strict rule: word **"token" must NEVER appear in seller-facing pages** — only in admin panel.

**Iteration 3+4 — Faza 2A (2026-04-28):** Convert mockup to real working core MVP backed by MongoDB. Real auth + subscription + bot/product CRUD. Default plan changed to **COMBO**, with `usedMessages=129` seed, `monthlyMessageLimit=50000`. AZ number formatting now uses dot thousands separator (50.000). Health endpoint returns `db: "connected"`. Frontend Overview/Usage now read REAL `subscription.usedMessages` and `monthlyMessageLimit` (no more deterministic mock).

## User Personas
- **Small business owner** (seller role) — sees only message-based metrics
- **Multi-store entrepreneur** — Business plan, 5 bots
- **System owner / Super Admin** (super_admin role) — hidden `/control-center-aio-2026` panel sees tokens + AI cost

## Core Requirements
- React + Vite SPA. Node.js + Express + Mongoose backend. MongoDB.
- `PAYMENT_ENABLED=false`, `TRIAL_MODE=true`, `PAYMENT_PROVIDER=mock` — auto-trial subscription, **"Subscription not found" error never appears**
- i18n via `/az` (default) and `/tr`. AZ thousands separator = `.`
- 4 plans:
  - Instagram 29.90 ₼ — 1 bot, 1 channel, 10.000 msg/ay
  - WhatsApp 29.90 ₼ — 1 bot, 1 channel, 10.000 msg/ay
  - Combo 49.90 ₼ (default + popular) — 1 bot, 2 channels, 50.000 msg/ay
  - Business 99.90 ₼ — 5 bots, 5 channels, 150.000 msg/ay
- No `alert()`/`confirm()`/`prompt()`. Toast at `z-[9999]`, fixed top, mobile-visible.
- React `ErrorBoundary` → no white screens.
- Mobile-first: 360 / 390 / 430 / iPhone SE / iPhone 12-14.
- All interactive elements include `data-testid`.
- **Hidden Super Admin route `/control-center-aio-2026`** — no public link, sessionStorage auth, mock 2FA.

## Architecture
```
/app
├── backend/                Node.js + Express + Mongoose (Render-ready)
│   ├── src/
│   │   ├── index.js        Express app, CORS, helmet, rate-limit, /api/health (db state)
│   │   ├── config.js       Env + PLANS (price, botLimit, channelLimit, messageLimit)
│   │   ├── db.js           Mongoose connection
│   │   ├── middleware/auth.js   JWT
│   │   ├── services/{subscription,activity}.js  ensureSubscription, applyPlan
│   │   ├── models/{User,Subscription,Bot,Product,Activity}.js  (UUID _id)
│   │   └── routes/{auth,bots,products,activities,subscription}.js
│   ├── server.py           FastAPI proxy → Node:9000 (preview only)
│   ├── .env / .env.example
│   └── package.json (type=module)
├── frontend/               React + Vite + Tailwind + i18next
│   └── src/
│       ├── lib/{api,utils,mockData}.js
│       ├── context/{AuthContext,ToastContext,AdminContext}.jsx
│       ├── components/{ErrorBoundary,LanguageSwitcher,PublicHeader,Footer,UsageBar}.jsx
│       ├── locales/{az,tr}.json
│       ├── pages/{LandingPage,RegisterPage,LoginPage}.jsx
│       ├── pages/dashboard/{DashboardLayout,Overview,Bots,CreateBot,Training,Products,Inbox,Leads,Orders,Activity,Subscription,Settings}Page.jsx
│       └── pages/admin/{AdminLogin,AdminLayout,AdminOverview,AdminCustomers,AdminCustomerDetail,AdminUsage,AdminPricing,AdminSecurity,AdminAudit}Page.jsx
├── render.yaml             Render blueprint for Node backend
├── frontend/vercel.json    Vercel SPA config
└── README.md
```

## What's Been Implemented

### Backend (real, MongoDB-backed)
- Full Express + Mongoose stack with UUID string `_id`
- JWT auth (bcryptjs hash, 30-day token), zod validation
- **User**: firstName, lastName, email, phone, password, role(seller|super_admin), locale, createdAt
- **Subscription**: userId, plan, status, paymentStatus, isTrial, botLimit, channelLimit, channels, monthlyMessageLimit, usedMessages, resetDate, price, currency, expiresAt
- **Bot**: userId, name, niche, salesStyle, instructions, discountRules, handoffRules, instagramConnected, whatsappConnected, status
- **Product**: userId, botId, name, image, imageUrl, price, discountPrice, maxDiscount, stock, category, description, salesNote, status(active|draft|archived)
- **Activity**: userId, botId, platform, type, text, message, status, meta
- `ensureSubscription` / `getActiveSubscription` always return a sub when `TRIAL_MODE=true`; default plan **combo**, `usedMessages=129`
- `applyPlan(sub, planId)` syncs all derived fields atomically
- Bot CRUD with plan limit (`403 bot_limit_reached`); Product CRUD unlimited; Activity log
- `GET /api/health` → `{ ok, db, trialMode, paymentEnabled, version }` with `db` from `mongoose.connection.readyState`
- CORS whitelist (aioperator.social + localhost + preview wildcard), helmet, rate-limit 200/min

### Frontend (real-data wired)
- Premium gradient SaaS landing (hero + 6 features + 4-tier pricing with msg-limit badges + FAQ + CTA)
- Auth (Register/Login) → directly `/dashboard`, refresh keeps session, token in localStorage
- Seller dashboard (sticky sidebar desktop + hamburger mobile):
  - **Overview** — 8 KPIs reading REAL subscription data (messagesUsed/limit/remaining), shared `UsageBar` with 80%↑amber / 95%↑red warnings + recommended-plan upsell
  - **Bots** — real CRUD, limit toast, Instagram connect placeholder
  - **Create Bot** — form
  - **Training** — 9-field instructions + live chat preview
  - **Products** — real CRUD with image URL, salesNote, status
  - **Inbox** (mock) — sidebar conversation list + chat preview, handoff & convert-to-order toasts
  - **Leads** (mock) — 6-stage Kanban
  - **Orders** (mock) — table
  - **Activity** — real activity feed
  - **Subscription** (real-data Usage page) — progress bar, plan switcher, recommended upsell
  - **Settings** — profile + language toggle + logout
- "**token**" word **absent from every seller page** (verified)
- Hidden Super Admin (`/control-center-aio-2026`, mock-only): Login+2FA, Overview KPIs, Customers list+detail, Usage (token+cost visible), Pricing edit modal, Security (2FA + IP allowlist + sessions + failed logins), Audit logs
- Toast at `z-[9999]`, ErrorBoundary, AZ/TR i18n with dot-thousands separator (50.000)

### Tested ✅
- Iteration 1: 19/19 backend + e2e
- Iteration 2: 28/28 frontend mockup
- Iteration 3: 28/28 backend pytest + 23 frontend (3 caught & fixed)
- Iteration 4: 28/28 backend regression + 11/11 frontend retest **all green**

## Deployment
### Frontend (Vercel)
- `frontend/vercel.json` configures Vite build + SPA rewrites
- Env: `VITE_API_URL=https://<render-backend>.onrender.com`, `VITE_DEFAULT_LOCALE=az`

### Backend (Render)
- root `render.yaml` blueprint
- Required env: `MONGO_URL` (Atlas), `JWT_SECRET` (auto-generated), `FRONTEND_URL`, `CORS_ORIGINS`, `PAYMENT_ENABLED=false`, `TRIAL_MODE=true`, `PAYMENT_PROVIDER=mock`

## Prioritized Backlog
### P0 — done
- [x] Stable register/login/dashboard, auto-trial subscription
- [x] Real Bot/Product CRUD with MongoDB persistence
- [x] Pricing tiers with message limits, default = combo
- [x] Frontend reads real subscription.usedMessages/monthlyMessageLimit
- [x] Word "token" absent from seller UI; admin panel UI/structure ready
- [x] Mobile responsive + i18n AZ/TR (dot thousands) + ErrorBoundary
- [x] Health endpoint with db state, /api/bots/:id, products with salesNote+imageUrl+status

### P1 — next phase
- [ ] Real Instagram OAuth + Graph API webhook auto-reply
- [ ] WhatsApp Cloud API integration
- [ ] LLM brain (Claude/GPT) wired to bot instructions + product catalog
- [ ] Real backend for Inbox/Leads/Orders (replace mocks)
- [ ] Real Super Admin backend (separate auth, TOTP, IP allowlist middleware, signed audit log persistence)
- [ ] Real payment provider (Iyzico / PayTR / Paddle) gated by `PAYMENT_ENABLED=true`
- [ ] Message counter increment when AI replies (`/api/usage/increment`)

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
