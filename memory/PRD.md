## Jan 2026 — Instagram DM Bot Auto-Reply (P0 delivered)
- **Problem:** Real Instagram inbound DMs reached the webhook + DB + Inbox UI, but the bot never auto-replied.
- **Root cause:** The IG webhook handler only persisted inbound messages. There was no hook to generate a bot reply or call `sendInstagramMessage` for bot-originated messages.
- **Fix:**
  - New service `backend/src/services/botAutoReply.js` → `generateBotReplyForConversation()`.
  - Uses existing `generateReply()` (Gemini via `@google/generative-ai`) + `matchProducts()` + `BotTraining` + `Product` catalogue.
  - Sends via existing `sendInstagramMessage()` — no new send logic.
  - Wired from `backend/src/routes/webhooks.js` IG handler, fire-and-forget after inbound persist.
- **Handoff rules:**
  - Bot REPLIES when `handoffMode ∈ { bot_only, human_and_bot, bot_only_until }`.
  - Bot SKIPS when `human_only`, or `human_only_until` (unexpired), or `botPaused=true`, or `convertedToOrder=true`, or inbound message empty/echo/non-customer.
- **Idempotency:** bot reply keyed by `metadata.replyToExternalMessageId` = inbound Message `externalMessageId`; webhook retries cannot duplicate.
- **Logs (safe labels only, no tokens/keys/prompts/texts):** `[bot-auto-reply] start|skipped|sent|failed`.
- **ENV used:** `GEMINI_API_KEY`, `AI_PRIMARY_MODEL`, `AI_FALLBACK_MODEL`, `INSTAGRAM_GRAPH_API_VERSION`, `TOKEN_ENCRYPTION_SECRET`. Missing env → safe skip, server keeps running.
- **Files changed:**
  - `backend/src/services/botAutoReply.js` (new)
  - `backend/src/routes/webhooks.js` (wire-up only; no logic change to GET verify / WA handler / IG connection lookup)


# AI Operator — PRD

## Problem Statement
AI satış operatoru platforması. Instagram/WhatsApp mağazalar üçün AI bot, satıcı dashboard və admin paneli.

## Latest Session (Jan 2026)
Inbox UX + state logic hazırlığı. Meta/Instagram/WhatsApp real API qoşulmayıb — mock data ilə.

### Implemented (session)
- Platform contact mapping: Instagram → @username, WhatsApp → +994... (clickable, yeni tab)
- Avatar system: avatarUrl → <img> (onError fallback to initials) || initials
- HandoffModal: çox-addımlı, 'to-human' (inbox) və 'to-bot' (assigned) variantları
  - `human_only` / `human_only_until` / `human_and_bot` / `bot_only` / `bot_only_until` modes
  - Duration picker (saat/gün/ay)
- Assigned conversations page: `/dashboard/assigned-conversations` + sidebar item
- Shared `InboxContext` state provider (conversations, handoff, AI status, convert toggle, operator message send)
- Convert to order toggle (yaşıl "Sifarişə çevrildi" state)
- Conversation list-də yaşıl `ShoppingBag` icon (convertedToOrder === true)
- AI status filter chips: Hamısı, Qiymət soruşanlar, Şikayət, Təxirə salanlar, Cavablamayanlar, Təsdiqləyənlər, Mövzudan kənar
- Manual AI status change dropdown (chat header)
- Bot mode badge (Bot aktiv / Operator rejimi / Bot dayandırılıb / Bot + operator)
- Composer on assigned page (textarea + Enter = send; messages render with `operator` sender, emerald bubble)

## P0 Next
- Real Meta/Instagram Graph API + WhatsApp Cloud API integration (webhook, send/receive)
- Persist handoff state + conversations to backend (MongoDB)
- Scheduled job to auto-restore bot when `handoffUntil` passes

## P1
- Restore `previousMode` on `bot_only_until` expiry
- Infinite scroll / pagination for conversation list
- Typing indicators, read receipts

## Backlog
- AI-powered automatic `aiStatus` classification (currently manual + mock)
- Multi-operator support (assign conversation to specific operator)
