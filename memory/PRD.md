# AI Operator — PRD

## Original Problem Statement
Build a clean and stable MVP from scratch — Instagram + WhatsApp AI sales operator SaaS skeleton. No legacy code. No payment integration, no real Instagram/WhatsApp auto-reply or webhooks in this phase. Stable foundation only.

Tech: React + Vite frontend, Node.js + Express backend, MongoDB. Vercel + Render deployable. Mobile-first, AZ + TR i18n.

## User Personas
- **Small business owner** running an Instagram or WhatsApp store, wants an AI assistant that replies to customer DMs, recommends products from a catalog, and converts to sales.
- **Multi-store entrepreneur** managing 2–5 storefronts, needs the Business plan with 5 bots.
- **Operations team member** needs an admin panel that surfaces leads, conversation activity, and product inventory.

## Core Requirements (static)
- React + Vite SPA. Node.js + Express + Mongoose backend. MongoDB.
- `PAYMENT_ENABLED=false`, `TRIAL_MODE=true` — every authenticated user is active; subscription auto-created if missing. **The "Abunəlik tapılmadı" / "subscription not found" error must never appear** while `TRIAL_MODE=true`.
- i18n via `/az` and `/tr` routes. Default `/` → `/az`. Translation files in `frontend/src/locales/{az,tr}.json`.
- 4 plans: Instagram 29.90 ₼ (1 bot), WhatsApp 29.90 ₼ (1 bot), Combo 39.90 ₼ (1 bot), Business 99.90 ₼ (5 bots).
- No `alert()`/`confirm()`/`prompt()` anywhere — toast at `z-[9999]`, fixed top, mobile-visible.
- React `ErrorBoundary` wraps the app; no white screens on API/render errors.
- Mobile-first: works at 360 / 390 / 430 / iPhone SE / iPhone 12-14 / Android. Sidebar collapses to hamburger.
- All interactive elements include `data-testid`.
- Deployable: `frontend/vercel.json`, root `render.yaml`, `.env.example` per service.

## Architecture
```
/app
├── backend/                Node.js + Express (Render-ready)
│   ├── src/
│   │   ├── index.js        Express app, all /api routes
│   │   ├── config.js       Env + plan definitions
│   │   ├── db.js           Mongoose connection
│   │   ├── middleware/auth.js     JWT
│   │   ├── services/{subscription,activity}.js
│   │   ├── models/{User,Subscription,Bot,Product,Activity}.js  (UUID _id)
│   │   └── routes/{auth,bots,products,activities,subscription}.js
│   ├── server.py           FastAPI proxy → Node.js (preview only)
│   ├── package.json        type=module, ES modules
│   └── .env, .env.example
├── frontend/               React + Vite + Tailwind + i18next
│   ├── src/
│   │   ├── main.jsx, App.jsx, index.css, i18n.js
│   │   ├── locales/{az,tr}.json
│   │   ├── lib/{api,utils}.js
│   │   ├── context/{AuthContext,ToastContext}.jsx
│   │   ├── components/{ErrorBoundary,LanguageSwitcher,PublicHeader,Footer}.jsx
│   │   ├── pages/{LandingPage,RegisterPage,LoginPage}.jsx
│   │   └── pages/dashboard/{DashboardLayout,OverviewPage,BotsPage,CreateBotPage,ProductsPage,ActivityPage,SubscriptionPage,SettingsPage}.jsx
│   ├── vite.config.js, tailwind.config.js, postcss.config.js
│   ├── vercel.json
│   └── .env, .env.example
├── render.yaml             Render blueprint for Node backend
├── design_guidelines.json
└── README.md
```

## What's Been Implemented (2026-04-28)
### Backend
- Express + Mongoose with UUID string `_id` (no ObjectId leak)
- JWT auth (`bcryptjs` hash, 30-day token), zod request validation
- `ensureSubscription` / `getActiveSubscription` always return a sub when `TRIAL_MODE=true`
- Bot CRUD with plan-based limit enforcement (`403 bot_limit_reached`)
- Product CRUD (unlimited)
- Activity log (auto-recorded on auth/bot/product events)
- Subscription view + plan switcher
- Instagram/WhatsApp connect endpoint returns `202 pending` (UI placeholder)
- Helmet, CORS (whitelist + preview wildcard), rate limit 200/min
- Health endpoint `/api/health`

### Frontend
- Bold gradient premium SaaS landing (hero, 6 feature cards, 4-tier pricing, FAQ accordion, CTA, footer)
- Pricing CTA pre-selects plan in register form via `?plan=` query
- Register / Login pages with toast feedback; submit lands directly on `/dashboard`
- Dashboard with sticky sidebar (desktop) and hamburger drawer (mobile)
- Pages: Overview (KPIs + plan card + recent activity), Bots (cards + connect chips + delete confirm), Create Bot (full form), Products (modal CRUD), Activity, Subscription (current + plan switch), Settings
- Toast system at `z-[9999]`, top-fixed, max-width, mobile-visible, animated
- React `ErrorBoundary` with branded fallback (AZ + TR)
- i18n switcher in header + settings; URL prefix swap on toggle
- Custom Clash Display + Manrope typography via Fontshare/Google fonts
- Vite build clean, 0 errors (105 KB gzipped JS)

### Tested ✅
- 19/19 backend tests pass (auth, plans, bots, limit, products, activities, subscription)
- Frontend e2e flows verified by testing agent: landing AZ/TR, pricing → register → dashboard, login persistence across reload, bot limit toast, product CRUD, Instagram placeholder toast, mobile hamburger, language switcher

## Prioritized Backlog
### P0 (already done)
- [x] Stable register/login/dashboard
- [x] Trial subscription auto-create
- [x] Bot + Product CRUD
- [x] AZ + TR i18n
- [x] Mobile responsive + toast/error boundary
- [x] Render + Vercel deploy configs

### P1 — next phase
- [ ] Real Instagram OAuth + Graph API webhook for auto-reply
- [ ] WhatsApp Cloud API integration
- [ ] LLM brain for the AI Operator (Claude/GPT) wired to bot instructions + product catalog
- [ ] Conversation inbox UI (lead pipeline)
- [ ] Real payment provider (Iyzico / PayTR / Paddle) gated by `PAYMENT_ENABLED=true`

### P2
- [ ] Image upload (Cloudinary / S3) instead of URL field on products
- [ ] Email verification + password reset
- [ ] Multi-user / team seats on Business plan
- [ ] Analytics dashboard (sales attributed to AI)

## Test Credentials
See `/app/memory/test_credentials.md`. No seeded users — every test self-registers a fresh email.

## Deployment
- **Frontend (Vercel)**: `frontend/vercel.json` configures Vite build + SPA rewrites. Set `VITE_API_URL=https://<render-url>`.
- **Backend (Render)**: root `render.yaml` blueprint. Set `MONGO_URL` (Atlas) once.
