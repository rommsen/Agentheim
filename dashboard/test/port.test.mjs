import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import {
  PORT_WINDOW_START,
  PORT_WINDOW_SIZE,
  LADDER_LENGTH,
  derivePort,
  portLadder,
  listenOnLadder,
} from '../port.mjs';

function eaddrinuse() {
  const e = new Error('address in use');
  e.code = 'EADDRINUSE';
  return e;
}

const WINDOW_END = PORT_WINDOW_START + PORT_WINDOW_SIZE - 1;

function inBand(port) {
  return port >= PORT_WINDOW_START && port <= WINDOW_END;
}

test('the window is 41000–42023 (1024-wide, non-privileged, clear of bridge + ephemeral bands)', () => {
  assert.equal(PORT_WINDOW_START, 41000);
  assert.equal(PORT_WINDOW_SIZE, 1024);
  assert.equal(WINDOW_END, 42023);
});

test('the ladder has 8 steps', () => {
  assert.equal(LADDER_LENGTH, 8);
});

test('derivePort is deterministic: the same root yields the same port', () => {
  const root = '/home/dev/projects/agentheim';
  assert.equal(derivePort(root), derivePort(root));
});

test('derivePort resolves the root to an absolute path before hashing (relative ≡ absolute equivalent)', () => {
  // A relative path and its resolved absolute form must derive the same port,
  // because the contract is "hash the resolved absolute root".
  const rel = 'some/relative/root';
  assert.equal(derivePort(rel), derivePort(path.resolve(rel)));
});

test('derivePort lands inside 41000–42023', () => {
  for (const root of ['/a', '/b/c', 'C:/src/x', '/home/dev/agentheim', '/tmp/zzz']) {
    assert.ok(inBand(derivePort(root)), `${root} -> ${derivePort(root)} out of band`);
  }
});

test('two different roots derive different ports (no cross-project origin collision)', () => {
  const a = derivePort('/home/dev/project-alpha');
  const b = derivePort('/home/dev/project-beta');
  assert.notEqual(a, b);
});

test('a persisted-origin value survives a stop+relaunch: derivation is stable across calls', () => {
  // The localStorage store is keyed by 127.0.0.1:<port>. Two independent
  // "launches" of the same root must compute the identical port, so the origin
  // — and therefore any persisted localStorage value — is preserved.
  const root = path.resolve('/work/agentheim-main');
  const firstLaunch = derivePort(root);
  const secondLaunch = derivePort(root);
  assert.equal(firstLaunch, secondLaunch);
});

test('portLadder yields 8 ports, all in-band, starting at the derived port', () => {
  const root = '/home/dev/agentheim';
  const ladder = portLadder(root);
  assert.equal(ladder.length, LADDER_LENGTH);
  assert.equal(ladder[0], derivePort(root));
  for (const p of ladder) assert.ok(inBand(p), `${p} out of band`);
});

test('portLadder wraps within the window when the base sits near the top', () => {
  // Find a root whose derived port is in the top 7 of the window, so the ladder
  // must wrap around to the window start to stay in-band.
  let wrappingRoot = null;
  for (let i = 0; i < 100000 && !wrappingRoot; i++) {
    const root = `/wrap-probe/${i}`;
    if (derivePort(root) > WINDOW_END - LADDER_LENGTH + 1) wrappingRoot = root;
  }
  assert.ok(wrappingRoot, 'expected to find a near-top derived port within probe budget');

  const ladder = portLadder(wrappingRoot);
  // Every ladder port stays in-band even though it crossed the top boundary.
  for (const p of ladder) assert.ok(inBand(p), `${p} out of band after wrap`);
  // The wrap actually happened: some later step is below some earlier step.
  assert.ok(ladder.some((p, i) => i > 0 && p < ladder[i - 1]), 'expected a wrap-around in the ladder');
});

test('portLadder steps are the derived base plus 0..7 modulo the window', () => {
  const root = '/home/dev/agentheim';
  const base = derivePort(root);
  const ladder = portLadder(root);
  for (let step = 0; step < LADDER_LENGTH; step++) {
    const expected = PORT_WINDOW_START + (((base - PORT_WINDOW_START) + step) % PORT_WINDOW_SIZE);
    assert.equal(ladder[step], expected);
  }
});

test('listenOnLadder binds the derived port directly and does NOT consult the ladder when it is free', async () => {
  const root = '/home/dev/agentheim';
  const attempts = [];
  const bound = await listenOnLadder(root, async (port) => {
    attempts.push(port);
  });
  assert.equal(bound, derivePort(root));
  assert.deepEqual(attempts, [derivePort(root)], 'only the derived port should be tried');
});

test('listenOnLadder walks the ladder on EADDRINUSE and binds the first free port', async () => {
  const root = '/home/dev/agentheim';
  const ladder = portLadder(root);
  const busy = new Set([ladder[0], ladder[1], ladder[2]]);
  const attempts = [];
  const bound = await listenOnLadder(root, async (port) => {
    attempts.push(port);
    if (busy.has(port)) throw eaddrinuse();
  });
  assert.equal(bound, ladder[3], 'first free rung should bind');
  assert.deepEqual(attempts, [ladder[0], ladder[1], ladder[2], ladder[3]]);
});

test('listenOnLadder rejects with a clear error when the whole ladder is busy — no crash', async () => {
  const root = '/home/dev/agentheim';
  const attempts = [];
  await assert.rejects(
    () =>
      listenOnLadder(root, async (port) => {
        attempts.push(port);
        throw eaddrinuse();
      }),
    (err) => {
      assert.equal(err.code, 'EADDRINUSE_LADDER_EXHAUSTED');
      assert.match(err.message, /all 8 ports/);
      return true;
    },
  );
  assert.equal(attempts.length, LADDER_LENGTH, 'every rung is tried before giving up');
});

test('listenOnLadder re-throws a non-EADDRINUSE error immediately (it is not a collision)', async () => {
  const root = '/home/dev/agentheim';
  const attempts = [];
  await assert.rejects(
    () =>
      listenOnLadder(root, async (port) => {
        attempts.push(port);
        throw new Error('EACCES: permission denied');
      }),
    /EACCES/,
  );
  assert.equal(attempts.length, 1, 'a fatal error must not advance the ladder');
});
