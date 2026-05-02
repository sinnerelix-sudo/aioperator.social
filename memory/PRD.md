## Jan 2026 — Leads API bot-echo exclusion fix (P0 bugfix)
- **Bug:** "Uğursuz reply" filter was showing the bot's own public-reply echo record (`@aioperator.social` — "Salam! Ətraflı məlumatı DM-də göndərdik 💬"). Loop-guard prevents NEW such records, but historical records (written before the fix) remained and some filter chips did not exclude them.
- **Fix in `backend/src/routes/leads.js`:**
  1. New `buildOwnReplyExcludeFilter(userId)` — builds a Mongo `$and` fragment that excludes ANY record matching:
     - `customerUsername` equals our `connection.instagramUsername` (case-insensitive) or the hard-coded handle `aioperator.social`
     - `customerExternalId` is in the set of our IG account id fields (`instagramBusinessAccountId | instagramUserId | instagramPageId | externalAccountId | platformAccountId | accountId`)
     - `text` matches the public-reply template regex (AZ/TR/RU/EN variants: "ətraflı məlumatı dm", "dm-də göndərdik", "dm'de gönderdik", "sent in dm", "отправили в dm", …)
     - `metadata.hiddenFromLeads === true`
  2. Applied identically to **every** leads endpoint: `GET /instagram-comments` (list), `GET /instagram-comments/stats` (KPIs), `GET /instagram-comments/:id` (detail). No filter chip (Hamısı / Yeni / …  / Uğursuz reply / search) can bypass it.
  3. Idempotent lazy backfill `backfillHiddenLeadsOnce(userId)` — runs once per process per seller on first hit; flags historical bot-reply records with `metadata.hiddenFromLeads: true`. Real customer comments are untouched (matched strictly by own-username / own-id / template-text regex).
- **Files:** `backend/src/routes/leads.js` only.
- **Untouched:** webhooks, comment auto-reply, loop guard, DM flow, OAuth, model schemas, frontend UI.


## Jan 2026 — Potential Customers (IG Comment Leads) UI + API
- **New backend routes** (`backend/src/routes/leads.js`, mounted at `/api/leads`, auth-protected):
  - `GET /api/leads/instagram-comments` — list with filters (`status|leadStatus`, `replyStatus`, `sourceType`, `dateFrom`, `dateTo`, `search`, `page`, `limit`). Safe projection: no tokens, no full payloads, no prompts.
  - `GET /api/leads/instagram-comments/stats` — KPI counters.
  - `GET /api/leads/instagram-comments/:id` — detail (full text included).
  - `PATCH /api/leads/instagram-comments/:id` — `{ leadStatus?, note? }` only. `leadStatus ∈ {new, viewed, contacted, converted, dismissed}`.
- **Model:** added `leadStatus` (default `new`, enum), `note` (max 2000), `permalink` to `InstagramComment` — other fields untouched. DM + comment + mention flows unmodified.
- **Frontend:** `pages/dashboard/LeadsPage.jsx` rewritten from mock kanban → real lead table/cards.
  - 4 KPI cards (new / public replied / private replied / converted).
  - Filter chips (Hamısı / Yeni / Baxıldı / Əlaqə / Sifariş / Ləğv / Uğursuz reply) + search (username, comment id, text).
  - Responsive: desktop table, mobile cards.
  - Row actions: detail, Instagram permalink, mark as converted.
  - Detail drawer: full comment text, public/private reply statuses + error labels, lead status pills, note textarea + save.
  - Opening a "new" lead auto-marks it as `viewed`.
- **API client:** `leadsApi` added to `frontend/src/lib/api.js`.
- **Untouched:** DM auto-reply, comment auto-reply, loop guard, mention handler, webhook handlers, OAuth, all other pages (Orders/Products/Training/Landing/Pricing/Inbox/Assigned), sidebar.


## Jan 2026 — Instagram Mention/Tag Lead Handling (P0 delivered)
- **New flow:** Instagram mention/tag webhook event → parsed → own-account / own-reply guard → `InstagramMention` persisted with `status: processed`, `replyStatus: not_attempted`. Default mode `lead_only` — NO automatic reply sent.
- **New files:**
  - `backend/src/models/InstagramMention.js` — separate collection (DM + comment flows untouched). Partial-unique on `externalMentionId`; composite-unique fallback on `{ externalMediaId, externalCommentId, sourceType, customerExternalId }` when no mention id is present.
  - `backend/src/services/mentionHandler.js` — `handleInstagramMentionChange()` + `parseMentionChange()` + exported `MENTION_FIELDS` set.
