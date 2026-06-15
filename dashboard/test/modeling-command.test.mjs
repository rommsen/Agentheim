// Tests for the dashboard board's pure, DOM-free modeling-command string builders.
//
// A backlog ticket invites two real actions: REFINE it (deepen via the full
// Socratic session) or PROMOTE it (readiness check + backlog → todo). The board's
// per-card affordance (agentic-workflow-022) seeds an interactive Claude session
// with the matching command — `/agentheim:modeling refine <id>` or
// `/agentheim:modeling promote <id>` — through the VS Code bridge, copying the same
// string to the clipboard when the bridge is absent. The backlog COLUMN affordance
// (aw-020) seeds the bare `/agentheim:modeling` (MODELING_COMMAND) and
// `/agentheim:quick-capture` (QUICK_CAPTURE_COMMAND).
//
// The command strings are pure functions of the ticket id — no React, no DOM, no
// clipboard — so they are unit-testable under `node --test`, mirroring
// board-sort.js / board-data.js. The React wiring + the bridge launch / clipboard
// write in board.js is integration glue around these builders.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MODELING_COMMAND,
  QUICK_CAPTURE_COMMAND,
  WORK_COMMAND,
  refineCommandFor,
  promoteCommandFor,
  quickCaptureCommandFor,
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

test('the two column launch commands are distinct and both fully-qualified `/agentheim:` forms', () => {
  assert.notEqual(QUICK_CAPTURE_COMMAND, MODELING_COMMAND);
  assert.match(QUICK_CAPTURE_COMMAND, /^\/agentheim:/);
  assert.match(MODELING_COMMAND, /^\/agentheim:/);
});

// agentic-workflow-024: the board prompt bar gains a right-side action column whose
// single Work button launches the EXECUTION skill — the bare `/agentheim:work`. Work
// ignores the typed prompt, so this is a bare CONSTANT (no `*CommandFor(prompt)`
// builder), mirroring MODELING_COMMAND / QUICK_CAPTURE_COMMAND.
test('WORK_COMMAND is the fully-qualified bare work command (not the /work alias)', () => {
  assert.equal(WORK_COMMAND, '/agentheim:work');
});

test('WORK_COMMAND is distinct from the authoring commands and fully-qualified', () => {
  assert.notEqual(WORK_COMMAND, MODELING_COMMAND);
  assert.notEqual(WORK_COMMAND, QUICK_CAPTURE_COMMAND);
  assert.match(WORK_COMMAND, /^\/agentheim:/);
});

// agentic-workflow-022: the per-card Refine / Promote launch buttons. The verbs are
// explicit (not bare-id implicit refine) so they read unambiguously to the
// `modeling` skill's REFINE / PROMOTE routing and stay symmetric.

test('refineCommandFor appends the explicit `refine <id>` verb+id to the fully-qualified command', () => {
  assert.equal(
    refineCommandFor('agentic-workflow-022'),
    '/agentheim:modeling refine agentic-workflow-022',
  );
});

test('promoteCommandFor appends the explicit `promote <id>` verb+id to the fully-qualified command', () => {
  assert.equal(
    promoteCommandFor('agentic-workflow-022'),
    '/agentheim:modeling promote agentic-workflow-022',
  );
});

test('refine and promote commands for the same id are distinct and carry their verb', () => {
  const r = refineCommandFor('agentic-workflow-022');
  const p = promoteCommandFor('agentic-workflow-022');
  assert.notEqual(r, p);
  assert.match(r, /^\/agentheim:modeling refine /);
  assert.match(p, /^\/agentheim:modeling promote /);
});

// The id-degradation contract — identical to the old modelingCommandFor (aw-016):
// a missing/empty/whitespace/non-string id must NOT produce a dangling command,
// "[object Object]", or a throw. With an explicit verb the only safe degradation is
// the bare verb command (`/agentheim:modeling refine`) — the skill then prompts for
// a target rather than the board guessing.

test('refineCommandFor with no id yields the verb command with no trailing id or space', () => {
  assert.equal(refineCommandFor(), '/agentheim:modeling refine');
  assert.equal(refineCommandFor(undefined), '/agentheim:modeling refine');
  assert.equal(refineCommandFor(null), '/agentheim:modeling refine');
  assert.equal(refineCommandFor(''), '/agentheim:modeling refine');
});

test('promoteCommandFor with no id yields the verb command with no trailing id or space', () => {
  assert.equal(promoteCommandFor(), '/agentheim:modeling promote');
  assert.equal(promoteCommandFor(undefined), '/agentheim:modeling promote');
  assert.equal(promoteCommandFor(null), '/agentheim:modeling promote');
  assert.equal(promoteCommandFor(''), '/agentheim:modeling promote');
});

