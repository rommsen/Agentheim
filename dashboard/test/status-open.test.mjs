import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { statusDashboard, browserCommand, openBrowser } from '../launch.mjs';
import { writeRunfile } from '../runfile.mjs';

function makeRoot() {
  const base = mkdtempSync(path.join(tmpdir(), 'aw011-status-'));
  mkdirSync(path.join(base, '.agentheim'));
  return base;
}

// ---- status verb (pure read over the runfile) ----

test('statusDashboard reports "none" when no runfile exists', () => {
  const root = makeRoot();
  try {
    const r = statusDashboard(root);
    assert.equal(r.state, 'none');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('statusDashboard reports "running" with port + pid for a live runfile', () => {
  const root = makeRoot();
  try {
    // a live pid: this very test process is guaranteed alive
    writeRunfile(root, { pid: process.pid, port: 51234, startedAt: 'now' });
    const r = statusDashboard(root);
    assert.equal(r.state, 'running');
    assert.equal(r.port, 51234);
    assert.equal(r.pid, process.pid);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('statusDashboard reports "none" and reaps a stale runfile (dead pid), never launching', () => {
  const root = makeRoot();
  try {
    writeRunfile(root, { pid: 2147483600, port: 65000, startedAt: 'old' });
    const r = statusDashboard(root);
    // a dead pid is not "running"; inspectExisting reaps the stale file
    assert.equal(r.state, 'none');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---- openBrowser cross-OS command selection ----

test('browserCommand chooses the right opener per platform', () => {
  const url = 'http://127.0.0.1:8080/';
  assert.deepEqual(browserCommand('win32', url), {
    command: 'cmd',
    args: ['/c', 'start', '', url],
  });
  assert.deepEqual(browserCommand('darwin', url), {
    command: 'open',
    args: [url],
  });
  assert.deepEqual(browserCommand('linux', url), {
    command: 'xdg-open',
    args: [url],
  });
});

test('openBrowser spawns the selected opener detached and never throws', () => {
  const calls = [];
  const fakeSpawn = (command, args, opts) => {
    calls.push({ command, args, opts });
    return { unref() {} };
  };
  // should not throw even if the spawn fails
  assert.doesNotThrow(() => openBrowser('http://127.0.0.1:9999/', { spawnFn: fakeSpawn, platform: 'linux' }));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'xdg-open');
  assert.deepEqual(calls[0].args, ['http://127.0.0.1:9999/']);
  assert.equal(calls[0].opts.detached, true);
});

test('openBrowser swallows spawn errors (browser-open is best-effort)', () => {
  const throwingSpawn = () => {
    throw new Error('no display');
  };
  assert.doesNotThrow(() => openBrowser('http://127.0.0.1:9999/', { spawnFn: throwingSpawn, platform: 'linux' }));
});
