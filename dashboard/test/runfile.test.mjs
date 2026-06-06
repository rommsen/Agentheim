import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  runfilePath,
  writeRunfile,
  readRunfile,
  deleteRunfile,
  isPidAlive,
  inspectExisting,
} from '../runfile.mjs';

function makeRoot() {
  const base = mkdtempSync(path.join(tmpdir(), 'aw004-rf-'));
  mkdirSync(path.join(base, '.agentheim'));
  return base;
}

test('runfilePath lives under .agentheim/.dashboard/runtime.json', () => {
  const root = makeRoot();
  try {
    assert.equal(
      runfilePath(root),
      path.join(root, '.agentheim', '.dashboard', 'runtime.json')
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writeRunfile then readRunfile round-trips {pid, port, startedAt}', () => {
  const root = makeRoot();
  try {
    writeRunfile(root, { pid: 4242, port: 51001, startedAt: '2026-06-06T00:00:00.000Z' });
    const rf = readRunfile(root);
    assert.equal(rf.pid, 4242);
    assert.equal(rf.port, 51001);
    assert.equal(rf.startedAt, '2026-06-06T00:00:00.000Z');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('readRunfile returns null when no runfile exists', () => {
  const root = makeRoot();
  try {
    assert.equal(readRunfile(root), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('deleteRunfile removes the runfile', () => {
  const root = makeRoot();
  try {
    writeRunfile(root, { pid: 1, port: 2, startedAt: 'x' });
    assert.ok(existsSync(runfilePath(root)));
    deleteRunfile(root);
    assert.ok(!existsSync(runfilePath(root)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('isPidAlive is true for the current process and false for an impossible pid', () => {
  assert.equal(isPidAlive(process.pid), true);
  assert.equal(isPidAlive(2147483600), false);
});

test('inspectExisting reports "none" when there is no runfile', () => {
  const root = makeRoot();
  try {
    assert.deepEqual(inspectExisting(root), { state: 'none' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('inspectExisting reports "live" with the runfile when the pid is alive', () => {
  const root = makeRoot();
  try {
    writeRunfile(root, { pid: process.pid, port: 9999, startedAt: 'x' });
    const r = inspectExisting(root);
    assert.equal(r.state, 'live');
    assert.equal(r.runfile.port, 9999);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('inspectExisting reports "stale" and clears the runfile when the pid is dead', () => {
  const root = makeRoot();
  try {
    writeRunfile(root, { pid: 2147483600, port: 9999, startedAt: 'x' });
    const r = inspectExisting(root);
    assert.equal(r.state, 'stale');
    // stale runfile is reaped so a relaunch never orphans / never reuses a dead port
    assert.ok(!existsSync(runfilePath(root)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
