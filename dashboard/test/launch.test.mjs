import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { launchDashboard, stopDashboard } from '../launch.mjs';
import { readRunfile, runfilePath, isPidAlive, writeRunfile } from '../runfile.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const serveEntry = path.join(here, '..', 'serve.mjs');

function makeRoot() {
  const base = mkdtempSync(path.join(tmpdir(), 'aw004-lnch-'));
  mkdirSync(path.join(base, '.agentheim'));
  return base;
}

async function waitFor(pred, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await pred()) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

test('launchDashboard spawns a detached server, writes a runfile, and is reachable', async () => {
  const root = makeRoot();
  try {
    const result = await launchDashboard(root);
    assert.equal(result.action, 'launched');
    assert.ok(result.port > 0);
    assert.ok(result.pid > 0);

    // runfile written with {pid, port, startedAt}
    const ready = await waitFor(() => !!readRunfile(root));
    assert.ok(ready, 'runfile should be written');
    const rf = readRunfile(root);
    assert.equal(rf.pid, result.pid);
    assert.equal(rf.port, result.port);
    assert.ok(rf.startedAt);

    // server is actually serving the health check
    const res = await fetch(`http://127.0.0.1:${result.port}/healthz`);
    assert.equal(res.status, 200);

    // stop kills the process and removes the runfile
    const stopped = await stopDashboard(root);
    assert.equal(stopped.action, 'stopped');
    const gone = await waitFor(() => !isPidAlive(result.pid));
    assert.ok(gone, 'process should be terminated by stop');
    assert.ok(!existsSync(runfilePath(root)), 'runfile should be removed by stop');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('launchDashboard reuses a live server instead of spawning a second', async () => {
  const root = makeRoot();
  try {
    const first = await launchDashboard(root);
    await waitFor(() => !!readRunfile(root));

    const second = await launchDashboard(root);
    assert.equal(second.action, 'reused');
    assert.equal(second.port, first.port);
    assert.equal(second.pid, first.pid);

    await stopDashboard(root);
    await waitFor(() => !isPidAlive(first.pid));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('launchDashboard replaces a stale runfile (dead pid) and never orphans', async () => {
  const root = makeRoot();
  try {
    // plant a stale runfile pointing at a dead pid
    writeRunfile(root, { pid: 2147483600, port: 65000, startedAt: 'old' });

    const result = await launchDashboard(root);
    assert.equal(result.action, 'launched');
    assert.notEqual(result.pid, 2147483600);

    await waitFor(() => !!readRunfile(root));
    const rf = readRunfile(root);
    assert.equal(rf.pid, result.pid);

    await stopDashboard(root);
    await waitFor(() => !isPidAlive(result.pid));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('stopDashboard on no runfile reports nothing to stop (no throw)', async () => {
  const root = makeRoot();
  try {
    const r = await stopDashboard(root);
    assert.equal(r.action, 'none');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
