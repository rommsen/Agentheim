// Tests for the dashboard board's pure, DOM-free grouping transform
// (agentic-workflow-014). A board column can be GROUPED by bounded context: its
// already-sorted ticket list is partitioned into per-BC sections, ordered by BC
// name ascending, each carrying a card count and a collapsed flag. Like
// board-sort, this is a pure function over the projected list — it never touches
// the read model, the transform, or disk. That pure core is what is tested here
// (node --test, no DOM); the React wiring in board.js is integration glue.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { groupTickets } from '../app/board-group.js';

// A small fixture of already-sorted, projected tickets (sort happened upstream).
// Order here is the column's current sort order — grouping must PRESERVE it
// within each section, never re-order beyond partitioning.
function tickets() {
  return [
    { id: 'aw-002', title: 'Banana', context: 'agentic-workflow' },
    { id: 'inf-001', title: 'Apple', context: 'infrastructure' },
    { id: 'aw-001', title: 'Cherry', context: 'agentic-workflow' },
    { id: 'ds-001', title: 'Date', context: 'design-system' },
  ];
}

test('grouping off returns a single null-bc section holding the flat sorted list', () => {
  const out = groupTickets(tickets(), { grouped: false });
  assert.equal(out.length, 1);
  assert.equal(out[0].bc, null);
  assert.equal(out[0].grouped, false);
  // Flat list, original (sorted) order preserved, untouched.
  assert.deepEqual(out[0].tickets.map((t) => t.id), ['aw-002', 'inf-001', 'aw-001', 'ds-001']);
});

test('grouping on partitions tickets into per-BC sections', () => {
  const out = groupTickets(tickets(), { grouped: true });
  assert.deepEqual(out.map((s) => s.bc), ['agentic-workflow', 'design-system', 'infrastructure']);
});

test('sections are ordered by BC name ascending', () => {
  const out = groupTickets(tickets(), { grouped: true });
  const names = out.map((s) => s.bc);
  assert.deepEqual(names, [...names].sort());
});

test('each section carries a card count and grouped=true', () => {
  const out = groupTickets(tickets(), { grouped: true });
  const aw = out.find((s) => s.bc === 'agentic-workflow');
  assert.equal(aw.count, 2);
  assert.equal(aw.tickets.length, 2);
  assert.equal(aw.grouped, true);
});

test('cards within a section preserve the incoming sort order (grouping never re-sorts)', () => {
  const out = groupTickets(tickets(), { grouped: true });
  const aw = out.find((s) => s.bc === 'agentic-workflow');
  // aw-002 came before aw-001 in the sorted input; partitioning keeps that.
  assert.deepEqual(aw.tickets.map((t) => t.id), ['aw-002', 'aw-001']);
});

test('a BC with zero cards renders no section (no empty headers)', () => {
  const out = groupTickets(tickets(), { grouped: true });
  // Only the three BCs that actually have cards appear.
  assert.equal(out.length, 3);
  assert.ok(out.every((s) => s.count > 0));
});

test('a collapsed BC is flagged collapsed but still carries its tickets and count', () => {
  const out = groupTickets(tickets(), { grouped: true, collapsed: ['agentic-workflow'] });
  const aw = out.find((s) => s.bc === 'agentic-workflow');
  const ds = out.find((s) => s.bc === 'design-system');
  assert.equal(aw.collapsed, true);
  assert.equal(aw.count, 2, 'collapsing retains the count');
  assert.equal(aw.tickets.length, 2, 'tickets are still present (the UI hides them)');
  assert.equal(ds.collapsed, false, 'a non-collapsed section stays expanded');
});

test('collapsed accepts a Set as well as an array', () => {
  const out = groupTickets(tickets(), { grouped: true, collapsed: new Set(['infrastructure']) });
  assert.equal(out.find((s) => s.bc === 'infrastructure').collapsed, true);
  assert.equal(out.find((s) => s.bc === 'design-system').collapsed, false);
});

test('an empty / missing context groups under a defined label, never undefined, never a throw', () => {
  const input = [
    { id: 'x-1', title: 'A', context: '' },
    { id: 'x-2', title: 'B' }, // context absent
    { id: 'y-1', title: 'C', context: 'zeta' },
  ];
  const out = groupTickets(input, { grouped: true });
  // The two context-less cards share one section; its bc is a defined string.
  const noCtx = out.find((s) => s.tickets.some((t) => t.id === 'x-1'));
  assert.equal(typeof noCtx.bc, 'string');
  assert.deepEqual(noCtx.tickets.map((t) => t.id), ['x-1', 'x-2']);
});

test('grouping never mutates the input list', () => {
  const input = tickets();
  const snapshot = input.map((t) => t.id);
  groupTickets(input, { grouped: true });
  assert.deepEqual(input.map((t) => t.id), snapshot);
});

test('degrades to an empty array for null/undefined/non-array input — never throws', () => {
  assert.deepEqual(groupTickets(null, { grouped: true }), []);
  assert.deepEqual(groupTickets(undefined, { grouped: false }), []);
  assert.deepEqual(groupTickets({}, { grouped: true }), []);
});

test('a missing options object defaults to flat (grouped off), never throws', () => {
  const out = groupTickets(tickets());
  assert.equal(out.length, 1);
  assert.equal(out[0].grouped, false);
  assert.deepEqual(out[0].tickets.map((t) => t.id), ['aw-002', 'inf-001', 'aw-001', 'ds-001']);
});
