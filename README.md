# AI Operator

Production-ready SaaS skeleton for **AI Operator** — an Instagram & WhatsApp AI sales operator platform.

## Stack

- **Frontend**: React 18 + Vite + Tailwind + i18next (AZ / TR)
- **Backend**: Node.js + Express + Mongoose (MongoDB)
- **Deploy**: Vercel (frontend) + Render (backend)

## Local development

```bash
# backend (Node.js + Express)
cd backend
cp .env.example .env
yarn install
yarn dev   # → http://localhost:9000

# frontend (Vite)
cd ../frontend
cp .env.example .env
yarn install
yarn dev   # → http://localhost:3000
```

For Vite to call the backend locally, set:

```
VITE_API_URL=http://localhost:9000
```

## Production deploy

### Backend (Render)

`render.yaml` is provided in the repo root. Connect the repo to Render and pick "Apply Blueprint".
Required runtime env vars (one-time setup):

- `MONGO_URL` — MongoDB Atlas connection string (sync: false in blueprint)
- everything else is set automatically by `render.yaml`

### Frontend (Vercel)

`frontend/vercel.json` configures the SPA rewrites and Vite build.
Required env vars:

- `VITE_API_URL=https://<your-render-backend>.onrender.com`

## Important runtime flags

```env
PAYMENT_ENABLED=false
TRIAL_MODE=true
PAYMENT_PROVIDER=mock
```

While `TRIAL_MODE=true`, every authenticated user gets an automatic trial subscription
on registration *and* on `GET /api/auth/me` if missing. The "Abunəlik tapılmadı" error
will never appear.

## i18n

Routes are namespaced by language:

- `/az` — Azerbaijani (default)
- `/tr` — Turkish

Translation files live in `frontend/src/locales/{az,tr}.json`.

## API summary

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
GET  /api/auth/plans

GET  /api/subscription
POST /api/subscription/select-plan

GET    /api/bots
POST   /api/bots
PUT    /api/bots/:id
DELETE /api/bots/:id
POST   /api/bots/:id/connect/:channel  (placeholder)

GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id

GET  /api/activities
GET  /api/health
```
