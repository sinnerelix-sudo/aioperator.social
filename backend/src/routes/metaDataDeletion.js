import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PlatformConnection } from '../models/PlatformConnection.js';

/**
 * Meta / Facebook "Data Deletion Callback" endpoint.
 *
 * Meta calls this URL when a user removes the AI Operator app from their
 * Facebook / Instagram account and requests deletion of their data.
 *
 * Spec: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Wire the URL in Meta App Dashboard:
 *   App Settings → Basic → "Data Deletion Callback URL"
 *   →  https://aioperator.social/api/meta/data-deletion
 *
 * SECURITY: we never log the app secret, the full signed_request,
 * the access token, or the message body content. Only minimal status
 * markers and the public confirmation_code.
 */
const router = Router();

/** Base64-URL → Buffer (Meta uses URL-safe base64 without padding). */
function b64urlDecode(input) {
  const norm = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm.length % 4 === 0 ? '' : '='.repeat(4 - (norm.length % 4));
  return Buffer.from(norm + pad, 'base64');
}

/**
 * Verify Meta's `signed_request` per its documented HMAC-SHA256 scheme:
 *   parts = signed_request.split('.')
 *   sig = base64url-decode(parts[0])
 *   payload = base64url-decode(parts[1])
 *   expected = HMAC_SHA256(parts[1], appSecret)   // hashed over the RAW base64url string
 *   if timing-safe-equal(sig, expected) → JSON.parse(payload)
 *
 * Returns the parsed payload object on success, or null on any failure.
 * Never throws.
 */
function verifySignedRequest(signedRequest, appSecret) {
  try {
    if (!signedRequest || typeof signedRequest !== 'string' || !appSecret) return null;
    const parts = signedRequest.split('.');
    if (parts.length !== 2) return null;
    const [encodedSig, encodedPayload] = parts;
    const sig = b64urlDecode(encodedSig);
    const expected = crypto.createHmac('sha256', appSecret).update(encodedPayload).digest();
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(sig, expected)) return null;
    const payload = JSON.parse(b64urlDecode(encodedPayload).toString('utf8'));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

const DELETION_PAGE_URL = 'https://aioperator.social/data-deletion';

router.get('/data-deletion', (_req, res) => {
  return res.json({ ok: true, message: 'Meta data deletion callback endpoint' });
});

router.post('/data-deletion', async (req, res) => {
  const confirmationCode = uuidv4().replace(/-/g, '').slice(0, 20);
  const url = `${DELETION_PAGE_URL}?code=${confirmationCode}`;

  // Meta sends form-encoded body: signed_request=<value>
  const signedRequest = req.body?.signed_request || req.query?.signed_request;
  if (!signedRequest) {
    console.warn('[meta-data-deletion] missing signed_request', { code: confirmationCode });
    // Still respond 200 with the required JSON shape so Meta's validator
    // doesn't reject us during dashboard URL configuration.
    return res.status(200).json({ url, confirmation_code: confirmationCode });
  }

  const appSecret = process.env.META_APP_SECRET || '';
  const payload = verifySignedRequest(signedRequest, appSecret);

  if (!payload) {
    console.warn('[meta-data-deletion] signature_invalid_or_no_secret', { code: confirmationCode });
    return res.status(200).json({ url, confirmation_code: confirmationCode });
  }

  // Per Meta docs, the deletion payload contains `user_id` (app-scoped IGSID/PSID).
  const externalUserId = String(payload.user_id || '').trim();

  try {
    if (externalUserId) {
      // Best-effort: revoke any PlatformConnection that referenced this external user
      // and clear its encrypted token so the connection can no longer be used.
      const filter = {
        $or: [
          { instagramBusinessAccountId: externalUserId },
          { instagramPageId: externalUserId },
          { whatsappPhoneNumberId: externalUserId },
        ],
      };
      const matches = await PlatformConnection.find(filter);
      let revokedCount = 0;
      for (const conn of matches) {
        conn.status = 'disabled';
        conn.accessTokenEncrypted = '';
        conn.accessTokenRef = '';
        conn.tokenExpiresAt = null;
        await conn.save();
        revokedCount += 1;
      }
      console.log('[meta-data-deletion] processed', { code: confirmationCode, revokedCount });
    } else {
      console.log('[meta-data-deletion] processed_no_user_id', { code: confirmationCode });
    }
  } catch (err) {
    // Never leak token/secret/payload — only error name + message.
    console.error('[meta-data-deletion] revoke_error', { code: confirmationCode, err: err?.message || 'unknown' });
  }

  return res.status(200).json({ url, confirmation_code: confirmationCode });
});

export default router;
