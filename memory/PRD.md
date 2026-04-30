# AI Operator — PRD

## Original problem statement
SaaS platform "AI Operator" — Instagram & WhatsApp AI satış operatoru (Azerbaijani + Turkish). Node.js + Express backend, React + Vite frontend, MongoDB. Deployed to Render (backend) + Vercel (frontend).

## Architecture
- **Frontend**: React 18 + Vite + Tailwind + react-router v6 + i18next (az/tr)
- **Backend**: Node.js 18+ ESM, Express, Mongoose 8, JWT auth, bcryptjs, zod, helmet, rate-limiting
- **AI**: Google Generative AI SDK (`@google/generative-ai`) — primary `gemini-2.5-flash-lite`, fallback `gemini-2.5-flash`, mock mode when key missing
- **Deploy**: Render (backend, `render.yaml`) + Vercel (frontend, `vercel.json`)

## User personas
1. **Seller (primary)** — small Instagram/WhatsApp shop owner in AZ/TR. Trains a bot, adds products, shares a public store link, receives customer messages.
2. **Super Admin** — internal. Admin panel is currently MOCK, gated behind `VITE_ENABLE_ADMIN_MOCK=true`; closed in production.
3. **Public customer** — visits `/<storeSlug>` anonymously, browses products, clicks Instagram/WhatsApp CTA.

## Core requirements (static)
- No admin panel in production (hardcoded credentials disabled)
- Seller UI must never show "token" or AI cost — only message counter (`used / limit mesaj`)
- Trial mode + combo plan auto-assigned on register
- Fail-fast on missing `JWT_SECRET` / `MONGO_URL` in production
- Fail-loud on missing `VITE_API_URL` in production build (config error screen)
- AI must degrade to mock reply (never crash) when key absent or `AI_ENABLED=false`
- Product matching done locally first (top 1-3), never send whole catalog to the model
- Reserved top-level paths: `az, tr, en, login, register, dashboard, pricing, control-center-aio-2026, api, admin, assets, static, public, favicon.ico, robots.txt, sitemap.xml`

## What's been implemented

### Phase 1 — MVP (earlier)
- Register / Login (JWT + bcrypt)
- Subscription (trial, combo/instagram/whatsapp/business plans)
- Bot CRUD with plan limits
- Product CRUD
- Activities log
- Seller dashboard (overview, bots, products, training, inbox mock, leads mock, orders mock, subscription, settings, activity)
- Admin panel (MOCK only) behind hidden route `/control-center-aio-2026`
- i18n az/tr
- ErrorBoundary

### Phase 2A — Production-readiness (2026-04-30)
- `backend/.env.example` + `frontend/.env.example` created
- JWT_SECRET + MONGO_URL production fail-fast guards in `config.js`
- VITE_API_URL config error screen (`ConfigErrorScreen.jsx`) when missing in prod
- Admin mock gated by `VITE_ENABLE_ADMIN_MOCK` (disabled by default)
- `.gitignore` hardened; `.env.example` explicitly allowed
- `frontend/yarn.lock` + `backend/yarn.lock` generated for reproducible builds

