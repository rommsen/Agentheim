// Tests for the dashboard board's pure /api/tree → column-tickets transform
// (agentic-workflow-006). The board view itself is a thin React shell over the
// styleguide's Column/TicketCard; the load-bearing, framework-free logic is this
// transform, so that is what is tested here (node --test, no DOM).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { COLUMN_ORDER, treeToColumns, treeTicket } from '../app/board-data.js';

function sampleTree() {
  return {
    root: '/proj',
    locations: { vision: null, contextMap: null, adrs: [], research: [] },
    contexts: [
      {
        name: 'alpha',
        lifecycle: {
          backlog: [
            { id: 'alpha-001', title: 'A backlog task', status: 'backlog', type: 'feature', context: 'alpha', path: '.agentheim/contexts/alpha/backlog/alpha-001.md' },
          ],
          todo: [
            { id: 'alpha-002', title: 'A todo task', status: 'todo', type: 'feature', context: 'alpha', path: '.agentheim/contexts/alpha/todo/alpha-002.md' },
          ],
          doing: [],
          done: [
            { id: 'alpha-003', title: 'A done task', status: 'done', type: 'chore', context: 'alpha', path: '.agentheim/contexts/alpha/done/alpha-003.md' },
          ],
        },
      },
      {
        name: 'beta',
        lifecycle: {
          backlog: [],
          todo: [
            { id: 'beta-001', title: 'Another todo task', status: 'todo', type: 'bug', context: 'beta', path: '.agentheim/contexts/beta/todo/beta-001.md' },
          ],
          doing: [
            { id: 'beta-002', title: 'A doing task', status: 'doing', type: 'feature', context: 'beta', path: '.agentheim/contexts/beta/doing/beta-002.md' },
          ],
          done: [],
        },
      },
    ],
  };
}

test('COLUMN_ORDER is the four lifecycle columns in order', () => {
  assert.deepEqual(COLUMN_ORDER, ['backlog', 'todo', 'doing', 'done']);
});

test('treeToColumns produces exactly the four lifecycle columns', () => {
  const cols = treeToColumns(sampleTree());
  assert.deepEqual(Object.keys(cols).sort(), ['backlog', 'doing', 'done', 'todo']);
});

test('tasks from ALL bounded contexts are pooled into one flat column (no swimlanes)', () => {
  const cols = treeToColumns(sampleTree());
  // todo column carries alpha-002 AND beta-001 — two different BCs, one column.
  const todoIds = cols.todo.map((t) => t.id).sort();
  assert.deepEqual(todoIds, ['alpha-002', 'beta-001']);
  const todoContexts = new Set(cols.todo.map((t) => t.context));
  assert.deepEqual([...todoContexts].sort(), ['alpha', 'beta']);
});

test('each card carries its BC in the context field (the chip label) and its source path', () => {
  const cols = treeToColumns(sampleTree());
  const beta = cols.doing.find((t) => t.id === 'beta-002');
  assert.equal(beta.context, 'beta');
  assert.equal(beta.path, '.agentheim/contexts/beta/doing/beta-002.md');
});

test('a card lands in the column matching its status, not necessarily its folder origin', () => {
  // A task whose frontmatter status disagrees with its folder still files under status.
  const tree = sampleTree();
  tree.contexts[0].lifecycle.backlog[0].status = 'doing';
  const cols = treeToColumns(tree);
  assert.ok(cols.doing.some((t) => t.id === 'alpha-001'), 'status-driven placement');
  assert.ok(!cols.backlog.some((t) => t.id === 'alpha-001'), 'no longer in backlog');
});

test('an unknown status is bucketed conservatively into backlog so no card is lost', () => {
  const tree = sampleTree();
  tree.contexts[0].lifecycle.todo[0].status = 'weird';
  const cols = treeToColumns(tree);
  assert.ok(cols.backlog.some((t) => t.id === 'alpha-002'));
});

test('empty contexts/locations do not throw and yield four empty columns', () => {
  const cols = treeToColumns({ contexts: [] });
  for (const c of COLUMN_ORDER) assert.deepEqual(cols[c], []);
});

test('a missing tree (null/undefined) degrades to four empty columns', () => {
  const cols = treeToColumns(null);
  for (const c of COLUMN_ORDER) assert.deepEqual(cols[c], []);
});

test('treeTicket maps a tree task into the TicketCard shape the styleguide expects', () => {
  const t = treeTicket({
    id: 'alpha-002', title: 'A todo task', status: 'todo',
    type: 'feature', context: 'alpha',
    path: '.agentheim/contexts/alpha/todo/alpha-002.md',
  });
  // The styleguide TicketCard reads: id, title, status, context, est, updated, agent.
  assert.equal(t.id, 'alpha-002');
  assert.equal(t.title, 'A todo task');
  assert.equal(t.status, 'todo');
  assert.equal(t.context, 'alpha');
  assert.equal(t.path, '.agentheim/contexts/alpha/todo/alpha-002.md');
  // The card renders these — they must be present (defined) so the card never shows undefined.
  assert.notEqual(t.est, undefined);
  assert.notEqual(t.updated, undefined);
});

test('treeTicket carries mtimeMs through so the board-side sort can order by it (aw-012/aw-013)', () => {
  // The /api/tree projection carries each task's file modification time (aw-013);
  // the default board sort (modification date descending, aw-012) needs it on the
  // projected ticket. Pass it through unchanged.
  const t = treeTicket({
    id: 'alpha-002', title: 'A todo task', status: 'todo',
    type: 'feature', context: 'alpha',
    path: '.agentheim/contexts/alpha/todo/alpha-002.md',
    mtimeMs: 1717000000000,
  });
  assert.equal(t.mtimeMs, 1717000000000);
});

test('treeTicket leaves mtimeMs null when the read model could not stat the file', () => {
  // aw-013/ADR-0002: mtimeMs is null when the file cannot be stat'd. The board
  // sort treats null as oldest — so it must arrive as null, not undefined/0.
  const t = treeTicket({ id: 'x-1', title: 'x', status: 'todo', mtimeMs: null });
  assert.equal(t.mtimeMs, null);
  const t2 = treeTicket({ id: 'x-2', title: 'x', status: 'todo' });
  assert.equal(t2.mtimeMs, null);
});
