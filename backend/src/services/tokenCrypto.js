import crypto from 'crypto';

/**
 * Symmetric AES-256-GCM encryption for sensitive secrets stored in the DB
 * (e.g. Meta long-lived access tokens). The key is derived from
 * `TOKEN_ENCRYPTION_SECRET` env var via SHA-256 so the operator can use
 * any random string of any length as the master secret.
 *
 * Output format is a single string: base64(iv) + ':' + base64(authTag) + ':' + base64(ciphertext).
 */

const ALGO = 'aes-256-gcm';

function getKey() {
  const secret = process.env.TOKEN_ENCRYPTION_SECRET || '';
  if (!secret) {
    // We refuse to silently skip encryption in production.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('TOKEN_ENCRYPTION_SECRET must be set in production');
    }
    // In dev, fall back to a deterministic dev-only key so things keep working.
    return crypto.createHash('sha256').update('dev-only-token-secret').digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptToken(plaintext) {
  if (plaintext == null || plaintext === '') return '';
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decryptToken(payload) {
  if (!payload) return '';
  try {
    const [ivB64, tagB64, encB64] = String(payload).split(':');
    if (!ivB64 || !tagB64 || !encB64) return '';
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(encB64, 'base64')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  } catch {
    return '';
  }
}
