// Tests for the dashboard board's persisted view-state store
// (agentic-workflow-014). This is the single versioned localStorage store that
// survives a reload: each column's grouped/flat choice, its sort choice, and its
// per-(column, BC) collapse state. It REVERSES ADR-0009's "no localStorage" clause
// (and supersedes aw-012's in-session-only sort) — but it is VIEW-STATE ONLY: it
// never carries lifecycle truth, which stays a projection of disk.
//
// The store is pure over an INJECTED storage backend (no real localStorage needed
// here), so load/save/merge logic is unit-tested under `node --test` with a tiny
// in-memory stub. The React wiring in board.js is integration glue around it.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  VIEW_STATE_VERSION,
  defaultColumnState,
  loadViewState,
  saveViewState,
} from '../app/board-view-state.js';
import { DEFAULT_SORT } from '../app/board-sort.js';

// A minimal in-memory localStorage stub: just getItem/setItem over one key.
function memoryStorage(initial) {
  const store = new Map();
  if (initial != null) store.set('agentheim.board.viewState', initial);
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    _raw: () => store.get('agentheim.board.viewState'),
  };
}

test('defaultColumnState is flat + default sort + all-expanded', () => {
  const d = defaultColumnState();
  assert.equal(d.grouped, false);
  assert.equal(d.sort, DEFAULT_SORT);
  assert.deepEqual(d.collapsed, []);
});

test('loadViewState on an empty store returns an empty object (every column defaults)', () => {
  const storage = memoryStorage(null);
  assert.deepEqual(loadViewState(storage), {});
});

test('a saved view-state round-trips through load', () => {
  const storage = memoryStorage(null);
  const state = {
    done: { grouped: true, sort: 'title-asc', collapsed: ['infrastructure'] },
    todo: { grouped: false, sort: DEFAULT_SORT, collapsed: [] },
  };
  saveViewState(storage, state);
  assert.deepEqual(loadViewState(storage), state);
});

test('the persisted blob is versioned', () => {
  const storage = memoryStorage(null);
  saveViewState(storage, { done: defaultColumnState() });
  const parsed = JSON.parse(storage._raw());
  assert.equal(parsed.version, VIEW_STATE_VERSION);
  assert.ok(parsed.columns, 'columns payload is nested under the version envelope');
});

test('a stored blob from a DIFFERENT version is ignored (returns empty), never throws', () => {
  const stale = JSON.stringify({ version: VIEW_STATE_VERSION + 999, columns: { done: { grouped: true } } });
  const storage = memoryStorage(stale);
  assert.deepEqual(loadViewState(storage), {});
});

test('malformed JSON in the store degrades to empty, never throws', () => {
  const storage = memoryStorage('{not json');
  assert.deepEqual(loadViewState(storage), {});
});

test('a missing/undefined storage backend degrades to empty, never throws', () => {
  assert.deepEqual(loadViewState(undefined), {});
  assert.deepEqual(loadViewState(null), {});
  // saving with no backend is a silent no-op, not a throw.
  assert.doesNotThrow(() => saveViewState(undefined, { done: defaultColumnState() }));
});

test('a stored column with partial/garbage fields is normalized on load (never NaN, never throws)', () => {
  const blob = JSON.stringify({
    version: VIEW_STATE_VERSION,
    columns: {
      done: { grouped: 'yes', sort: 'bogus-sort', collapsed: 'not-an-array' },
      todo: {},
    },
  });
  const storage = memoryStorage(blob);
  const loaded = loadViewState(storage);
  // grouped coerced to boolean; unknown sort falls back to default; collapsed
  // forced to an array.
  assert.equal(loaded.done.grouped, true);
  assert.equal(loaded.done.sort, DEFAULT_SORT);
  assert.deepEqual(loaded.done.collapsed, []);
  assert.equal(loaded.todo.grouped, false);
  assert.equal(loaded.todo.sort, DEFAULT_SORT);
});
