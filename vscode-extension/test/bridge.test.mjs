// Unit tests for the testable core of the VS Code bridge extension (ADR-0018).
// The `vscode` module is NOT importable here; the bridge core takes the
// terminal-launch action as an injected callback, so every contractual rule
// (token gating, body validation, CORS preflight, fallback ladder, bridge.json
// lifecycle) is exercised without the editor. Mirrors the dashboard's zero-dep
// `node:test` idiom (infrastructure-001/003).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  startBridge,
  bridgePath,
  TOKEN_HEADER,
  PREFERRED_PORTS,
} = require('../src/bridge.js');

function makeProject() {
  const base = mkdtempSync(path.join(tmpdir(), 'infra013-bridge-'));
  mkdirSync(path.join(base, '.agentheim'));
  return base;
}

// Most tests bind an OS-chosen ephemeral port to avoid contending for the fixed
// 31425 ladder across the suite; the two tests that ASSERT the fixed port /
// ladder use the real PREFERRED_PORTS explicitly.
const EPHEMERAL = { ports: [0] };

function cleanup(base, bridge) {
  if (bridge) bridge.close();
  rmSync(base, { recursive: true, force: true });
}

// Minimal localhost request helper returning { status, headers, body }.
function request(port, { method = 'GET', pathName = '/health', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : Buffer.from(body);
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: pathName,
        headers: {
          ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('binds 127.0.0.1 on the preferred fixed port and writes bridge.json', async () => {
  const base = makeProject();
  const launched = [];
  const bridge = await startBridge({ root: base, launchTerminal: (p) => launched.push(p) });
  try {
    assert.equal(bridge.address, '127.0.0.1');
    assert.equal(bridge.port, PREFERRED_PORTS[0]);

    const file = bridgePath(base);
    assert.ok(existsSync(file), 'bridge.json written on activation');
    const meta = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(meta.port, bridge.port);
    assert.equal(meta.pid, process.pid);
    assert.match(meta.token, /^[0-9a-f]{32}$/, 'per-activation 32-hex token');
    assert.equal(typeof meta.startedAt, 'string');
    assert.equal(typeof meta.v, 'number');
  } finally {
    cleanup(base, bridge);
  }
});

test('falls back along 31425→31426→31427 when the preferred port is taken', async () => {
  const base = makeProject();
  // Occupy the first preferred port so the ladder must advance.
  const blocker = http.createServer(() => {});
  await new Promise((r) => blocker.listen(PREFERRED_PORTS[0], '127.0.0.1', r));
  const bridge = await startBridge({ root: base, launchTerminal: () => {} });
  try {
    assert.equal(bridge.port, PREFERRED_PORTS[1]);
    assert.equal(JSON.parse(readFileSync(bridgePath(base), 'utf8')).port, PREFERRED_PORTS[1]);
  } finally {
    blocker.close();
    cleanup(base, bridge);
  }
});

test('POST /run with a valid token launches claude "<prompt>" and returns 2xx', async () => {
  const base = makeProject();
  const launched = [];
  const bridge = await startBridge({ root: base, launchTerminal: (p) => launched.push(p), ...EPHEMERAL });
  try {
    const res = await request(bridge.port, {
      method: 'POST',
      pathName: '/run',
      headers: { [TOKEN_HEADER]: bridge.token },
      body: JSON.stringify({ prompt: 'do the thing' }),
    });
    assert.ok(res.status >= 200 && res.status < 300, `expected 2xx, got ${res.status}`);
    assert.deepEqual(launched, ['claude "do the thing"']);
    assert.ok(!launched[0].includes('--dangerously-skip-permissions'), 'no permission-bypass flag');
  } finally {
    cleanup(base, bridge);
  }
});

test('POST /run with a missing/mismatched token is rejected 401 and launches nothing', async () => {
  const base = makeProject();
  const launched = [];
  const bridge = await startBridge({ root: base, launchTerminal: (p) => launched.push(p), ...EPHEMERAL });
  try {
    const missing = await request(bridge.port, {
      method: 'POST',
      pathName: '/run',
      body: JSON.stringify({ prompt: 'x' }),
    });
    assert.equal(missing.status, 401);

    const wrong = await request(bridge.port, {
      method: 'POST',
      pathName: '/run',
      headers: { [TOKEN_HEADER]: 'deadbeef' },
      body: JSON.stringify({ prompt: 'x' }),
    });
    assert.equal(wrong.status, 401);
    assert.deepEqual(launched, [], 'no terminal opened without the shared secret');
  } finally {
    cleanup(base, bridge);
  }
});

test('POST /run with a malformed/empty body returns 400', async () => {
  const base = makeProject();
  const launched = [];
  const bridge = await startBridge({ root: base, launchTerminal: (p) => launched.push(p), ...EPHEMERAL });
  try {
    const garbage = await request(bridge.port, {
      method: 'POST',
      pathName: '/run',
      headers: { [TOKEN_HEADER]: bridge.token },
      body: 'not json',
    });
    assert.equal(garbage.status, 400);

    const empty = await request(bridge.port, {
      method: 'POST',
      pathName: '/run',
      headers: { [TOKEN_HEADER]: bridge.token },
      body: JSON.stringify({ prompt: '   ' }),
    });
    assert.equal(empty.status, 400);
    assert.deepEqual(launched, []);
  } finally {
    cleanup(base, bridge);
  }
});

test('GET /health with a valid token returns 200', async () => {
  const base = makeProject();
  const bridge = await startBridge({ root: base, launchTerminal: () => {}, ...EPHEMERAL });
  try {
    const ok = await request(bridge.port, { pathName: '/health', headers: { [TOKEN_HEADER]: bridge.token } });
    assert.equal(ok.status, 200);
    const bad = await request(bridge.port, { pathName: '/health' });
    assert.equal(bad.status, 401);
  } finally {
    cleanup(base, bridge);
  }
});

test('OPTIONS preflight is answered with permissive CORS for the custom-header POST', async () => {
  const base = makeProject();
  const bridge = await startBridge({ root: base, launchTerminal: () => {}, ...EPHEMERAL });
  try {
    const res = await request(bridge.port, {
      method: 'OPTIONS',
      pathName: '/run',
      headers: {
        origin: 'http://localhost:9999',
        'access-control-request-method': 'POST',
        'access-control-request-headers': TOKEN_HEADER,
      },
    });
    assert.ok(res.status === 200 || res.status === 204, `preflight should succeed, got ${res.status}`);
    assert.ok(res.headers['access-control-allow-origin'], 'allow-origin echoed');
    assert.match(res.headers['access-control-allow-methods'] || '', /POST/);
    assert.match(
      (res.headers['access-control-allow-headers'] || '').toLowerCase(),
      new RegExp(TOKEN_HEADER.toLowerCase())
    );
  } finally {
    cleanup(base, bridge);
  }
});

test('close() removes bridge.json so a dead host leaves no live discovery file', async () => {
  const base = makeProject();
  const bridge = await startBridge({ root: base, launchTerminal: () => {}, ...EPHEMERAL });
  const file = bridgePath(base);
  assert.ok(existsSync(file));
  bridge.close();
  assert.ok(!existsSync(file), 'bridge.json removed on deactivation');
  rmSync(base, { recursive: true, force: true });
});

test('a stale bridge.json from a prior host is overwritten on activation', async () => {
  const base = makeProject();
  mkdirSync(path.join(base, '.agentheim', '.dashboard'), { recursive: true });
  const file = bridgePath(base);
  writeFileSync(file, JSON.stringify({ port: 99999, token: 'stale', pid: 1, startedAt: 'old', v: 0 }));
  const bridge = await startBridge({ root: base, launchTerminal: () => {}, ...EPHEMERAL });
  try {
    const meta = JSON.parse(readFileSync(file, 'utf8'));
    assert.notEqual(meta.token, 'stale');
    assert.equal(meta.port, bridge.port);
  } finally {
    cleanup(base, bridge);
  }
});