- **Webhook wiring:** `backend/src/routes/webhooks.js` `entry.changes` loop now dispatches by field name — `comments` → comment handler (unchanged), `mentions | tags | media_tags | comment_mentions | caption_mentions` → mention handler, everything else → safe `[ig-webhook] skipped { reason: unsupported_field }`.
- **Supported `sourceType`:** `caption_mention`, `comment_mention`, `tag`, `media_tag`, `unknown_mention` (auto-refined from payload shape).
- **Loop guard:** BEFORE DB write skip when `from.id` matches any of our IG id fields, `from.username === connection.instagramUsername`, or text contains one of our public-reply template markers.
- **Idempotency:** partial-unique `externalMentionId` + composite-unique fallback → E11000 on retry → `duplicate_mention` skip log.
- **Logs (safe):** `[ig-mention] received | saved | skipped | failed`. No tokens, no text, no prompts, no full payloads.
- **Meta Dashboard:** activate `mentions` (primary) and optionally `tags` under Webhooks → Instagram for the app.


## Jan 2026 — IG Comment Auto-Reply Loop Fix (P0 bugfix)
- **Bug:** Bot sent the same public reply 5x in a row. Instagram re-delivers our OWN public reply as a fresh `comments` webhook event with a new `commentId`; old guard (unique on `externalCommentId`) did not catch it, so bot kept replying to its own replies.
- **Fix in `services/commentAutoReply.js`:**
  1. **Own-comment detection moved BEFORE any DB write / Gemini call.** Checks `from.id` against all connection IG account id fields, `from.username === connection.instagramUsername`, text-template markers (`"DM-də göndərdik"`, `"DM'de gönderdik"`, `"sent in DM"`, `"отправили в DM"`, …), and `parent_id` referencing a comment we already replied to (`publicReplyExternalId` match).
  2. **Per-side idempotency guards** re-read `publicReplyStatus === 'sent'` / `privateReplyStatus === 'sent'` right before sending; if already sent → `skipped { reason: "already_public_replied" | "already_private_replied" }`.
  3. **Atomic claim via `findOneAndUpdate`** on `metadata.publicReplyClaimedAt` / `privateReplyClaimedAt` — parallel webhook races can no longer both send. Stale claims auto-release after 2 minutes.
- No changes to DM flow, operator reply, OAuth, UI, or other modules.
- Files changed: `backend/src/services/commentAutoReply.js` (rewrite, same exports).


## Jan 2026 — Instagram Post/Reel Comment Auto-Reply (P0 delivered)
- **New flow:** Customer comments on IG post/reel → Meta webhook `entry.changes[{ field:'comments' }]` → comment persisted → Gemini reply → public comment reply + private DM reply → status saved per side.
- **New files:**
  - `backend/src/models/InstagramComment.js` — separate collection (keeps DM `Conversation/Message` untouched). Unique key on `externalCommentId`.
  - `backend/src/services/instagramCommentService.js` — `replyToInstagramComment()` (public) + `sendInstagramPrivateReplyToComment()` (private replies). Uses existing `decryptToken` + `graph.instagram.com`.
  - `backend/src/services/commentAutoReply.js` — orchestrates parse → upsert → intent filter → Gemini (`generateReply` + `matchProducts`) → public+private send → status update.
- **Wired at:** `backend/src/routes/webhooks.js` IG POST handler; after the existing messaging loop a new `entry.changes` loop dispatches only `field === 'comments'` events (fire-and-forget after 200 to Meta).
- **Default mode:** `public_then_private` ("Salam, məlumatı DM-də göndərdik 💬" public + full Gemini answer as private reply).
- **Idempotency:** unique index on `externalCommentId`; duplicate webhook retries return `duplicate_comment` skip log and never re-send.
- **Language:** AZ / TR / RU / EN detection for the public reply; private reply goes through existing AZ/TR Gemini prompt.
- **Logs (safe only):** `[ig-comment] received | skipped | public-reply-sent | private-reply-sent | failed`. Never logs token, app secret, Gemini key, prompt, comment text, reply text, full payload, or full API body.
- **Explicitly untouched:** DM auto-reply, manual operator reply, OAuth, Orders/Products/Training/Landing/Pricing UI, Inbox/Assigned UI, WhatsApp, mention/tag, live_comments, data deletion callback.


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
