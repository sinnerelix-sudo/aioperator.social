import { decryptToken } from './tokenCrypto.js';

/**
 * Minimal WhatsApp Cloud API send wrapper.
 *
 * NOTE: This is a scaffold for the foundation milestone. It performs the
 * actual HTTPS call ONLY when the connection has all required credentials
 * (token + phoneNumberId). Otherwise it returns a controlled
 * `{ ok: false, error: 'missing_credentials' }` so callers can degrade
 * gracefully without crashing.
 *
 * Full production wiring (template messages, media, status callbacks) is
 * a follow-up task once the Meta App is approved + tokens are provisioned.
 */
export async function sendWhatsAppMessage(connection, to, text) {
  if (!connection || connection.platform !== 'whatsapp') {
    return { ok: false, error: 'invalid_connection' };
  }
  const phoneNumberId = connection.whatsappPhoneNumberId;
  const token = decryptToken(connection.accessTokenEncrypted);
  if (!phoneNumberId || !token) {
    return { ok: false, error: 'missing_credentials' };
  }
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';
  const url = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: String(text || '').slice(0, 4096) },
      }),
    });
    if (!res.ok) {
      // Don't leak token in logs; only the public response
      const body = await res.text();
      return { ok: false, error: 'api_error', status: res.status, body: body.slice(0, 500) };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: 'network_error', message: err.message };
  }
}
