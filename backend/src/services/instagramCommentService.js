import { decryptToken } from './tokenCrypto.js';

/**
 * Instagram comment-related outbound calls.
 *
 *  - replyToInstagramComment() — public reply under the customer's comment.
 *  - sendInstagramPrivateReplyToComment() — private DM to the commenter,
 *    sent as a "private_replies" message using the comment_id as recipient.
 *
 * Host: graph.instagram.com (same as the DM send path; we're using the
 * Instagram-Login / Business-Login product).
 *
 * SECURITY: tokens are decrypted in-memory and never logged. On API error we
 * return only `status` + short `errorCode`. Callers must never log the raw
 * request body, the token, or the raw error response body.
 */

function resolveIgAccountId(connection) {
  return (
    connection?.instagramBusinessAccountId ||
    connection?.instagramUserId ||
    connection?.platformAccountId ||
    connection?.externalAccountId ||
    connection?.accountId ||
    connection?.instagramPageId ||
    ''
  );
}

function apiVersion() {
  return process.env.INSTAGRAM_GRAPH_API_VERSION || 'v21.0';
}

async function safeParseErrorCode(res) {
  try {
    const errJson = await res.json();
    return errJson?.error?.code ? String(errJson.error.code) : '';
  } catch {
    return '';
  }
}

/**
 * Public reply to an Instagram comment.
 *
 *   POST https://graph.instagram.com/{v}/{comment-id}/replies
 *   Body: { message: "<text>" }
 */
export async function replyToInstagramComment(connection, commentId, text) {
  if (!connection || connection.platform !== 'instagram') {
    return { ok: false, error: 'invalid_connection' };
  }
  const token = decryptToken(connection.accessTokenEncrypted);
  if (!token) return { ok: false, error: 'missing_credentials' };
  if (!commentId) return { ok: false, error: 'missing_comment_id' };
  const message = String(text || '').slice(0, 1000);
  if (!message) return { ok: false, error: 'empty_text' };

  const url = `https://graph.instagram.com/${apiVersion()}/${encodeURIComponent(commentId)}/replies`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const errorCode = await safeParseErrorCode(res);
      return { ok: false, error: 'api_error', status: res.status, errorCode };
    }
    const data = await res.json();
    return { ok: true, replyId: data?.id ? String(data.id) : '' };
  } catch (err) {
    return { ok: false, error: 'network_error', message: err?.message || 'unknown' };
  }
}

/**
 * Private reply (DM) to the commenter of a specific comment.
 *
 *   POST https://graph.instagram.com/{v}/{ig-account-id}/messages
 *   Body: { recipient: { comment_id }, message: { text } }
 *
 * Instagram only allows private replies within 7 days of the comment.
 */
export async function sendInstagramPrivateReplyToComment(connection, commentId, text) {
  if (!connection || connection.platform !== 'instagram') {
    return { ok: false, error: 'invalid_connection' };
  }
  const igAccountId = resolveIgAccountId(connection);
  const token = decryptToken(connection.accessTokenEncrypted);
  if (!igAccountId || !token) return { ok: false, error: 'missing_credentials' };
  if (!commentId) return { ok: false, error: 'missing_comment_id' };
  const safeText = String(text || '').slice(0, 1000);
  if (!safeText) return { ok: false, error: 'empty_text' };

  const url = `https://graph.instagram.com/${apiVersion()}/${encodeURIComponent(igAccountId)}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { comment_id: String(commentId) },
        message: { text: safeText },
      }),
    });
    if (!res.ok) {
      const errorCode = await safeParseErrorCode(res);
      return { ok: false, error: 'api_error', status: res.status, errorCode };
    }
    const data = await res.json();
    return { ok: true, messageId: data?.message_id ? String(data.message_id) : '' };
  } catch (err) {
    return { ok: false, error: 'network_error', message: err?.message || 'unknown' };
  }
}
