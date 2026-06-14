// Tests for the dashboard board's pure, DOM-free modeling-command string builder
// (agentic-workflow-016). A backlog ticket's next action is to REFINE it by running
// `/agentheim:modeling <id>` in the Claude Code terminal; the board's copy
// affordance writes that exact command to the clipboard. The string itself is a
// pure function of the ticket id — no React, no DOM, no clipboard — so it is
// unit-testable under `node --test`, mirroring board-sort.js / board-data.js. The
// React wiring + the clipboard write in board.js is integration glue around it.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MODELING_COMMAND,
  QUICK_CAPTURE_COMMAND,
  modelingCommandFor,
} from '../app/modeling-command.js';

test('MODELING_COMMAND is the fully-qualified bare command (not the /modeling alias)', () => {
  assert.equal(MODELING_COMMAND, '/agentheim:modeling');
});

// agentic-workflow-020: the backlog "Add ticket" affordance becomes two launch
// buttons — Quick Capture (the fast idea-dump, renamed in aw-019) and Modeling
// (the full Socratic session). Both the launched (bridge POST /run body) and the
// copied (clipboard fallback) command strings are produced by this same pure
// module so there is one source of truth for the exact text.
test('QUICK_CAPTURE_COMMAND is the fully-qualified quick-capture command (aw-019 rename)', () => {
  assert.equal(QUICK_CAPTURE_COMMAND, '/agentheim:quick-capture');
});

test('the two launch commands are distinct and both fully-qualified `/agentheim:` forms', () => {
  assert.notEqual(QUICK_CAPTURE_COMMAND, MODELING_COMMAND);
  assert.match(QUICK_CAPTURE_COMMAND, /^\/agentheim:/);
  assert.match(MODELING_COMMAND, /^\/agentheim:/);
});

test('a ticket id yields the fully-qualified command with the id appended', () => {
  assert.equal(
    modelingCommandFor('agentic-workflow-016'),
    '/agentheim:modeling agentic-workflow-016',
  );
});

test('the add-button (no id) yields the bare command with no trailing id or space', () => {
  assert.equal(modelingCommandFor(), '/agentheim:modeling');
  assert.equal(modelingCommandFor(undefined), '/agentheim:modeling');
  assert.equal(modelingCommandFor(null), '/agentheim:modeling');
  assert.equal(modelingCommandFor(''), '/agentheim:modeling');
});

test('a non-string id degrades to the bare command — never "[object Object]", never a throw', () => {
  assert.equal(modelingCommandFor(42), '/agentheim:modeling');
  assert.equal(modelingCommandFor({}), '/agentheim:modeling');
  assert.equal(modelingCommandFor([]), '/agentheim:modeling');
});

test('a whitespace-padded id is trimmed before appending', () => {
  assert.equal(
    modelingCommandFor('  agentic-workflow-016  '),
    '/agentheim:modeling agentic-workflow-016',
  );
});

test('an all-whitespace id collapses to the bare command (treated as no id)', () => {
  assert.equal(modelingCommandFor('   '), '/agentheim:modeling');
});
