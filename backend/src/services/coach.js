import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { approxTokens } from './ai.js';

// Fields the coach is allowed to emit. Anything outside this allowlist gets
// dropped before saving, so a buggy/hallucinating model can't sneak bad keys
// into BotTraining.
const ALLOWED_FIELDS = new Set([
  'salesInstructions',
  'discountRules',
  'maxDiscountPercent',
  'deliveryInfo',
  'paymentInfo',
  'returnPolicy',
  'forbiddenTopics',
  'handoffRules',
  'greetingMessage',
  'toneOfVoice',
  'fallbackMessage',
]);

const ALLOWED_TONES = new Set(['friendly', 'formal', 'playful', 'expert']);

export function sanitiseUpdate(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (v === null || v === undefined || v === '') continue;
    if (k === 'maxDiscountPercent') {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n <= 100) clean[k] = Math.round(n);
      continue;
    }
    if (k === 'toneOfVoice') {
      if (ALLOWED_TONES.has(v)) clean[k] = v;
      continue;
    }
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) continue;
    clean[k] = trimmed;
  }
  return clean;
}

function norm(s) {
  return String(s || '').toLowerCase();
}

// Heuristic extractor used when Gemini is not configured, and also as a safety
// net when the model returns invalid/empty JSON. Deliberately conservative:
// only produces an update when we're confident the seller is giving a rule.
function mockCoach(message) {
  const m = norm(message);
  const update = {};
  const hits = [];

  if ((/\b(qısa|kısa|short)\b/.test(m) || /(uzun|long).{0,12}(vermə|verme|don.?t)/.test(m)) &&
      /(qiymət|qiymeti|fiyat|price)/.test(m)) {
    update.salesInstructions = 'Qiymət soruşulduqda qısa cavab ver və müştərini sifarişə yönləndir.';
    hits.push('qısa qiymət cavabı');
  }
  const pctMatch = m.match(/(\d{1,2})\s?%/);
  if (pctMatch && /(endirim|indirim|discount)/.test(m)) {
    const n = Math.min(100, parseInt(pctMatch[1], 10));
    update.maxDiscountPercent = n;
    update.discountRules = `Maksimum ${n}% endirim ver. Bundan artıq endirim təklif etmə.`;
    hits.push(`endirim maks. ${n}%`);
  }
  if (/(narazı|memnuniyetsiz|şikayət|sikayet|complaint|problem)/.test(m) &&
      /(operator|yönlend|yonlend|devret|escalat)/.test(m)) {
    update.handoffRules =
      'Narazı müştəri, şikayət, ödəniş problemi və ya qaytarma halında dərhal insan operatora yönləndir.';
    hits.push('narazı müştəri → operator');
  }
  if (/(sifariş|sipariş|order)/.test(m) && /(ad|isim|name|nömrə|numara|number|telefon)/.test(m)) {
    update.salesInstructions = (update.salesInstructions ? update.salesInstructions + ' ' : '') +
      'Sifariş üçün müştəridən ad və telefon nömrəsi iste.';
    hits.push('sifariş üçün ad + nömrə');
  }
  if (/(çatdırılma|catdirilma|kargo|teslimat|delivery)/.test(m)) {
    update.deliveryInfo = 'Bakı içi 24 saat, regionlar 1-3 gün. Çatdırılma qiymətini müştəriyə bildir.';
    hits.push('çatdırılma məlumatı');
  }
  if (/(siyasət|siyaset|din|politika|religion|rəqib|rakip|competitor)/.test(m) &&
      /(danışma|cavab verme|konuşma|söyleme|avoid|don.?t)/.test(m)) {
    update.forbiddenTopics =
      'Siyasət, din və rəqib brendlər haqqında danışma. Söhbəti nəzakətlə məhsula qaytarmağa çalış.';
    hits.push('qadağan mövzular');
  }

  const reply = Object.keys(update).length
    ? `Başa düşdüm. Bundan sonra ${hits.join(', ')} qaydasına uyğun davranacağam.`
    : 'Mesajı qeydə aldım. Əgər bunu bot təlimatına əlavə etmək istəyirsinizsə, daha konkret qayda yazın — məsələn: "Qiymət soruşulduqda qısa cavab ver".';

  return { reply, update };
}

