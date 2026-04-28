# AI Operator — Test Credentials

## Super Admin Panel (Mock — frontend-only)
Hidden URL: `/control-center-aio-2026`

```
Email:     admin@aioperator.social
Password:  AdminAIO2026!
2FA code:  482910
```

Session is stored in `sessionStorage` and expires after 60 minutes (mock). All admin pages redirect to login if session is missing.

## Seller (real backend auth)
Tests should register a fresh user each run.

```
Sample:
  email:    qa.seller+<rand>@aioperator.local
  password: Password123!
  phone:    +994 50 111 22 33
  plan:     combo  (or instagram/whatsapp/business)
```

## Auth flow
- `POST /api/auth/register` returns `{ token, user, subscription }`. Subscription is auto-created (trial, active, paid status).
- `POST /api/auth/login` returns the same shape; if the user has no active subscription a trial one is auto-created on `GET /api/auth/me`.
- `GET /api/auth/me` requires `Authorization: Bearer <token>`.

## Plans / bot limits / message limits
- `instagram` 29.90 ₼ → 1 bot, 1 channel, 10.000 msg/ay
- `whatsapp` 29.90 ₼ → 1 bot, 1 channel, 10.000 msg/ay
- `combo` 49.90 ₼ → 1 bot, 2 channels, 50.000 msg/ay
- `business` 99.90 ₼ → 5 bots, 5 channels, 150.000 msg/ay

## Frontend routes
- `/az` (default) and `/tr` — locale prefixes; `/` redirects to `/az`
- Landing → `/az`
- Pricing CTA → `/az/register?plan=<plan>`
- Login → `/az/login`
- Seller dashboard (auth required) → `/az/dashboard{,/bots,/bots/new,/training,/products,/inbox,/leads,/orders,/activity,/subscription,/settings}`
- Hidden admin → `/control-center-aio-2026` (login) → `/control-center-aio-2026/dashboard{,/customers,/customers/:id,/usage,/pricing,/security,/audit}`

## Mock data sources
- `/app/frontend/src/lib/mockData.js` — customers, leads, orders, inbox, audit logs, IP allowlist, sessions, failed logins, revenue/usage timelines
- Per-seller usage chart deterministically derived from user id via `mockUsageForUser(userId, plan)` in `/app/frontend/src/lib/utils.js`

## Backend ports
- preview (FastAPI proxy → Node.js): `:8001`
- Render (Node.js direct): `:10000` (per render.yaml)
