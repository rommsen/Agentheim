// Tests for the dashboard board's pure, DOM-free sort comparator
// (agentic-workflow-012). Each lifecycle column on the board gets its own
// independent sort control; the REORDERING itself is a pure function over the
// already-projected ticket list (after board-data.treeToColumns) — it never
// touches the read model, the transform, or disk. That pure core is what is
// tested here (node --test, no DOM); the React wiring in board.js is integration
// glue around it.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SORT_OPTIONS,
  DEFAULT_SORT,
  sortTickets,
} from '../app/board-sort.js';

// A small ticket fixture in the projected TicketCard shape. `mtimeMs` is the
// epoch-ms file modification time the /api/tree projection carries (aw-013);
// some tickets deliberately have it absent/null to exercise graceful degradation.
function tickets() {
  return [
    { id: 'beta-002', title: 'Banana', mtimeMs: 2000 },
    { id: 'alpha-001', title: 'Apple', mtimeMs: 3000 },
    { id: 'alpha-003', title: 'Cherry', mtimeMs: 1000 },
  ];
}

test('SORT_OPTIONS lists the four orderings, in control order', () => {
  assert.deepEqual(
    SORT_OPTIONS.map((o) => o.value),
    ['mtime-desc', 'mtime-asc', 'title-asc', 'title-desc'],
  );
  // Every option carries a human label for the control.
  for (const o of SORT_OPTIONS) assert.equal(typeof o.label, 'string');
});

test('DEFAULT_SORT is modification-date descending', () => {
  assert.equal(DEFAULT_SORT, 'mtime-desc');
  assert.ok(SORT_OPTIONS.some((o) => o.value === DEFAULT_SORT));
});

test('mtime-desc puts the most recently modified card at the top', () => {
  const out = sortTickets(tickets(), 'mtime-desc');
  assert.deepEqual(out.map((t) => t.id), ['alpha-001', 'beta-002', 'alpha-003']);
});

test('mtime-asc puts the oldest modified card at the top', () => {
  const out = sortTickets(tickets(), 'mtime-asc');
  assert.deepEqual(out.map((t) => t.id), ['alpha-003', 'beta-002', 'alpha-001']);
});

test('title-asc orders by title A→Z (case-insensitive)', () => {
  const out = sortTickets(tickets(), 'title-asc');
  assert.deepEqual(out.map((t) => t.title), ['Apple', 'Banana', 'Cherry']);
});

test('title-desc orders by title Z→A', () => {
  const out = sortTickets(tickets(), 'title-desc');
  assert.deepEqual(out.map((t) => t.title), ['Cherry', 'Banana', 'Apple']);
});

test('title-asc collates case-insensitively (not all-capitals-first)', () => {
  const input = [
    { id: 'c-1', title: 'cherry', mtimeMs: 1 },
    { id: 'b-1', title: 'Banana', mtimeMs: 1 },
    { id: 'a-1', title: 'apple', mtimeMs: 1 },
  ];
  // Code-point order would put the capital 'Banana' before lowercase 'apple';
  // locale collation orders them alphabetically regardless of case.
  assert.deepEqual(
    sortTickets(input, 'title-asc').map((t) => t.title),
    ['apple', 'Banana', 'cherry'],
  );
});

test('title-asc collates accented/umlaut letters near their base letter, not after z', () => {
  const input = [
    { id: 'z-1', title: 'Zebra', mtimeMs: 1 },
    { id: 'ae-1', title: 'Ärger', mtimeMs: 1 },
    { id: 'a-1', title: 'Apple', mtimeMs: 1 },
  ];
  // Code-point order would push 'Ärger' after 'Zebra' (ä > z in UTF-16);
  // collation keeps it next to the base 'A'.
  assert.deepEqual(
    sortTickets(input, 'title-asc').map((t) => t.title),
    ['Apple', 'Ärger', 'Zebra'],
  );
});

test('title-asc collates leading-number titles naturally (2 before 10)', () => {
  const input = [
    { id: 'b-1', title: '10 things', mtimeMs: 1 },
    { id: 'a-1', title: '2 things', mtimeMs: 1 },
  ];
  // Code-point order would put '10…' before '2…' (the char '1' < '2');
  // numeric collation reads the run as numbers, so 2 sorts before 10.
  assert.deepEqual(
    sortTickets(input, 'title-asc').map((t) => t.title),
    ['2 things', '10 things'],
  );
});