const COACH_SYSTEM_PROMPT = `You are an AI coach that helps a seller train their sales bot for an Instagram/WhatsApp store.

The seller will write you an instruction in Azerbaijani or Turkish describing how the bot should behave. You must:
1. Respond in the SAME language as the seller, in 1-2 short sentences, confirming what you understood.
2. Extract a structured training update. Only include fields you are confident the seller wants to set. Leave unrelated fields out.

Return ONLY a single JSON object (no markdown, no commentary) with this exact shape:
{
  "reply": "<your short confirmation>",
  "update": {
    "salesInstructions"?: string,
    "discountRules"?: string,
    "maxDiscountPercent"?: number (0-100),
    "deliveryInfo"?: string,
    "paymentInfo"?: string,
    "returnPolicy"?: string,
    "forbiddenTopics"?: string,
    "handoffRules"?: string,
    "greetingMessage"?: string,
    "toneOfVoice"?: "friendly" | "formal" | "playful" | "expert",
    "fallbackMessage"?: string
  }
}

If the seller's message is vague or not a training rule, return an empty "update" object and ask for clarification in the reply.
Never return fields outside the schema. Never wrap the JSON in code fences.`;

function parseJsonSafe(text) {
  if (!text) return null;
  const t = text.trim().replace(/^```json\s*|^```\s*|\s*```$/g, '');
  try {
    return JSON.parse(t);
  } catch (_e) {
    // Try to locate the first { .. } block
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch (_e2) {
      return null;
    }
  }
}

async function callGeminiJson(modelName, userMessage) {
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: COACH_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 400,
      responseMimeType: 'application/json',
    },
  });
  const result = await model.generateContent(userMessage);
  const text = result?.response?.text?.() || '';
  return parseJsonSafe(text);
}

function isAiConfigured() {
  return Boolean(config.aiEnabled && config.geminiApiKey);
}

/**
 * Generate a coach reply + structured training update from a seller message.
 * Always resolves — any AI failure falls back to the heuristic extractor.
 */
export async function generateCoachReply({ sellerMessage }) {
  if (!isAiConfigured()) {
    const { reply, update } = mockCoach(sellerMessage);
    return {
      reply,
      suggestedTrainingUpdate: sanitiseUpdate(update),
      model: 'mock',
      mock: true,
      inputTokens: approxTokens(COACH_SYSTEM_PROMPT) + approxTokens(sellerMessage),
      outputTokens: approxTokens(reply),
    };
  }

  const primary = config.aiPrimaryModel;
  const fallback = config.aiFallbackModel;

  for (const modelName of [primary, fallback].filter(Boolean)) {
    try {
      const parsed = await callGeminiJson(modelName, sellerMessage);
      if (!parsed || typeof parsed.reply !== 'string' || parsed.reply.trim().length === 0) {
        throw new Error('invalid_coach_json');
      }
      const update = sanitiseUpdate(parsed.update || {});
      return {
        reply: parsed.reply.trim(),
        suggestedTrainingUpdate: update,
        model: modelName,
        mock: false,
        inputTokens: approxTokens(COACH_SYSTEM_PROMPT) + approxTokens(sellerMessage),
        outputTokens: approxTokens(parsed.reply),
      };
    } catch (err) {
      console.warn(`[coach] ${modelName} failed:`, err?.message || err);
    }
  }

  // All models failed — degrade to heuristic.
  const { reply, update } = mockCoach(sellerMessage);
  return {
    reply,
    suggestedTrainingUpdate: sanitiseUpdate(update),
    model: 'mock',
    mock: true,
    inputTokens: approxTokens(COACH_SYSTEM_PROMPT) + approxTokens(sellerMessage),
    outputTokens: approxTokens(reply),
  };
}

/**
 * Merge a suggested update into an existing BotTraining document. Text fields
 * are APPENDED (so the seller can layer multiple rules) while numeric/enum
 * fields replace the previous value.
 */
export function mergeTraining(existing, update) {
  const next = existing ? { ...existing } : {};
  const APPEND_FIELDS = [
    'salesInstructions',
    'discountRules',
    'deliveryInfo',
    'paymentInfo',
    'returnPolicy',
    'forbiddenTopics',
    'handoffRules',
    'greetingMessage',
    'fallbackMessage',
  ];
  for (const [k, v] of Object.entries(update)) {
    if (k === 'maxDiscountPercent' || k === 'toneOfVoice') {
      next[k] = v;
      continue;
    }
    if (APPEND_FIELDS.includes(k)) {
      const prev = (next[k] || '').trim();
      // Avoid duplicate lines.
      if (prev && prev.toLowerCase().includes(String(v).trim().toLowerCase())) continue;
      next[k] = prev ? `${prev}\n${v}` : v;
    }
  }
  return next;
}