### Phase 2B — AI brain + storefront (2026-04-30)
- **Bot Training Persistence**: `BotTraining` Mongoose model + `GET/PUT /api/bots/:id/training`. Fields: businessName, businessCategory, toneOfVoice, greetingMessage, salesInstructions, deliveryInfo, paymentInfo, returnPolicy, discountRules, maxDiscountPercent, forbiddenTopics, handoffRules, fallbackMessage, languageMode. Rewritten `TrainingPage.jsx` with bot selector, real API, live save.
- **AI Test Chat Simulator**: `BotTesterPanel.jsx` in training page. `POST /api/bots/:id/test-message` → matches products → calls Gemini (or mock) → returns reply + matchedProducts + usage.
- **Gemini integration** (`services/ai.js`): primary `gemini-2.5-flash-lite` → fallback `gemini-2.5-flash` → mock. Never throws on failure.
- **Product matcher** (`services/productMatcher.js`): keyword/category/description scoring, returns top-3.
- **Message usage counter**: atomic `$inc` on `usedMessages`. 402 when limit reached. Seller UI shows "X / Y mesaj" only.
- **Admin technical usage log** (`AiUsageLog` model): userId, botId, messageId, model, approx inputTokens/outputTokens, estimatedCost, mock flag, source `test|coach|instagram|whatsapp|other`. Schema only — no admin UI yet.
- **Public storefront**: User model gains `storeSlug` (unique, sparse) + `storeName`, `instagramHandle`, `whatsappNumber`. New routes `PUT /api/me/store`, `GET /api/public/store/:slug`. Slug validation: `^[a-z0-9][a-z0-9_-]{2,31}$`, reserved-list enforced, uniqueness enforced (409 on clash).
- **Public store page** (`/reshad_12`): branded header, product grid with discount badge + stock status, IG + WA CTA buttons.
- **Settings page**: store slug form with domain preview + live link.
- **App routing**: `/:lng/*` for locales; non-locale, non-reserved slugs route to `StorePage`.

### Phase 2C — Bot groups + Instagram DM-style coach chat (2026-04-30)
- **Bot groups** (`BotGroup` model + `/api/bot-groups/*`): seller can create named groups, assign bots, and apply a single training payload to all group bots in one call (`PUT /api/bot-groups/:id/apply-training`). Unused botIds for other users are filtered out defensively. Frontend wiring deferred.
- **Bot channel handles**: `Bot` model adds optional `instagramHandle` + `whatsappNumber` (display-only; no real OAuth yet). `CreateBotPage` exposes the two fields.
- **Coach chat** — the seller's "train the bot by talking to it" feature:
  - `CoachMessage` model stores the full history (role: seller|bot, message, suggestedTrainingUpdate, applied flag).
  - `GET /api/bots/:id/coach-messages` → full history, oldest first.
  - `POST /api/bots/:id/coach-message` → seller sends an instruction → Gemini (or heuristic mock) generates `{ reply, update }` structured JSON → both messages persisted → `usedMessages += 1` → `AiUsageLog` entry with `source:"coach"`.
  - `POST /api/bots/:id/apply-coach-suggestion` → merges the stored suggestion into `BotTraining` (text fields appended, numeric/enum replace) and marks the coach message `applied=true`. Re-apply returns 409.
  - `services/coach.js`: Gemini system prompt forces JSON schema, whitelisted fields, `responseMimeType: "application/json"`. Heuristic fallback for mock mode covers the 5 quick prompts out of the box.
- **Instagram DM-style UI** (`CoachChatPanel.jsx`): rounded card with gradient header, seller bubbles right / bot bubbles left, full history, quick-prompt chips, rounded input with send button. Each bot reply that carries a suggestion shows inline "Təlimata əlavə et" + "Ləğv et" buttons.
- **Tabs on training page**: "Təlim söhbəti" (CoachChatPanel, default) / "Canlı önizləmə" (BotTesterPanel).
- **Limit + mock behaviour**: same atomic `$inc` quota with 402 when used=limit. When `AI_ENABLED=false` or `GEMINI_API_KEY` missing, heuristic coach returns structured updates for the 5 quick prompts and common AZ/TR patterns.

### Phase 2D — Professional Orders page (2026-04-30)
Rebuild of `/dashboard/orders` with proper seller-facing UX, entirely on frontend mock (no backend Order model yet).

