// Tests for the dashboard's persisted SKIP-PERMISSIONS "armed" toggle
// (agentic-workflow-021).
//
// A sibling presentation concern to the theme choice (aw-017 / theme-state.js)
// and the board view-state (aw-014 / ADR-0015): a single versioned localStorage
// key with safe degradation. The crucial difference is the DEFAULT — this one is
// OFF by default and must NEVER be silently on: a malformed / stale-version /
// absent blob degrades to OFF (armed=false), never a throw, never on.
//
// It is presentation view-state ONLY — never a disk lifecycle write (ADR-0017 /
// ADR-0001) — so the dashboard stays read-only over .agentheim/ and the armed
// choice survives every SSE re-projection untouched. The store is pure over an
// INJECTED storage backend, framework-free, and never throws. Unit-tested under
// `node --test` with no DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SKIP_PERMISSIONS_KEY,
  SKIP_PERMISSIONS_VERSION,
  loadSkipPermissions,
  saveSkipPermissions,
} from '../app/skip-permissions-state.js';

// A minimal in-memory localStorage stub over the one key.
function memoryStorage(initial) {
  const store = new Map();
  if (initial != null) store.set(SKIP_PERMISSIONS_KEY, initial);
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    _raw: () => store.get(SKIP_PERMISSIONS_KEY),
  };
}

test('the store key is its own, distinct from theme / board view-state', () => {
  assert.equal(SKIP_PERMISSIONS_KEY, 'agentheim.dashboard.skipPermissions');
});

test('loadSkipPermissions on an empty store returns false (default OFF)', () => {
  const storage = memoryStorage(null);
  assert.equal(loadSkipPermissions(storage), false);
});

test('a saved armed=true round-trips through load', () => {
  const storage = memoryStorage(null);
  saveSkipPermissions(storage, true);
  assert.equal(loadSkipPermissions(storage), true);
  saveSkipPermissions(storage, false);
  assert.equal(loadSkipPermissions(storage), false);
});

test('the persisted blob is versioned and stores a boolean', () => {
  const storage = memoryStorage(null);
  saveSkipPermissions(storage, true);
  const parsed = JSON.parse(storage._raw());
  assert.equal(parsed.version, SKIP_PERMISSIONS_VERSION);
  assert.equal(parsed.armed, true);
});

test('a stored blob from a DIFFERENT version degrades to OFF, never throws', () => {
  const stale = JSON.stringify({ version: SKIP_PERMISSIONS_VERSION + 999, armed: true });
  const storage = memoryStorage(stale);
  assert.equal(loadSkipPermissions(storage), false);
});

test('malformed JSON in the store degrades to OFF, never throws', () => {
  const storage = memoryStorage('{not json');
  assert.equal(loadSkipPermissions(storage), false);
});

test('a non-boolean armed value in the store degrades to OFF, never throws', () => {
  const storage = memoryStorage(JSON.stringify({ version: SKIP_PERMISSIONS_VERSION, armed: 'yes' }));
  assert.equal(loadSkipPermissions(storage), false);
});

test('a missing/undefined storage backend degrades to OFF, never throws', () => {
  assert.equal(loadSkipPermissions(undefined), false);
  assert.equal(loadSkipPermissions(null), false);
  assert.doesNotThrow(() => saveSkipPermissions(undefined, true));
});

test('saveSkipPermissions coerces only true to armed; anything else is OFF', () => {
  const storage = memoryStorage(null);
  saveSkipPermissions(storage, 1); // truthy-but-not-true must not arm
  assert.equal(loadSkipPermissions(storage), false);
  saveSkipPermissions(storage, true);
  assert.equal(loadSkipPermissions(storage), true);
});

test('a throwing storage backend degrades to OFF on load and is swallowed on save', () => {
  const thrower = {
    getItem: () => { throw new Error('storage disabled'); },
    setItem: () => { throw new Error('storage disabled'); },
  };
  assert.equal(loadSkipPermissions(thrower), false);
  assert.doesNotThrow(() => saveSkipPermissions(thrower, true));
});
