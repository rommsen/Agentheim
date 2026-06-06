import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createDashboardServer } from '../server.mjs';

function makeProjectWithDist() {
  const base = mkdtempSync(path.join(tmpdir(), 'aw004-srv-'));
  mkdirSync(path.join(base, '.agentheim'));
  const dist = path.join(base, 'dashboard', 'dist');
  mkdirSync(dist, { recursive: true });
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>dash</title>');
  writeFileSync(path.join(dist, 'app.js'), 'console.log(1)');
  return { base, dist };
}

async function start(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port, address } = server.address();
  return { port, address };
}

test('server binds 127.0.0.1 on an ephemeral port', async () => {
  const { base, dist } = makeProjectWithDist();
  const server = createDashboardServer({ root: base, assetRoot: dist });
  try {
    const { port, address } = await start(server);
    assert.equal(address, '127.0.0.1');
    assert.ok(port > 0);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('GET /healthz returns 200 with ok status JSON', async () => {
  const { base, dist } = makeProjectWithDist();
  const server = createDashboardServer({ root: base, assetRoot: dist });
  try {
    const { port } = await start(server);
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.root, base);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('GET / streams the committed index.html', async () => {
  const { base, dist } = makeProjectWithDist();
  const server = createDashboardServer({ root: base, assetRoot: dist });
  try {
    const { port } = await start(server);
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(await res.text(), /dash/);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('a traversal request returns 4xx and touches no file', async () => {
  const { base, dist } = makeProjectWithDist();
  const server = createDashboardServer({ root: base, assetRoot: dist });
  try {
    const { port } = await start(server);
    // encoded traversal that would escape the asset root
    const res = await fetch(`http://127.0.0.1:${port}/..%2f..%2f..%2fetc%2fpasswd`);
    assert.ok(res.status >= 400 && res.status < 500, `expected 4xx, got ${res.status}`);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('GET / returns a graceful 404 when dist/ is absent (assets not built)', async () => {
  const base = mkdtempSync(path.join(tmpdir(), 'aw004-nodist-'));
  mkdirSync(path.join(base, '.agentheim'));
  const missingDist = path.join(base, 'dashboard', 'dist');
  const server = createDashboardServer({ root: base, assetRoot: missingDist });
  try {
    const { port } = await start(server);
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 404);
    assert.match(await res.text(), /not built|absent/i);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

// /api/tree is wired in by agentic-workflow-005 (covered by read-api.test.mjs).
// The write path POST /api/task/move is wired in by agentic-workflow-009 (its
// behaviour is covered by move-api.test.mjs). Here we only assert the route now
// EXISTS as a POST-only endpoint — a GET is rejected 405, not 404, proving the
// route is mounted (and not silently swallowed as a static 404).
test('the write route POST /api/task/move is mounted (GET → 405, not 404)', async () => {
  const { base, dist } = makeProjectWithDist();
  const server = createDashboardServer({ root: base, assetRoot: dist });
  try {
    const { port } = await start(server);
    const res = await fetch(`http://127.0.0.1:${port}/api/task/move`);
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'POST');
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});
