// Lightweight product matcher. We deliberately avoid sending the full catalog
// to the LLM — we score products locally, keep the top 1-3, and only those go
// into the prompt. This keeps prompt tokens low and prevents the model from
// hallucinating products that don't exist.

const STOP_WORDS = new Set([
  've', 'və', 'ile', 'ilə', 'var', 'nə', 'ne', 'salam', 'merhaba',
  'bir', 'bu', 'şu', 'həmin', 'mən', 'men', 'sən', 'sen', 'siz',
  'necə', 'nece', 'nasıl', 'qiyməti', 'qiymeti', 'fiyatı', 'fiyati',
  'nədir', 'nedir', 'nedi', 'for', 'the', 'and', 'with', 'for',
  'olar', 'olarmı', 'varmı', 'kimi', 'çox', 'cox', 'az', 'nə',
]);

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str) {
  return normalize(str)
    .split(' ')
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function scoreProduct(product, messageTokens) {
  if (!messageTokens.length) return 0;
  const haystack = [
    product.name,
    product.category,
    product.description,
    product.salesNote,
  ]
    .filter(Boolean)
    .map(normalize)
    .join(' ');

  if (!haystack) return 0;

  let score = 0;
  for (const tok of messageTokens) {
    if (haystack.includes(tok)) {
      // Name hits weigh more than description hits.
      if (normalize(product.name).includes(tok)) score += 3;
      else if (normalize(product.category).includes(tok)) score += 2;
      else score += 1;
    }
  }
  // Small preference for active + in-stock products.
  if (product.status === 'active') score += 0.5;
  if ((product.stock || 0) > 0) score += 0.25;
  return score;
}

/**
 * Return the top-N matching products for a given message, or an empty array
 * when nothing scores above zero. Caller decides what to do with an empty
 * result (usually: fall back to a "I couldn't find this product" reply).
 */
export function matchProducts(message, products, limit = 3) {
  const tokens = tokenize(message);
  if (!tokens.length || !Array.isArray(products) || !products.length) return [];

  const scored = products
    .map((p) => ({ product: p, score: scoreProduct(p, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.product);

  return scored;
}
