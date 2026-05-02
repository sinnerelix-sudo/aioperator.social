import { decryptToken } from './tokenCrypto.js';

/**
 * Send a direct message on Instagram on behalf of a connected seller.
 *
 * Endpoint:
 *   POST https://graph.instagram.com/{apiVersion}/{igAccountId}/messages
 *   Authorization: Bearer <long-lived IG access token>
 *   Body: { recipient: { id: <IGSID> }, message: { text } }
 *
 * The Instagram-Login / Business-Login product uses the
 * `graph.instagram.com` host (NOT `graph.facebook.com`) for the
 * connected IG-business account itself.
 *
 * SECURITY:
 *   - The access token is decrypted in-memory only and never logged.
 *   - On API error we return `status` and `errorCode` — the caller must
 *     NOT log the raw request body or the access token.
 */
export async function sendInstagramMessage(connection, recipientId, text) {
  if (!connection || connection.platform !== 'instagram') {
    return { ok: false, error: 'invalid_connection' };
  }

  // Prefer the IG-scoped ids written by the OAuth callback; fall back
  // through the mirrored generic id fields so we stay resilient to
  // whichever identifier the seller's account actually exposes.
  const igAccountId =
    connection.instagramBusinessAccountId ||
    connection.instagramUserId ||
    connection.platformAccountId ||
    connection.externalAccountId ||
    connection.accountId ||
    connection.instagramPageId ||
    '';

  const token = decryptToken(connection.accessTokenEncrypted);

  if (!igAccountId || !token) {
    return { ok: false, error: 'missing_credentials' };
  }
  if (!recipientId) {
    return { ok: false, error: 'missing_recipient' };
  }

  const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || 'v21.0';
  const url = `https://graph.instagram.com/${apiVersion}/${encodeURIComponent(igAccountId)}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: String(recipientId) },
        message: { text: String(text || '').slice(0, 1000) },
      }),
    });

    if (!res.ok) {
      let errorCode = '';
      try {
        const errJson = await res.json();
        errorCode = errJson?.error?.code ? String(errJson.error.code) : '';
      } catch { /* ignore parse error */ }
      return { ok: false, error: 'api_error', status: res.status, errorCode };
    }

    const data = await res.json();
    // Graph API returns `message_id` (canonical) and sometimes `recipient_id`.
    return {
      ok: true,
      messageId: data?.message_id ? String(data.message_id) : '',
    };
  } catch (err) {
    return { ok: false, error: 'network_error', message: err?.message || 'unknown' };
  }
}
