import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Public legal pages served directly as static HTML by the Node backend.
 *
 * Why: Meta's App Dashboard URL validator (Data Deletion / Privacy / Terms)
 * does not execute JavaScript. It wants a plain 200 OK text/html response,
 * with no auth, no SPA bootstrap, and minimal redirects. These routes let
 * us point Meta at the backend host (or serve as a safety net when the
 * frontend host is misconfigured).
 *
 * Also: explicitly DO NOT block Meta crawlers (facebookexternalhit, Facebot).
 * We do not inspect User-Agent. We just return the file.
 */
const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backend/src/routes/legal.js  ->  backend/src/static/<file>.html
// Static HTML lives inside the backend package so Render's backend-only
// deploy (rootDir: backend) includes these files.
const PUBLIC_DIR = path.resolve(__dirname, '..', 'static');

/** In-memory cache so we only read from disk once per process. */
const cache = new Map();

function loadPage(file) {
  if (cache.has(file)) return cache.get(file);
  try {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8');
    cache.set(file, html);
    return html;
  } catch {
    return null;
  }
}

function send(res, file, fallbackTitle) {
  const html = loadPage(file) ?? `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${fallbackTitle}</title></head><body><h1>${fallbackTitle}</h1><p>Contact: social@aioperator.social</p></body></html>`;
  // Deliberately clear restrictive framing headers (set globally by helmet)
  // so Meta's validator and any preview embeds can fetch the page without
  // being blocked. removeHeader returns void — do not chain.
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.status(200);
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300, must-revalidate');
  res.set('X-Robots-Tag', 'index, follow');
  res.send(html);
}

router.get('/privacy', (_req, res) => send(res, 'privacy.html', 'Privacy Policy — AI Operator'));
router.get('/terms', (_req, res) => send(res, 'terms.html', 'Terms of Service — AI Operator'));
router.get('/data-deletion', (_req, res) => send(res, 'data-deletion.html', 'Data Deletion Instructions — AI Operator'));

export default router;
