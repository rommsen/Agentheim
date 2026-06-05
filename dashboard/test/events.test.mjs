import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createDashboardServer } from '../server.mjs';

function makeProject() {
  const base = mkdtempSync(path.join(tmpdir(), 'inf003-sse-'));
  const ah = path.join(base, '.agentheim');
  mkdirSync(path.join(ah, 'contexts', 'demo', 'backlog'), { recursive: true });
  mkdirSync(path.join(ah, 'contexts', 'demo', 'todo'), { recursive: true });
  const dist = path.join(base, 'dashboard', 'dist');
  mkdirSync(dist, { recursive: true });
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html>');
  return { base, ah, dist };
}

async function start(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

/** Read SSE frames from a fetch Response body until `predicate(buf)` or timeout. */
async function readUntil(res, predicate, timeoutMs = 1500) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise((r) => setTimeout(() => r({ value: undefined, done: false }), 200)),
    ]);
    if (done) break;
    if (value) buf += decoder.decode(value, { stream: true });
    if (predicate(buf)) break;
  }
  try { await reader.cancel(); } catch { /* ignore */ }
  return buf;
}

test('GET /api/events responds with text/event-stream and no-cache headers', async () => {
  const { base, dist } = makeProject();
  const server = createDashboardServer({ root: base, assetRoot: dist });
  try {
    const port = await start(server);
    const ctrl = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/api/events`, { signal: ctrl.signal });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/event-stream/);
    assert.match(res.headers.get('cache-control') || '', /no-cache/);
    ctrl.abort();
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('the stream sends an initial heartbeat / comment frame promptly', async () => {
  const { base, dist } = makeProject();
  // heartbeatMs tiny so the test does not wait long
  const server = createDashboardServer({ root: base, assetRoot: dist, sse: { heartbeatMs: 60 } });
  try {
    const port = await start(server);
    const ctrl = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/api/events`, { signal: ctrl.signal });
    const buf = await readUntil(res, (b) => /^:/m.test(b) || b.includes('event: hello'));
    assert.match(buf, /(^:|event: hello)/m, `expected a comment/hello frame, got: ${JSON.stringify(buf)}`);
    ctrl.abort();
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('a .agentheim/ mutation pushes a tree-changed data frame', async () => {
  const { base, ah, dist } = makeProject();
  const server = createDashboardServer({
    root: base,
    assetRoot: dist,
    sse: { heartbeatMs: 5000, debounceMs: 40 },
  });
  try {
    const port = await start(server);
    const ctrl = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/api/events`, { signal: ctrl.signal });
    // let the watcher attach, then mutate
    setTimeout(() => {
      writeFileSync(path.join(ah, 'contexts', 'demo', 'backlog', 'demo-001.md'), '# task');
    }, 120);
    const buf = await readUntil(res, (b) => b.includes('tree-changed'), 2500);
    assert.match(buf, /event: tree-changed/);
    const m = buf.match(/event: tree-changed\ndata: (\{.*\})/);
    assert.ok(m, `expected a tree-changed JSON data payload, got: ${JSON.stringify(buf)}`);
    const payload = JSON.parse(m[1]);
    assert.equal(payload.type, 'tree-changed');
    assert.equal(typeof payload.path, 'string');
    ctrl.abort();
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('reconnecting after an abort yields a fresh working stream', async () => {
  const { base, dist } = makeProject();
  const server = createDashboardServer({ root: base, assetRoot: dist, sse: { heartbeatMs: 60 } });
  try {
    const port = await start(server);
    // first connection, then abort it
    const c1 = new AbortController();
    const r1 = await fetch(`http://127.0.0.1:${port}/api/events`, { signal: c1.signal });
    assert.equal(r1.status, 200);
    c1.abort();
    await new Promise((r) => setTimeout(r, 80));
    // reconnect
    const c2 = new AbortController();
    const r2 = await fetch(`http://127.0.0.1:${port}/api/events`, { signal: c2.signal });
    assert.equal(r2.status, 200);
    const buf = await readUntil(r2, (b) => /^:/m.test(b) || b.includes('event: hello'));
    assert.match(buf, /(^:|event: hello)/m);
    c2.abort();
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});
