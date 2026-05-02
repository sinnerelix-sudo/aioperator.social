import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Product } from '../models/Product.js';
import { BotTraining } from '../models/BotTraining.js';
import { PlatformConnection } from '../models/PlatformConnection.js';
import { generateReply } from './ai.js';
import { matchProducts } from './productMatcher.js';
import { sendInstagramMessage } from './instagramService.js';
import { config } from '../config.js';

/**
 * Bot auto-reply for inbound Instagram DMs.
 *
 * Responsibilities:
 *   - Decide whether the bot should reply based on handoffMode / botPaused / converted state.
 *   - Enforce idempotency keyed on the inbound externalMessageId so webhook retries never
 *     produce duplicate bot replies.
 *   - Build language hint from training + last inbound text.
 *   - Call the existing generateReply() Gemini service.
 *   - Persist an outbound bot Message and send via the existing sendInstagramMessage() service.
 *
 * SECURITY: never log tokens, api keys, prompts, message text, or full payloads.
 */

// Very small TR vs AZ hint. If unsure, falls through to the training languageMode or 'az'.
function detectLanguageHint(text, training) {
  const mode = training?.languageMode;
  if (mode === 'az' || mode === 'tr') return mode;
  const t = String(text || '').toLowerCase();
  if (!t) return 'az';
  // Characters / words strongly Turkish (not in AZ alphabet): ş(shared), ı(shared), ç(shared)...
  // AZ has ə, ğ (shared), ı, ç, ş, ö, ü. Turkish lacks ə. Use ə as a strong AZ signal.
  if (/ə/.test(t)) return 'az';
  // Common Turkish-only tokens.
  if (/\b(merhaba|nasılsın|nasilsin|teşekkür|tesekkur|fiyat|fiyatı|kaç|kac|var mı|var mi|nasıl|nasil)\b/.test(t)) {
    return 'tr';
  }
  // Common Azerbaijani tokens (no ə but still AZ-ish).
  if (/\b(salam|necəsən|nece|qiymət|qiymeti|qiymet|necedi|çatdirilma|catdirilma|çatdırılma)\b/.test(t)) {
    return 'az';
  }
  return 'az';
}

function shouldSkipByHandoff(conversation) {
  if (!conversation) return { skip: true, reason: 'no_conversation' };
  if (conversation.convertedToOrder) return { skip: true, reason: 'converted_to_order' };
  if (conversation.botPaused) return { skip: true, reason: 'bot_paused' };

  const mode = conversation.handoffMode || 'bot_only';
  if (mode === 'human_only') return { skip: true, reason: 'human_only' };
  if (mode === 'human_only_until') {
    const until = conversation.handoffUntil ? new Date(conversation.handoffUntil).getTime() : 0;
    if (until && until > Date.now()) return { skip: true, reason: 'human_only_until_active' };
  }
  // bot_only, human_and_bot, bot_only_until => allowed
  return { skip: false };
}

/**
 * Main entry point. Safe to call from the webhook handler — never throws.
 *
 * @param {object}   opts
 * @param {object}   opts.conversation       Conversation mongoose doc.
 * @param {object}   opts.connection         PlatformConnection mongoose doc (instagram).
 * @param {object}   opts.inboundMessage     The just-persisted inbound Message doc.
 */