- **OrdersPage.jsx** rewritten: desktop `table-fixed` with **sticky-right action column** (guarantees "Əlaqə saxla" & "Ətraflı bax" are always visible at 1366px without horizontal scrolling — historical regression fixed). Mobile (`<md`) switches to a card layout. Both layouts share the same filter bar, status dropdown, modal and drawer.
- **Filter bar**: `Hamısı` chip + 6 status chips (multi-select) + `Bu gün` / `Bu həftə` (mutually exclusive). Filters AND-combine. `Hamısı` resets everything. Empty state: "Bu statuslara uyğun sifariş tapılmadı".
- **Sorting**: status order (Yeni → Təsdiqləndi → Hazırlanır → Göndərildi → Tamamlandı → Ləğv edildi), date desc within same status. Re-computed on status change.
- **Platform column**: shows only logo + real contact (Instagram `@handle` or WhatsApp `+994 ...`). Never the word "Instagram"/"WhatsApp" next to the icon.
- **Contact modal** (`OrderContactModal.jsx`): 3 action buttons — `Zəng et` (tel:+digits), `WhatsApp'dan yaz` (wa.me/digits), `Instagram'dan yaz` (instagram.com/handle). Disabled with `aria-disabled` when data missing; label text fully visible (wraps instead of being truncated).
- **Detail drawer** (`OrderDetailDrawer.jsx`): right-side sliding panel with 4 tabs: Mesajlar (DM-style bubbles), Sifariş (full field grid), Əlaqə məlumatları (per-contact rows with own "Əlaqə saxla" link), Çatdırılma ünvanı (field grid + Google Maps link `https://www.google.com/maps?q=LAT,LNG` when coords present).
- **orderHelpers.js**: pure helpers — `getCustomerFullName` (prioritised fallback chain, never returns `[object Object]` / `undefined`), `formatPhoneDisplay` (AZ-friendly grouping, capped at 15 digits = E.164), `buildWhatsAppLink`/`buildTelLink`/`buildInstagramLink`, `sortOrders`, `applyFilters`, `resolvePlatformContact`, `STATUS_ORDER`, `STATUS_TONES`.
- **WhatsAppIcon.jsx**: brand-accurate solid-green circle + white chat bubble + handset SVG.
- **mockData.js**: `MOCK_ORDERS` enriched additively with `fullName`, `instagramHandle`, `whatsappNumber`, `phone`, `quantity`/`size`/`color`/`variant`/`discount`/`total`/`note`, `deliveryAddress` (incl. lat/lng), and `messages[]`. Dates computed from `new Date()` at module load so `Bu gün`/`Bu həftə` chips have real hits. Existing fields preserved.
- **i18n** (`az.json` + `tr.json`): `dashboard.orders.*` expanded with `filters`, `actions`, `drawerTabs`, `contactTabs`, `fields`, `addressFields`, `empty`, `unnamed`, `openInMap`, `statusChange`. No existing key removed.
- **Status change is local**: stored in React state only, does not persist to backend (there is no Order model yet). This is intentional and documented in the task spec.
- **Testing**: frontend-only testing subagent ran end-to-end and reported 100% success across 25+ scenarios. Critical desktop-1366 check verified — every contact button has right-edge at x=1321 (≤1366 viewport), zero hidden buttons. Mobile 390px shows no horizontal overflow. No console errors, no `[object Object]`/`undefined`/`VVhatsApp` artefacts.

### Phase 2E — Revenue KPI strip on Orders page (2026-04-30)
Small at-a-glance business-pulse strip sitting right under the "Sifarişlər" title, before the filter bar.

- **5 KPI cards** (responsive grid: 2 cols mobile / 3 cols sm / 5 cols lg): `Bu gün` (emerald), `Bu həftə` (blue), `Bu ay` (violet), `Orta sifariş dəyəri` (amber with "Bu ay · N sifariş" hint), `Ən çox satılan` (pink with "Bu ay · N ədəd" hint).
- **Computation** via `computeOrderKpis(orders)` in `orderHelpers.js`: excludes `cancelled` orders; uses `order.total` when present else `price × (quantity || 1)`; `today` = from local day-start, `week` = last 7×24h rolling, `month` = from 1st of current month; AOV = month total / month count; top product by total quantity sold this month.
- KPIs are computed from **ALL** orders, not the filtered set, so the business view stays honest regardless of filter state.
- i18n keys added under `dashboard.orders.kpis` in both `az.json` and `tr.json`.
- Verified: `kpiCards: 5`, height 96px, does not regress the sticky-right action column (still `firstBtnRight: 1321 ≤ vw: 1366` at desktop, `hasHorizScroll: false` at 390px mobile).

