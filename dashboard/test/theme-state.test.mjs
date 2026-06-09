// Tests for the dashboard's persisted THEME choice (agentic-workflow-017).
//
// Theme (dark/light) is a sibling presentation concern to the board's per-column
// view-state (aw-014 / ADR-0015). It follows the SAME shape: a single versioned
// localStorage key with safe degradation — a malformed / stale-version / absent
// blob must NEVER blank or break the dashboard, it degrades to the SYSTEM default
// (the OS `prefers-color-scheme`). On first visit, with no stored override, the
// system preference wins; once the user toggles, that override is remembered
// across reloads.
//
// The store is pure over INJECTED backends (a storage stub + a prefers-dark
// boolean), framework-free, unit-tested under `node --test` with no DOM. The
// React wiring in board.js (Segmented in ShellRail, ThemeCtx.Provider, the
// data-theme/theme-fade effect) is integration glue around this.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  THEME_KEY,
  THEME_VERSION,
  THEMES,
  systemTheme,
  loadTheme,
  saveTheme,
  resolveTheme,
} from '../app/theme-state.js';

// A minimal in-memory localStorage stub over the one theme key.
function memoryStorage(initial) {
  const store = new Map();
  if (initial != null) store.set(THEME_KEY, initial);
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    _raw: () => store.get(THEME_KEY),
  };
}

test('the theme set is exactly dark + light', () => {
  assert.deepEqual([...THEMES].sort(), ['dark', 'light']);
});

test('systemTheme maps prefers-color-scheme:dark to dark, otherwise light', () => {
  // A matchMedia stub: matches===true means the dark query matched.
  const darkMM = () => ({ matches: true });
  const lightMM = () => ({ matches: false });
  assert.equal(systemTheme(darkMM), 'dark');
  assert.equal(systemTheme(lightMM), 'light');
  // No matchMedia available (SSR / old env) → fall back to the dark-first default.
  assert.equal(systemTheme(undefined), 'dark');
  assert.equal(systemTheme(null), 'dark');
});

test('loadTheme on an empty store returns null (no stored override)', () => {
  const storage = memoryStorage(null);
  assert.equal(loadTheme(storage), null);
});

test('a saved theme round-trips through load', () => {
  const storage = memoryStorage(null);
  saveTheme(storage, 'light');
  assert.equal(loadTheme(storage), 'light');
  saveTheme(storage, 'dark');
  assert.equal(loadTheme(storage), 'dark');
});

test('the persisted blob is versioned', () => {
  const storage = memoryStorage(null);
  saveTheme(storage, 'light');
  const parsed = JSON.parse(storage._raw());
  assert.equal(parsed.version, THEME_VERSION);
  assert.equal(parsed.theme, 'light');
});

test('a stored blob from a DIFFERENT version is ignored (returns null), never throws', () => {
  const stale = JSON.stringify({ version: THEME_VERSION + 999, theme: 'light' });
  const storage = memoryStorage(stale);
  assert.equal(loadTheme(storage), null);
});

test('malformed JSON in the store degrades to null, never throws', () => {
  const storage = memoryStorage('{not json');
  assert.equal(loadTheme(storage), null);
});

test('an unknown theme value in the store degrades to null, never throws', () => {
  const storage = memoryStorage(JSON.stringify({ version: THEME_VERSION, theme: 'chartreuse' }));
  assert.equal(loadTheme(storage), null);
});

test('a missing/undefined storage backend degrades to null, never throws', () => {
  assert.equal(loadTheme(undefined), null);
  assert.equal(loadTheme(null), null);
  assert.doesNotThrow(() => saveTheme(undefined, 'light'));
});

test('saveTheme refuses to persist an unknown theme (no garbage written)', () => {
  const storage = memoryStorage(null);
  saveTheme(storage, 'chartreuse');
  assert.equal(storage._raw(), undefined, 'an invalid theme must never be written');
});

// resolveTheme is the single first-paint decision: stored override beats the
// system preference; with no valid override the system preference wins.
test('resolveTheme: a valid stored override wins over the system preference', () => {
  const storage = memoryStorage(JSON.stringify({ version: THEME_VERSION, theme: 'light' }));
  // System prefers dark, but the user previously chose light → light.
  assert.equal(resolveTheme(storage, () => ({ matches: true })), 'light');
});

test('resolveTheme: first visit (no override) honors prefers-color-scheme', () => {
  const storage = memoryStorage(null);
  assert.equal(resolveTheme(storage, () => ({ matches: true })), 'dark');
  assert.equal(resolveTheme(storage, () => ({ matches: false })), 'light');
});

test('resolveTheme: a malformed/stale override degrades to the system default', () => {
  const malformed = memoryStorage('{not json');
  assert.equal(resolveTheme(malformed, () => ({ matches: false })), 'light');
  const stale = memoryStorage(JSON.stringify({ version: THEME_VERSION + 1, theme: 'light' }));
  assert.equal(resolveTheme(stale, () => ({ matches: true })), 'dark');
});