export async function generateBotReplyForConversation({ conversation, connection, inboundMessage }) {
  const convId = conversation?._id;
  const inboundId = inboundMessage?._id;
  const platform = conversation?.platform || '';

  try {
    // Basic guards.
    if (!conversation || !inboundMessage) {
      console.warn('[bot-auto-reply] skipped', { reason: 'missing_args' });
      return;
    }
    if (platform !== 'instagram') {
      // This path is currently IG-only per product scope.
      console.warn('[bot-auto-reply] skipped', { reason: 'non_instagram_platform', conversationId: convId });
      return;
    }
    if (inboundMessage.direction !== 'inbound' || inboundMessage.senderType !== 'customer') {
      console.warn('[bot-auto-reply] skipped', {
        reason: 'not_customer_inbound',
        conversationId: convId,
      });
      return;
    }
    if (!inboundMessage.text || !String(inboundMessage.text).trim()) {
      console.warn('[bot-auto-reply] skipped', { reason: 'empty_text', conversationId: convId });
      return;
    }

    const handoffCheck = shouldSkipByHandoff(conversation);
    if (handoffCheck.skip) {
      console.warn('[bot-auto-reply] skipped', { reason: handoffCheck.reason, conversationId: convId });
      return;
    }

    // Idempotency: refuse to answer the same inbound externalMessageId twice.
    const inboundExtId = inboundMessage.externalMessageId || '';
    if (inboundExtId) {
      const prior = await Message.findOne({
        conversationId: conversation._id,
        senderType: 'bot',
        direction: 'outbound',
        'metadata.replyToExternalMessageId': inboundExtId,
      });
      if (prior) {
        console.warn('[bot-auto-reply] skipped', {
          reason: 'duplicate_reply_for_inbound',
          conversationId: convId,
        });
        return;
      }
    } else {
      // Fall back to replyToMessageId when no external id is available.
      const prior = await Message.findOne({
        conversationId: conversation._id,
        senderType: 'bot',
        direction: 'outbound',
        'metadata.replyToMessageId': inboundMessage._id,
      });
      if (prior) {
        console.warn('[bot-auto-reply] skipped', {
          reason: 'duplicate_reply_for_inbound_internal',
          conversationId: convId,
        });
        return;
      }
    }

    // ENV checks (fail gracefully, never crash). generateReply() itself falls back to a
    // mock reply when the Gemini key is missing, but we still want to surface a clear skip
    // log when the seller has explicitly disabled AI.
    if (!config.aiEnabled) {
      console.warn('[bot-auto-reply] skipped', { reason: 'ai_disabled', conversationId: convId });
      return;
    }

    // Load training + catalogue + connection. Training may be null for brand-new bots.
    const [training, allProducts] = await Promise.all([
      BotTraining.findOne({ botId: conversation.botId }),
      Product.find({
        userId: conversation.userId,
        $or: [{ botId: conversation.botId }, { botId: null }, { botId: '' }],
      }),
    ]);

    const trainingPublic = training ? training.toPublic() : null;
    const languageHint = detectLanguageHint(inboundMessage.text, trainingPublic);
    const matched = matchProducts(
      inboundMessage.text,
      allProducts.map((p) => p.toPublic()),
      3
    );

    console.log('[bot-auto-reply] start', {
      conversationId: convId,
      messageId: inboundId,
      platform,
    });

    const ai = await generateReply({
      training: trainingPublic,
      matchedProducts: matched,
      userMessage: inboundMessage.text,
      languageHint,
    });

    const replyText = String(ai?.reply || '').trim();
    if (!replyText) {
      console.warn('[bot-auto-reply] failed', {
        conversationId: convId,
        errorCode: 'empty_reply',
        error: 'empty_reply',
      });
      return;
    }

    // Persist outbound bot message in pre-send state so the DB record always exists.
    const botMessage = await Message.create({
      userId: conversation.userId,
      botId: conversation.botId,
      conversationId: conversation._id,
      platform: conversation.platform,
      direction: 'outbound',
      senderType: 'bot',
      text: replyText,
      messageType: 'text',
      status: 'received', // pre-send placeholder; updated below
      aiGenerated: !ai.mock,
      metadata: {
        source: 'bot_auto_reply',
        model: ai?.model || '',
        mock: Boolean(ai?.mock),
        replyToMessageId: inboundMessage._id,
        replyToExternalMessageId: inboundExtId || '',
      },
    });

    // Re-use the connection we already have. Make sure we still have a live connection.
    let conn = connection;
    if (!conn) {
      conn = await PlatformConnection.findOne({
        userId: conversation.userId,
        botId: conversation.botId,
        platform: 'instagram',
        status: 'connected',
      });
    }

    if (!conn) {
      botMessage.status = 'failed';
      botMessage.metadata = { ...botMessage.metadata, sendError: 'no_connection' };
      await botMessage.save();
      console.warn('[bot-auto-reply] failed', {
        conversationId: convId,
        errorCode: 'no_connection',
        error: 'no_connection',
      });
      return;
    }

    const recipientId = conversation.customerExternalId;
    const result = await sendInstagramMessage(conn, recipientId, replyText);

    if (result?.ok) {
      botMessage.status = 'sent';
      if (result.messageId) botMessage.externalMessageId = result.messageId;
      botMessage.metadata = { ...botMessage.metadata, source: 'bot_auto_reply' };
      await botMessage.save();

      // Update conversation lastMessage* — do NOT bump seller unreadCount (it's our own reply).
      try {
        await Conversation.updateOne(
          { _id: conversation._id },
          {
            $set: {
              lastMessageText: replyText,
              lastMessageAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
      } catch (convErr) {
        console.warn('[bot-auto-reply] conversation update failed', {
          conversationId: convId,
          errorCode: 'conv_update_failed',
          error: convErr?.message || 'unknown',
        });
      }

      console.log('[bot-auto-reply] sent', {
        conversationId: convId,
        botMessageId: botMessage._id,
        instagramMessageId: result.messageId || '',
      });
      return;
    }

    // Send failed — record failure, don't retry here (Meta will not retry our webhook if we already 200'd).
    botMessage.status = 'failed';
    botMessage.metadata = {
      ...botMessage.metadata,
      sendError: result?.error || 'send_failed',
      sendStatus: result?.status || 0,
      sendErrorCode: result?.errorCode || '',
    };
    await botMessage.save();

    console.warn('[bot-auto-reply] failed', {
      conversationId: convId,
      errorCode: result?.errorCode || result?.error || 'send_failed',
      error: result?.error || 'send_failed',
    });
  } catch (err) {
    // Absolutely never throw out of here — the webhook must keep returning 200.
    console.warn('[bot-auto-reply] failed', {
      conversationId: convId,
      errorCode: 'unhandled',
      error: err?.message || 'unknown',
    });
  }
}
