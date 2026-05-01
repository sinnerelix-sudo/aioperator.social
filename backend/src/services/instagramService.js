import { decryptToken } from './tokenCrypto.js';

/**
 * Minimal Instagram Messaging API send wrapper.
 *
 * Like the WhatsApp counterpart, this is a scaffold. Instagram DM sending
 * uses the Graph API with the seller's IG-business-account access token.
 * If credentials are missing, the function degrades gracefully.
 */
export async function sendInstagramMessage(connection, recipientId, text) {
  if (!connection || connection.platform !== 'instagram') {
    return { ok: false, error: 'invalid_connection' };
  }
  const igBusinessId = connection.instagramBusinessAccountId || connection.instagramPageId;
  const token = decryptToken(connection.accessTokenEncrypted);
  if (!igBusinessId || !token) {
    return { ok: false, error: 'missing_credentials' };
  }
  const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || 'v21.0';
  const url = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(igBusinessId)}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: String(text || '').slice(0, 1000) },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: 'api_error', status: res.status, body: body.slice(0, 500) };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: 'network_error', message: err.message };
  }
}
