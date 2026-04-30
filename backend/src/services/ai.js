import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

// Rough per-model $/1k tokens estimates (purely internal; shown only to admin
// technical logs — never to the seller). Values approximate public pricing.
const COST_TABLE = {
  'gemini-2.5-flash-lite': { in: 0.1 / 1000, out: 0.4 / 1000 },
  'gemini-2.5-flash': { in: 0.3 / 1000, out: 2.5 / 1000 },
  'gemini-2.5-pro': { in: 1.25 / 1000, out: 10 / 1000 },
};

// A word-ish heuristic for token counting. Keeping it simple — admin cost log
// only needs an approximation.
export function approxTokens(str) {
  if (!str) return 0;
  const words = String(str).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words * 1.3));
}

export function estimateCost(model, inputTokens, outputTokens) {
  const rate = COST_TABLE[model] || COST_TABLE['gemini-2.5-flash-lite'];
  return Number(((inputTokens * rate.in) + (outputTokens * rate.out)).toFixed(6));
}

function isAiConfigured() {
  return Boolean(config.aiEnabled && config.geminiApiKey);
}

function buildSystemPrompt(training, matchedProducts, languageHint) {
  const lang =
    training?.languageMode && training.languageMode !== 'auto'
      ? training.languageMode
      : languageHint || 'az';

  const languageInstruction =
    lang === 'tr'
      ? 'Müşteriye Türkçe cevap ver. Kısa, sıcak ve satış odaklı ol.'
      : 'Müştəriyə Azərbaycan dilində cavab ver. Qısa, səmimi və satışa yönəlik ol.';

  const parts = [
    `You are an AI sales assistant for an Instagram/WhatsApp store.`,
    languageInstruction,
    `Keep answers under 60 words. Do not use markdown, bullets, or code blocks.`,
    `Never invent products, prices, or stock. Only speak about the products given in context.`,
    `If no product context is provided or nothing matches, use the fallback message verbatim.`,
  ];

  if (training?.businessName) parts.push(`Business name: ${training.businessName}.`);
  if (training?.businessCategory) parts.push(`Category: ${training.businessCategory}.`);
  if (training?.toneOfVoice) parts.push(`Tone: ${training.toneOfVoice}.`);
  if (training?.greetingMessage) parts.push(`Preferred greeting: ${training.greetingMessage}`);
  if (training?.salesInstructions) parts.push(`Sales instructions: ${training.salesInstructions}`);
  if (training?.deliveryInfo) parts.push(`Delivery: ${training.deliveryInfo}`);
  if (training?.paymentInfo) parts.push(`Payment: ${training.paymentInfo}`);
  if (training?.returnPolicy) parts.push(`Return policy: ${training.returnPolicy}`);
  if (training?.discountRules) parts.push(`Discount rules: ${training.discountRules}`);
  if (typeof training?.maxDiscountPercent === 'number') {
    parts.push(`Maximum allowed discount: ${training.maxDiscountPercent}%. Never exceed this.`);
  }
  if (training?.forbiddenTopics) parts.push(`Do not discuss: ${training.forbiddenTopics}`);
  if (training?.handoffRules) parts.push(`Escalate to human operator when: ${training.handoffRules}`);
  if (training?.fallbackMessage) parts.push(`Fallback message: "${training.fallbackMessage}"`);

  if (Array.isArray(matchedProducts) && matchedProducts.length > 0) {
    parts.push(`\nProducts in context (use only these, do NOT mention others):`);
    matchedProducts.forEach((p, i) => {
      const price = p.discountPrice && p.discountPrice < p.price
        ? `${p.discountPrice} AZN (was ${p.price} AZN)`
        : `${p.price} AZN`;
      parts.push(
        `  ${i + 1}. ${p.name} — ${price}` +
          (p.stock > 0 ? `, in stock (${p.stock})` : `, out of stock`) +
          (p.category ? `, category: ${p.category}` : '') +
          (p.description ? `. ${String(p.description).slice(0, 240)}` : '')
      );
    });
  } else {
    parts.push(`\nNo matching products were found in the catalog. Reply with the fallback message.`);
  }

  return parts.join('\n');
}

function mockReply(message, matchedProducts, training) {
  if (!matchedProducts.length) {
    return (
      training?.fallbackMessage ||
      'Bu məhsulla bağlı dəqiq məlumat tapmadım. İstəsəniz operator sizi yönləndirə bilər.'
    );
  }
  const p = matchedProducts[0];
  const price = p.discountPrice && p.discountPrice < p.price
    ? `${p.discountPrice} ₼ (əvvəl ${p.price} ₼)`
    : `${p.price} ₼`;
  return `Salam! "${p.name}" hazırda ${price}-dir. İstəsəniz sifarişinizi indi qəbul edə bilərəm.`;
}

async function callGemini(modelName, systemPrompt, userMessage) {
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: config.aiTemperature,
      maxOutputTokens: config.aiMaxOutputTokens,
    },
  });
  const result = await model.generateContent(userMessage);
  const text = result?.response?.text?.() || '';
  return text.trim();
}

/**
 * Generate a sales reply. Signature stays stable across mock and real modes so
 * the route handler doesn't need to branch.
 */
export async function generateReply({ training, matchedProducts, userMessage, languageHint }) {
  const systemPrompt = buildSystemPrompt(training, matchedProducts, languageHint);

  if (!isAiConfigured()) {
    const reply = mockReply(userMessage, matchedProducts, training);
    return {
      reply,
      model: 'mock',
      mock: true,
      inputTokens: approxTokens(systemPrompt) + approxTokens(userMessage),
      outputTokens: approxTokens(reply),
    };
  }

  const primary = config.aiPrimaryModel;
  const fallback = config.aiFallbackModel;

  try {
    const reply = await callGemini(primary, systemPrompt, userMessage);
    if (!reply) throw new Error('empty_primary_response');
    return {
      reply,
      model: primary,
      mock: false,
      inputTokens: approxTokens(systemPrompt) + approxTokens(userMessage),
      outputTokens: approxTokens(reply),
    };
  } catch (errPrimary) {
    console.warn(`[ai] primary ${primary} failed:`, errPrimary?.message || errPrimary);
    if (!fallback || fallback === primary) {
      // No fallback — degrade to mock rather than crash the request.
      const reply = mockReply(userMessage, matchedProducts, training);
      return {
        reply,
        model: 'mock',
        mock: true,
        inputTokens: approxTokens(systemPrompt) + approxTokens(userMessage),
        outputTokens: approxTokens(reply),
      };
    }
    try {
      const reply = await callGemini(fallback, systemPrompt, userMessage);
      if (!reply) throw new Error('empty_fallback_response');
      return {
        reply,
        model: fallback,
        mock: false,
        inputTokens: approxTokens(systemPrompt) + approxTokens(userMessage),
        outputTokens: approxTokens(reply),
      };
    } catch (errFallback) {
      console.warn(`[ai] fallback ${fallback} failed:`, errFallback?.message || errFallback);
      const reply = mockReply(userMessage, matchedProducts, training);
      return {
        reply,
        model: 'mock',
        mock: true,
        inputTokens: approxTokens(systemPrompt) + approxTokens(userMessage),
        outputTokens: approxTokens(reply),
      };
    }
  }
}

export function aiConfigured() {
  return isAiConfigured();
}
