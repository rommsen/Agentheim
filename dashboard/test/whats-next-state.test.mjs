// Tests for the dashboard's persisted WHAT'S-NEXT dismiss state (agentic-workflow-073).
//
// The What's next advisory recommendation (ADR-0027) renders as a dismissible panel
// above the board prompt bar. Whether it is dismissed must SURVIVE a reload, and a
// NEWER recommendation must RE-SHOW it. This is a sibling presentation-state store to
// theme-state.js (aw-017) / board-view-state.js (aw-014 / ADR-0015): a single versioned
// localStorage key with safe degradation. Crucially, the dismissed state is KEYED BY the
// artifact's `generated` timestamp — dismissing one recommendation must not permanently
// suppress the next.
//
// EVERY degraded path (malformed JSON / stale version / absent blob / non-string /
// no backend) resolves to "NOT dismissed" — a corrupt preference must never hide a
// fresh recommendation, and must never throw.
//
// `formatStaleness` is a pure staleness formatter over the `generated` timestamp — a
// rendering cue only (ADR-0027 §4: nothing keys behaviour off it). The store is pure
// over an INJECTED storage backend, framework-free, unit-tested under `node --test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  WHATS_NEXT_KEY,
  WHATS_NEXT_VERSION,
  WHATS_NEXT_DOC_PATH,
  loadDismissed,
  saveDismissed,
  isDismissed,
  formatStaleness,
} from '../app/whats-next-state.js';

// A minimal in-memory localStorage stub over the one key.
function memoryStorage(initial) {
  const store = new Map();
  if (initial != null) store.set(WHATS_NEXT_KEY, initial);
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    _raw: () => store.get(WHATS_NEXT_KEY),
  };
}

// A storage stub whose every access throws (disabled / private mode).
const throwingStorage = {
  getItem() { throw new Error('storage disabled'); },
  setItem() { throw new Error('storage disabled'); },
};

test('the doc path is the ADR-0027 advisory artifact', () => {
  assert.equal(WHATS_NEXT_DOC_PATH, '.agentheim/state/whats-next.md');
});

// ---- loadDismissed ----------------------------------------------------------

test('loadDismissed returns null with no backend', () => {
  assert.equal(loadDismissed(null), null);
  assert.equal(loadDismissed(undefined), null);
  assert.equal(loadDismissed({}), null); // no getItem
});

test('loadDismissed returns null when nothing is stored', () => {
  assert.equal(loadDismissed(memoryStorage()), null);
});

test('loadDismissed returns the stored generated stamp', () => {
  const storage = memoryStorage();
  saveDismissed(storage, '2026-06-17T20:00:00Z');
  assert.equal(loadDismissed(storage), '2026-06-17T20:00:00Z');
});

test('loadDismissed returns null on malformed JSON', () => {
  assert.equal(loadDismissed(memoryStorage('{not json')), null);
});

test('loadDismissed returns null on a stale version', () => {
  const stale = JSON.stringify({ version: WHATS_NEXT_VERSION + 99, dismissedGenerated: 'x' });
  assert.equal(loadDismissed(memoryStorage(stale)), null);
});

test('loadDismissed returns null when dismissedGenerated is not a string', () => {
  for (const bad of [true, 1, null, {}, []]) {
    const blob = JSON.stringify({ version: WHATS_NEXT_VERSION, dismissedGenerated: bad });
    assert.equal(loadDismissed(memoryStorage(blob)), null);
  }
});

test('loadDismissed returns null (never throws) when storage access throws', () => {
  assert.equal(loadDismissed(throwingStorage), null);
});

// ---- saveDismissed ----------------------------------------------------------

test('saveDismissed persists under the versioned envelope', () => {
  const storage = memoryStorage();
  saveDismissed(storage, '2026-06-17T20:00:00Z');
  const parsed = JSON.parse(storage._raw());
  assert.equal(parsed.version, WHATS_NEXT_VERSION);
  assert.equal(parsed.dismissedGenerated, '2026-06-17T20:00:00Z');
});

