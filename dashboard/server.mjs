// Dashboard HTTP server skeleton (ADR-0002): node:http, stdlib-only, no deps.
// Scope of THIS task (agentic-workflow-004): static assets + a health check.
// NO /api/tree, NO /api/doc (agentic-workflow-005), NO SSE (infrastructure-003),
// NO write path (agentic-workflow-009). Those routes are intentionally absent
// and fall through to a 404 here.

import http from 'node:http';
import path from 'node:path';
import { serveStatic } from './static.mjs';

/** Default asset root: the committed dashboard build output. */
export function defaultAssetRoot(root) {
  return path.join(root, 'dashboard', 'dist');
}

/**
 * Build (do not start) the dashboard HTTP server.
 * @param {{ root: string, assetRoot?: string }} opts
 *   root      — discovered project root (.agentheim/ holder), absolute.
 *   assetRoot — committed asset directory; defaults to <root>/dashboard/dist.
 */
export function createDashboardServer({ root, assetRoot = defaultAssetRoot(root) }) {
  return http.createServer((req, res) => {
    const pathname = (req.url || '/').split('?')[0];

    if (pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', root }));
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    // Static handler owns traversal rejection (403), missing-asset/absent-dist
    // (404), and streaming. Unmatched routes (e.g. /api/*) become a 404 here —
    // those endpoints belong to later tasks and are intentionally not built.
    serveStatic(req, res, assetRoot);
  });
}
