// Minimal static asset handler (ADR-0002): resolve a request path against an
// asset root, reject path traversal, stream with a minimal content-type map.
// No runtime bundler, no in-browser Babel — streams whatever committed assets
// exist under dist/ (produced later by infrastructure-002), with a graceful
// response when dist/ is absent.

import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { resolveInRoot } from './discovery.mjs';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** Map a filename/path to a content-type, defaulting to octet-stream. */
export function contentTypeFor(filename) {
  const ext = path.extname(String(filename)).toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

/**
 * Serve a GET request for a static asset out of `assetRoot`.
 * - rejects traversal with 403 (touches no file)
 * - 404 when the asset is missing or dist/ is absent (graceful)
 * - streams the file with its content-type otherwise
 * Returns true if it handled the request, false to let other routes try.
 */
export function serveStatic(req, res, assetRoot) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = urlPath === '/' ? 'index.html' : urlPath;

  let target;
  try {
    target = resolveInRoot(assetRoot, rel);
  } catch {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden: path traversal rejected');
    return true;
  }

  if (!existsSync(assetRoot)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Dashboard assets not built yet (dist/ is absent). Run the asset build (infrastructure-002).');
    return true;
  }

  if (!existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return true;
  }

  res.writeHead(200, { 'content-type': contentTypeFor(target) });
  createReadStream(target).pipe(res);
  return true;
}
