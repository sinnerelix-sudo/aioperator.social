# AI Operator — Test Credentials

This is a fresh MVP. No seeded users yet; tests should register their own.

## Sample test user (created on-demand)

```
email:    qa.user+1@aioperator.local
password: Password123!
phone:    +994 50 111 22 33
plan:     combo
locale:   az
```

## Auth flow

- `POST /api/auth/register` returns `{ token, user, subscription }`. Subscription is auto-created (trial, active, paid status).
- `POST /api/auth/login` returns the same shape; if the user has no active subscription a trial one is auto-created on `GET /api/auth/me`.
- `GET /api/auth/me` requires `Authorization: Bearer <token>`.

## Plans / bot limits

- `instagram` 29.90 ₼ → 1 bot
- `whatsapp` 29.90 ₼ → 1 bot
- `combo` 39.90 ₼ → 1 bot
- `business` 99.90 ₼ → 5 bots

## Frontend routes

- `/az` and `/tr` are the only valid language prefixes; the root `/` redirects to `/az`.
- Landing → `/az`
- Pricing CTA → `/az/register?plan=<plan>`
- Login → `/az/login`
- Dashboard (auth required) → `/az/dashboard`

## Backend ports

- preview (FastAPI proxy → Node.js): `:8001`
- Render (Node.js direct): `:10000` (per render.yaml)
