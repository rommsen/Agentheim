// Tests for the dashboard open-intent ROUTER (agentic-workflow-027).
//
// aw-027 splits the single open-intent sink into TWO render targets keyed on
// ARTIFACT KIND: a board TASK intent (carries a lifecycle `status`) routes to the
// right-hand SlideOver; a non-task DOCUMENT intent (a rail/library row, carries a
// styleguide content `type` and NO `status`) routes to the MAIN PANE reader. The
// discriminator is the only load-bearing branch, so it lives in a pure module
// tested here under `node --test` (no DOM) — mirroring slide-over-data /
// library-data. The wiring around it (two React states, the reader) is locked by
// the static guard in main-pane-reader.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isTaskIntent } from '../app/intent-route.js';

test('a board task intent (carries a lifecycle status) is a task → slide-over', () => {
  assert.equal(isTaskIntent(
    { id: 'alpha-002', title: 'A task', status: 'todo', type: 'feature',
      path: '.agentheim/contexts/alpha/todo/alpha-002.md' },
  ), true);
});

test('a task intent in any lifecycle status routes to the slide-over', () => {
  for (const status of ['backlog', 'todo', 'doing', 'done']) {
    assert.equal(isTaskIntent({ id: 'x', status, path: 'p.md' }), true, `status=${status}`);
  }
});

test('a non-task document intent (a content type, no status) is NOT a task → main pane', () => {
  // The shapes treeToLibrary emits: vision / map / context / adr / research.
  for (const type of ['vision', 'map', 'context', 'adr', 'research']) {
    assert.equal(isTaskIntent({ id: `doc-${type}`, type, title: type, path: `${type}.md` }), false, `type=${type}`);
  }
});

test('an intent with a falsy/absent status is treated as a non-task document', () => {
  assert.equal(isTaskIntent({ type: 'adr', path: 'p.md' }), false);
  assert.equal(isTaskIntent({ type: 'adr', status: '', path: 'p.md' }), false);
  assert.equal(isTaskIntent({ type: 'adr', status: null, path: 'p.md' }), false);
});

test('a null/undefined intent is not a task (nothing to route)', () => {
  assert.equal(isTaskIntent(null), false);
  assert.equal(isTaskIntent(undefined), false);
});
