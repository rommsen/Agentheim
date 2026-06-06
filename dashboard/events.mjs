// Server→client push channel via Server-Sent Events (ADR-0006).
// `GET /api/events` holds a long-lived `text/event-stream` connection and pushes
// a small `tree-changed` frame whenever the project's `.agentheim/` tree mutates
// (fed by watcher.mjs). Periodic comment heartbeats keep the connection alive
// through proxies/idle timeouts; the connection is cleaned up on client close so
// no watcher leaks. Transport only — the payload is a raw pointer, never an
// interpreted Task transition (aw-009 owns interpretation).
//
// SSE was chosen over WebSocket (no upgrade handshake, push is one-directional)
// and over client polling (laggy + wasteful); see ADR-0006.

import { watchAgentheim } from './watcher.mjs';

/**
 * Handle a `GET /api/events` request as an SSE stream rooted at `root`.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} root  Absolute project root (the `.agentheim/` holder).
 * @param {{ heartbeatMs?: number, debounceMs?: number, pollMs?: number }} [opts]
 */
export function handleEvents(req, res, root, opts = {}) {
  const heartbeatMs = opts.heartbeatMs ?? 25000;

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    // We never buffer; tell intermediaries not to either.
    'x-accel-buffering': 'no',
  });

  // Open the stream with a comment + a named hello so a reconnecting client
  // sees an immediate frame (and EventSource considers the stream live).
  res.write(`retry: 3000\n\n`);
  res.write(`event: hello\ndata: {"type":"hello"}\n\n`);

  let closed = false;

  const watcher = watchAgentheim(
    root,
    (evt) => {
      if (closed) return;
      // Named SSE event + JSON payload pointer.
      res.write(`event: ${evt.type}\n`);
      res.write(`data: ${JSON.stringify(evt)}\n\n`);
    },
    { debounceMs: opts.debounceMs, pollMs: opts.pollMs }
  );

  // Comment-frame heartbeat: ignored by EventSource, but keeps the socket warm.
  const heartbeat = setInterval(() => {
    if (closed) return;
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, heartbeatMs);
  if (typeof heartbeat.unref === 'function') heartbeat.unref();

  function cleanup() {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    watcher.close();
    try { res.end(); } catch { /* already closed */ }
  }

  req.on('close', cleanup);
  req.on('aborted', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
}