test('saveDismissed is a no-op with no backend (never throws)', () => {
  assert.doesNotThrow(() => saveDismissed(null, 'x'));
  assert.doesNotThrow(() => saveDismissed({}, 'x'));
});

test('saveDismissed refuses a non-string generated (writes nothing)', () => {
  const storage = memoryStorage();
  saveDismissed(storage, 42);
  assert.equal(storage._raw(), undefined);
});

test('saveDismissed swallows a throwing backend (never throws)', () => {
  assert.doesNotThrow(() => saveDismissed(throwingStorage, 'x'));
});

// ---- isDismissed: the newer-timestamp RE-SHOW ------------------------------

test('isDismissed is true only when the stored stamp matches the current one', () => {
  const storage = memoryStorage();
  saveDismissed(storage, '2026-06-17T20:00:00Z');
  assert.equal(isDismissed(storage, '2026-06-17T20:00:00Z'), true);
});

test('isDismissed is false for a NEWER recommendation (re-show)', () => {
  const storage = memoryStorage();
  saveDismissed(storage, '2026-06-17T20:00:00Z');
  // A newer recommendation carries a different generated stamp → not dismissed.
  assert.equal(isDismissed(storage, '2026-06-17T21:30:00Z'), false);
});

test('isDismissed is false when nothing was ever dismissed', () => {
  assert.equal(isDismissed(memoryStorage(), '2026-06-17T20:00:00Z'), false);
});

test('isDismissed is false for every degraded store (malformed / stale / no backend)', () => {
  const g = '2026-06-17T20:00:00Z';
  assert.equal(isDismissed(memoryStorage('{not json'), g), false);
  const stale = JSON.stringify({ version: WHATS_NEXT_VERSION + 99, dismissedGenerated: g });
  assert.equal(isDismissed(memoryStorage(stale), g), false);
  assert.equal(isDismissed(null, g), false);
  assert.equal(isDismissed(throwingStorage, g), false);
});

test('isDismissed is false when the current generated is missing/blank', () => {
  const storage = memoryStorage();
  saveDismissed(storage, '2026-06-17T20:00:00Z');
  // An absent/empty current stamp can never equal a stored one → not dismissed.
  assert.equal(isDismissed(storage, ''), false);
  assert.equal(isDismissed(storage, null), false);
  assert.equal(isDismissed(storage, undefined), false);
});

// ---- formatStaleness (pure rendering cue, ADR-0027 §4) ---------------------

test('formatStaleness reads "just now" within the first minute', () => {
  const now = Date.parse('2026-06-17T20:00:30Z');
  assert.equal(formatStaleness('2026-06-17T20:00:00Z', now), 'just now');
});

test('formatStaleness reads minutes / hours / days ago', () => {
  const base = Date.parse('2026-06-17T20:00:00Z');
  assert.equal(formatStaleness('2026-06-17T19:55:00Z', base), '5 minutes ago');
  assert.equal(formatStaleness('2026-06-17T19:59:00Z', base), '1 minute ago');
  assert.equal(formatStaleness('2026-06-17T17:00:00Z', base), '3 hours ago');
  assert.equal(formatStaleness('2026-06-17T19:00:00Z', base), '1 hour ago');
  assert.equal(formatStaleness('2026-06-15T20:00:00Z', base), '2 days ago');
  assert.equal(formatStaleness('2026-06-16T20:00:00Z', base), '1 day ago');
});

test('formatStaleness returns "" for an unparseable / missing timestamp (never throws)', () => {
  const now = Date.parse('2026-06-17T20:00:00Z');
  assert.equal(formatStaleness('not a date', now), '');
  assert.equal(formatStaleness('', now), '');
  assert.equal(formatStaleness(null, now), '');
  assert.equal(formatStaleness(undefined, now), '');
});

test('formatStaleness clamps a FUTURE timestamp to "just now" (never negative)', () => {
  const now = Date.parse('2026-06-17T20:00:00Z');
  assert.equal(formatStaleness('2026-06-17T20:05:00Z', now), 'just now');
});
