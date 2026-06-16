// Tests for the dashboard global-search FLAT → GROUPED transform
// (agentic-workflow-052).
//
// aw-050's GET /api/search returns a FLAT, already-ranked list of matches
// (`results: [{ category, title, excerpt, path, ...intent }]`, title-hits-first
// then by fixed category order). ds-016's SearchField wants
// `groups: [{ label, items }]`. This is the one load-bearing board-side decision:
// bucket the flat list into the four fixed-order category groups — Bounded
// contexts → Decisions → Research → Tickets — preserving the within-category
// order the endpoint already ranked, loss-tolerant (malformed/empty → [], never
// throw). It lives in its own framework-free module so it is unit-testable under
// `node --test` (no DOM), mirroring library-data / intent-route. The React wiring
// around it is locked by the static guard in topbar-search.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { searchResultsToGroups, GROUP_ORDER } from '../app/search-results.js';

function row(category, title, extra = {}) {
  return { category, title, excerpt: `${title} excerpt`, path: `${title}.md`, ...extra };
}

test('buckets a flat ranked list into the four fixed-order category groups', () => {
  const results = [
    row('Tickets', 't1', { status: 'todo', id: 't1', context: 'alpha' }),
    row('Bounded contexts', 'bc1', { type: 'context' }),
    row('Research', 'r1', { type: 'research' }),
    row('Decisions', 'd1', { type: 'adr' }),
  ];
  const groups = searchResultsToGroups(results);
  assert.deepEqual(groups.map((g) => g.label), GROUP_ORDER);
  assert.deepEqual(GROUP_ORDER, ['Bounded contexts', 'Decisions', 'Research', 'Tickets']);
});

test('preserves the within-category order received from the endpoint', () => {
  // aw-050 ranks title-hits-first inside each category; that order must survive.
  const results = [
    row('Decisions', 'd-title-hit', { type: 'adr' }),
    row('Decisions', 'd-body-hit', { type: 'adr' }),
    row('Bounded contexts', 'bc-a', { type: 'context' }),
    row('Bounded contexts', 'bc-b', { type: 'context' }),
  ];
  const groups = searchResultsToGroups(results);
  const decisions = groups.find((g) => g.label === 'Decisions');
  const bcs = groups.find((g) => g.label === 'Bounded contexts');
  assert.deepEqual(decisions.items.map((i) => i.title), ['d-title-hit', 'd-body-hit']);
  assert.deepEqual(bcs.items.map((i) => i.title), ['bc-a', 'bc-b']);
});

test('each item is the full result row unchanged (carries ...intent for routing)', () => {
  const ticket = row('Tickets', 't1', { status: 'doing', id: 't1', context: 'alpha' });
  const groups = searchResultsToGroups([ticket]);
  const tickets = groups.find((g) => g.label === 'Tickets');
  assert.deepEqual(tickets.items[0], ticket);
  // The intent fields the shell routes on survive verbatim.
  assert.equal(tickets.items[0].status, 'doing');
  assert.equal(tickets.items[0].path, 't1.md');
});

test('empty groups are passed through (ds-016 renders no header for a zero-row group)', () => {
  // The transform returns all four groups in fixed order; ds-016 filters empties.
  const groups = searchResultsToGroups([row('Tickets', 't1', { status: 'todo' })]);
  assert.deepEqual(groups.map((g) => g.label), GROUP_ORDER);
  const tickets = groups.find((g) => g.label === 'Tickets');
  assert.equal(tickets.items.length, 1);
  for (const g of groups) {
    if (g.label !== 'Tickets') assert.deepEqual(g.items, []);
  }
});

test('a result in an unknown category is dropped, never thrown on', () => {
  const groups = searchResultsToGroups([
    row('Mystery', 'm1'),
    row('Research', 'r1', { type: 'research' }),
  ]);
  const research = groups.find((g) => g.label === 'Research');
  assert.equal(research.items.length, 1);
  // No phantom group for the unknown category.
  assert.equal(groups.some((g) => g.label === 'Mystery'), false);
});

test('loss-tolerant: a malformed / empty result set yields all-empty groups, never a throw', () => {
  for (const bad of [null, undefined, 'nope', 42, {}, []]) {
    const groups = searchResultsToGroups(bad);
    assert.deepEqual(groups.map((g) => g.label), GROUP_ORDER);
    for (const g of groups) assert.deepEqual(g.items, []);
  }
});

test('individual malformed rows are skipped without throwing', () => {
  const groups = searchResultsToGroups([
    null,
    { title: 'no-category' },
    { category: 'Decisions', title: 'ok', type: 'adr' },
    42,
  ]);
  const decisions = groups.find((g) => g.label === 'Decisions');
  assert.equal(decisions.items.length, 1);
  assert.equal(decisions.items[0].title, 'ok');
});
