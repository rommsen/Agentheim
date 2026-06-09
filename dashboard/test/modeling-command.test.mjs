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
  modelingCommandFor,
} from '../app/modeling-command.js';

test('MODELING_COMMAND is the fully-qualified bare command (not the /modeling alias)', () => {
  assert.equal(MODELING_COMMAND, '/agentheim:modeling');
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
