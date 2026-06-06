// Dashboard HTTP server (ADR-0002 + ADR-0006): node:http, stdlib-only, no deps.
// Routes now live here: static assets + health check (agentic-workflow-004), the
// SSE live-update channel GET /api/events (infrastructure-003, ADR-0006), and the
// read endpoints GET /api/tree + GET /api/doc (agentic-workflow-005, ADR-0002),
// and the ONE write path POST /api/task/move (agentic-workflow-009, ADR-0001),
// which delegates to the shared lifecycle mover — never moving a file itself.

import http from 'node:http';
import path from 'node:path';
import { serveStatic } from './static.mjs';
import { handleEvents } from './events.mjs';
import { handleTree, handleDoc } from './read-api.mjs';
import { handleMove } from './move-api.mjs';

/** Default asset root: the committed dashboard build output. */
export function defaultAssetRoot(root) {
  return path.join(root, 'dashboard', 'dist');
}

/**
 * Build (do not start) the dashboard HTTP server.
 * @param {{ root: string, assetRoot?: string, sse?: object }} opts
 *   root      — discovered project root (.agentheim/ holder), absolute.
 *   assetRoot — committed asset directory; defaults to <root>/dashboard/dist.
 *   sse       — options forwarded to the SSE handler (heartbeatMs, debounceMs,
 *               pollMs); see events.mjs / watcher.mjs.
 */
export function createDashboardServer({ root, assetRoot = defaultAssetRoot(root), sse = {} }) {
  return http.createServer((req, res) => {
    const pathname = (req.url || '/').split('?')[0];

    if (pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', root }));
      return;
    }

    // Live-update push channel (ADR-0006). Long-lived SSE stream rooted at the
    // discovered project; emits tree-changed pointers + heartbeats.
    if (pathname === '/api/events' && req.method === 'GET') {
      handleEvents(req, res, root, sse);
      return;
    }

    // The ONLY write path (aw-009, ADR-0001): Promote a task backlog→todo via the
    // shared lifecycle mover. Transport-only — it delegates to applyTaskMove and
    // translates the structured result to HTTP; it never moves a file itself.
    if (pathname === '/api/task/move') {
      if (req.method !== 'POST') {
        res.writeHead(405, {
          'content-type': 'text/plain; charset=utf-8',
          allow: 'POST',
        });
        res.end('Method Not Allowed');
        return;
      }
      handleMove(req, res, root);
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    // Read projection of the on-disk tree (aw-005). The board, slide-over, and
    // navigation all rebuild from this single endpoint.
    if (pathname === '/api/tree') {
      handleTree(req, res, root);
      return;
    }

    // Raw-markdown carrier for one in-root artifact (aw-005). Path is validated
    // against the project root before any file is touched.
    if (pathname === '/api/doc') {
      const requestUrl = new URL(req.url, 'http://localhost');
      handleDoc(req, res, root, requestUrl);
      return;
    }

    // Static handler owns traversal rejection (403), missing-asset/absent-dist
    // (404), and streaming. Unmatched routes (e.g. /api/*) become a 404 here —
    // those endpoints belong to later tasks and are intentionally not built.
    serveStatic(req, res, assetRoot);
  });
}