## What's still MOCK (deferred)
- Inbox messages (`MOCK_INBOX`)
- Leads pipeline (`MOCK_LEADS`)
- Orders (`MOCK_ORDERS`)
- Admin panel data (`mockData.js`)
- Instagram/WhatsApp channel connect (placeholder 202)
- Payment (`PAYMENT_ENABLED=false`)

## Prioritized backlog
- **P0**
  - Render deploy: add `MONGO_URL` + `GEMINI_API_KEY` in Render env UI before production AI use
  - Vercel deploy: set `VITE_API_URL` + `VITE_ENABLE_ADMIN_MOCK=false`
- **P1**
  - Real Instagram Graph API + WhatsApp Cloud API connect (per-bot channel auth)
  - Real admin backend: `/api/admin/*` routes + AdminContext hitting real endpoints
  - Real inbox (conversation storage + message ingestion from channels)
  - Real leads/orders pipeline
- **P2**
  - Payment: Stripe / Razorpay / Coinbase for subscription upgrade
  - Custom domains for storefront
  - File uploads (product images) via S3/Cloudinary
  - Admin usage log UI (the `AiUsageLog` schema is ready)

## Environment variables

### Backend
```
MONGO_URL=mongodb+srv://...          # required in prod
DB_NAME=ai_operator
PORT=10000
NODE_ENV=production
JWT_SECRET=<random 32+ bytes>        # required in prod, generateValue in render.yaml
JWT_EXPIRES_IN=30d
PAYMENT_ENABLED=false
TRIAL_MODE=true
PAYMENT_PROVIDER=mock
TRIAL_DAYS=14
CORS_ORIGINS=https://www.aioperator.social,https://aioperator.social
AI_ENABLED=true
GEMINI_API_KEY=<from Google AI Studio>   # set in Render UI, NEVER commit
AI_PRIMARY_MODEL=gemini-2.5-flash-lite
AI_FALLBACK_MODEL=gemini-2.5-flash
AI_MAX_OUTPUT_TOKENS=120
AI_TEMPERATURE=0.2
```

### Frontend (Vercel)
```
VITE_API_URL=https://<backend>.onrender.com    # required in prod
VITE_ENABLE_ADMIN_MOCK=false                   # production: mock admin OFF
VITE_DEFAULT_LOCALE=az
```

## API surface (current)
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
GET    /api/auth/plans
GET    /api/subscription
POST   /api/subscription/select-plan
GET    /api/bots
POST   /api/bots
PUT    /api/bots/:id
DELETE /api/bots/:id
POST   /api/bots/:id/connect/:channel          (placeholder 202)
POST   /api/bots/:id/test-message              (AI test simulator — customer perspective)
GET    /api/bots/:id/training
PUT    /api/bots/:id/training
GET    /api/bots/:id/coach-messages            (coach chat history)
POST   /api/bots/:id/coach-message             (seller trains bot, returns suggestion)
POST   /api/bots/:id/apply-coach-suggestion    (merge suggestion into training)
GET    /api/bot-groups
POST   /api/bot-groups
PUT    /api/bot-groups/:id
DELETE /api/bot-groups/:id
PUT    /api/bot-groups/:id/apply-training      (apply training to all bots in group)
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/activities
PUT    /api/me/store                            (update storeSlug + channels)
GET    /api/public/store/:slug                  (public storefront)
GET    /api/health
```