test('a non-string id degrades to the bare verb command — never "[object Object]", never a throw', () => {
  assert.equal(refineCommandFor(42), '/agentheim:modeling refine');
  assert.equal(refineCommandFor({}), '/agentheim:modeling refine');
  assert.equal(refineCommandFor([]), '/agentheim:modeling refine');
  assert.equal(promoteCommandFor(42), '/agentheim:modeling promote');
  assert.equal(promoteCommandFor({}), '/agentheim:modeling promote');
  assert.equal(promoteCommandFor([]), '/agentheim:modeling promote');
});

test('a whitespace-padded id is trimmed before appending', () => {
  assert.equal(
    refineCommandFor('  agentic-workflow-022  '),
    '/agentheim:modeling refine agentic-workflow-022',
  );
  assert.equal(
    promoteCommandFor('  agentic-workflow-022  '),
    '/agentheim:modeling promote agentic-workflow-022',
  );
});

test('an all-whitespace id collapses to the bare verb command (treated as no id)', () => {
  assert.equal(refineCommandFor('   '), '/agentheim:modeling refine');
  assert.equal(promoteCommandFor('   '), '/agentheim:modeling promote');
});

// agentic-workflow-023: the board-level prompt bar. The relocated column buttons
// now seed the matching command WITH the typed prompt appended — a single space +
// the trimmed textarea contents — or the bare command when the textarea is empty.
// These prompt-taking builders mirror the aw-022 refine/promote shape and reuse the
// same degrade-on-empty contract: a missing / non-string / whitespace-only prompt
// returns the bare command (byte-identical to aw-020), never "[object Object]",
// never a doubled space, never a throw.

test('quickCaptureCommandFor appends a single space + the trimmed prompt', () => {
  assert.equal(
    quickCaptureCommandFor('a fast idea'),
    '/agentheim:quick-capture a fast idea',
  );
});

test('modelingCommandFor appends a single space + the trimmed prompt', () => {
  assert.equal(
    modelingCommandFor('model the billing context'),
    '/agentheim:modeling model the billing context',
  );
});

test('an empty / missing prompt yields the bare command (byte-identical to aw-020)', () => {
  assert.equal(quickCaptureCommandFor(), QUICK_CAPTURE_COMMAND);
  assert.equal(quickCaptureCommandFor(undefined), QUICK_CAPTURE_COMMAND);
  assert.equal(quickCaptureCommandFor(null), QUICK_CAPTURE_COMMAND);
  assert.equal(quickCaptureCommandFor(''), QUICK_CAPTURE_COMMAND);
  assert.equal(modelingCommandFor(), MODELING_COMMAND);
  assert.equal(modelingCommandFor(undefined), MODELING_COMMAND);
  assert.equal(modelingCommandFor(null), MODELING_COMMAND);
  assert.equal(modelingCommandFor(''), MODELING_COMMAND);
});

test('a whitespace-only prompt collapses to the bare command (no doubled / trailing space)', () => {
  assert.equal(quickCaptureCommandFor('   '), QUICK_CAPTURE_COMMAND);
  assert.equal(modelingCommandFor('   \n\t '), MODELING_COMMAND);
});

test('a whitespace-padded prompt is trimmed before appending (single separating space)', () => {
  assert.equal(
    quickCaptureCommandFor('  an idea  '),
    '/agentheim:quick-capture an idea',
  );
  assert.equal(
    modelingCommandFor('\t the domain \n'),
    '/agentheim:modeling the domain',
  );
});

test('a non-string prompt degrades to the bare command — never "[object Object]", never a throw', () => {
  assert.equal(quickCaptureCommandFor(42), QUICK_CAPTURE_COMMAND);
  assert.equal(quickCaptureCommandFor({}), QUICK_CAPTURE_COMMAND);
  assert.equal(quickCaptureCommandFor([]), QUICK_CAPTURE_COMMAND);
  assert.equal(modelingCommandFor(42), MODELING_COMMAND);
  assert.equal(modelingCommandFor({}), MODELING_COMMAND);
  assert.equal(modelingCommandFor([]), MODELING_COMMAND);
});

test('interior whitespace within the prompt is preserved (only the ends are trimmed)', () => {
  assert.equal(
    modelingCommandFor('  refine   the   thing  '),
    '/agentheim:modeling refine   the   thing',
  );
});