test('title-desc is the exact reverse of the collated order', () => {
  const input = [
    { id: 'c-1', title: 'cherry', mtimeMs: 1 },
    { id: 'b-1', title: 'Banana', mtimeMs: 1 },
    { id: 'a-1', title: 'apple', mtimeMs: 1 },
  ];
  assert.deepEqual(
    sortTickets(input, 'title-desc').map((t) => t.title),
    ['cherry', 'Banana', 'apple'],
  );
});

test('a missing/non-string title degrades to empty and never throws', () => {
  const input = [
    { id: 'b-1', title: 'Apple', mtimeMs: 1 },
    { id: 'a-1', mtimeMs: 1 }, // title absent
    { id: 'c-1', title: 42, mtimeMs: 1 }, // non-string title
  ];
  // The two degraded titles sort as "" (before any letter), then break by id asc.
  assert.deepEqual(
    sortTickets(input, 'title-asc').map((t) => t.id),
    ['a-1', 'c-1', 'b-1'],
  );
});

test('title ties break by id ascending', () => {
  const input = [
    { id: 'ctx-002', title: 'Same', mtimeMs: 10 },
    { id: 'ctx-001', title: 'Same', mtimeMs: 20 },
  ];
  assert.deepEqual(sortTickets(input, 'title-asc').map((t) => t.id), ['ctx-001', 'ctx-002']);
  // Even descending by title, an exact title tie still breaks id ASCending
  // (deterministic, not mirrored) — a stable, predictable order.
  assert.deepEqual(sortTickets(input, 'title-desc').map((t) => t.id), ['ctx-001', 'ctx-002']);
});

test('modification-date ties break by id ascending', () => {
  const input = [
    { id: 'ctx-002', title: 'B', mtimeMs: 500 },
    { id: 'ctx-001', title: 'A', mtimeMs: 500 },
  ];
  assert.deepEqual(sortTickets(input, 'mtime-desc').map((t) => t.id), ['ctx-001', 'ctx-002']);
  assert.deepEqual(sortTickets(input, 'mtime-asc').map((t) => t.id), ['ctx-001', 'ctx-002']);
});

test('a null/absent mtimeMs sorts as OLDEST, then breaks by id — never NaN, never throws', () => {
  const input = [
    { id: 'ctx-003', title: 'C', mtimeMs: 100 },
    { id: 'ctx-002', title: 'B', mtimeMs: null },
    { id: 'ctx-001', title: 'A' }, // mtimeMs absent
  ];
  // Descending: the dated card is newest (top); the two undated cards are oldest
  // (bottom), ordered among themselves by id ascending.
  assert.deepEqual(
    sortTickets(input, 'mtime-desc').map((t) => t.id),
    ['ctx-003', 'ctx-001', 'ctx-002'],
  );
  // Ascending: the undated (oldest) cards come first, id-ascending, then dated.
  assert.deepEqual(
    sortTickets(input, 'mtime-asc').map((t) => t.id),
    ['ctx-001', 'ctx-002', 'ctx-003'],
  );
});

test('sortTickets returns a NEW array and does not mutate its input', () => {
  const input = tickets();
  const snapshot = input.map((t) => t.id);
  const out = sortTickets(input, 'mtime-desc');
  assert.notEqual(out, input, 'a new array is returned');
  assert.deepEqual(input.map((t) => t.id), snapshot, 'input order is untouched');
});

test('an unknown/missing sort key falls back to the default (mtime-desc), never throws', () => {
  const out = sortTickets(tickets(), 'nonsense');
  assert.deepEqual(out.map((t) => t.id), ['alpha-001', 'beta-002', 'alpha-003']);
  // No key at all → still the default ordering, no throw.
  assert.deepEqual(sortTickets(tickets()).map((t) => t.id), ['alpha-001', 'beta-002', 'alpha-003']);
});

test('degrades to an empty array for null/undefined/non-array input — never throws', () => {
  assert.deepEqual(sortTickets(null, 'title-asc'), []);
  assert.deepEqual(sortTickets(undefined, 'mtime-desc'), []);
  assert.deepEqual(sortTickets({}, 'mtime-desc'), []);
});
