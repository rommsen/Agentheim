import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { statusDashboard } from '../launch.mjs';
import * as launch from '../launch.mjs';
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

// ---- auto-open is gone (agentic-workflow-032) ----
// launch no longer opens a browser; the opener machinery was removed entirely.

test('the browser-opener helpers are no longer exported (auto-open removed)', () => {
  assert.equal(launch.openBrowser, undefined);
  assert.equal(launch.browserCommand, undefined);
});
