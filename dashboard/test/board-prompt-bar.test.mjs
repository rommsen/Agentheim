// Static guard for the board-level prompt bar (agentic-workflow-023).
//
// aw-020's bare Quick Capture / Modeling column buttons are RELOCATED out of the
// backlog column into a board-level prompt bar: a multi-line textarea rendered on
// the BOARD view only (between the shell header and the board columns, above the
// BoardHeader count strip), with the two launch buttons beneath it. Clicking a
// button seeds the matching command WITH the typed prompt appended
// (quickCaptureCommandFor / modelingCommandFor); on a successful launch/copy the
// textarea is cleared and a confetti animation plays. Empty textarea -> bare
// command (byte-identical to aw-020). Scope is the TWO COLUMN buttons only — the
// per-card Refine/Promote pair (aw-022) stays id-seeded and is untouched here.
//
// The board's React glue has no DOM render harness in this project — the idiom
// (aw-016/020/022) is: pure string builders get node --test coverage
// (modeling-command.test.mjs), the bridge decision gets coverage
// (bridge-launch.test.mjs), and the board's wiring is guarded by reading its
// source. This suite locks the aw-023 acceptance criteria that are not pure string
// logic.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');

test('a board-level prompt bar component owns a multi-line <textarea>', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  assert.match(bar[0], /<textarea/, 'the prompt bar must render a multi-line textarea');
});

test('the prompt bar is rendered inside DashboardBoard, above the BoardHeader count strip', () => {
  const render = boardSrc.match(/return html`\s*<div>\s*<\$\{BoardPromptBar\}[\s\S]*?<\$\{BoardHeader\}/);
  assert.ok(
    render,
    'DashboardBoard must render BoardPromptBar before (above) BoardHeader',
  );
});

test('the relocated column launch buttons live in the prompt bar, not in BoardColumn', () => {
  // BacklogLaunchPair (the old in-column wrapper) is no longer rendered inside
  // BoardColumn at the backlog line.
  assert.doesNotMatch(
    boardSrc,
    /status === "backlog" && html`<\$\{BacklogLaunchPair\}/,
    'BacklogLaunchPair must no longer be rendered inside the backlog column',
  );
  // The two labelled buttons are in the prompt bar instead.
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.match(bar[0], /label="Quick Capture"/, 'prompt bar must render Quick Capture');
  assert.match(bar[0], /label="Modeling"/, 'prompt bar must render Modeling');
});

test('the buttons seed the prompt-taking builders with the live textarea value', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.match(
    bar[0],
    /command=\$\{quickCaptureCommandFor\(/,
    'Quick Capture must seed quickCaptureCommandFor(prompt)',
  );
  assert.match(
    bar[0],
    /command=\$\{modelingCommandFor\(/,
    'Modeling must seed modelingCommandFor(prompt)',
  );
});

test('the prompt bar threads skipPermissions through to the relocated buttons (aw-021 preserved)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  // The component accepts skipPermissions and passes it to each LaunchButton.
  assert.match(bar[0], /skipPermissions/, 'prompt bar must accept/forward skipPermissions');
  const qc = bar[0].match(/label="Quick Capture"[\s\S]{0,260}?\/>/);
  const mo = bar[0].match(/label="Modeling"[\s\S]{0,260}?\/>/);
  assert.ok(qc && mo, 'both relocated buttons must be present');
  assert.match(qc[0], /skipPermissions=\$\{skipPermissions\}/, 'Quick Capture must carry skipPermissions');
  assert.match(mo[0], /skipPermissions=\$\{skipPermissions\}/, 'Modeling must carry skipPermissions');
});

test('DashboardBoard threads skipPermissions into the prompt bar', () => {
  assert.match(
    boardSrc,
    /<\$\{BoardPromptBar\}[\s\S]{0,200}skipPermissions=\$\{skipPermissions\}/,
    'DashboardBoard must pass skipPermissions to BoardPromptBar',
  );
});

test('a successful launch/copy clears the textarea and fires confetti; silent (no copy) does neither', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  // On a bridge launch OR a landed clipboard copy, the value is cleared and the
  // confetti is triggered; a fully-silent action (clipboard blocked too) returns
  // early without clearing or celebrating.
  assert.match(bar[0], /via === "bridge"|res\.via/, 'must inspect the launchOrCopy result');
  assert.match(bar[0], /res\.copied/, 'must check whether the clipboard copy landed');
  assert.match(bar[0], /confetti|celebrate|burst/i, 'a successful action must fire confetti');
});

// agentic-workflow-024: the prompt bar is re-laid-out into a left/right split — the
// textarea narrows to ~two-thirds (left) and a right-side action column (~one third)
// holds a single Work button. Quick Capture / Modeling stay in their row beneath the
// textarea, unchanged. Work launches the BARE /agentheim:work (WORK_COMMAND),
// ignores the prompt, threads skipPermissions, and does NOT clear/confetti.
test('the prompt bar wraps the textarea + a right-side action column in a horizontal split (aw-024)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  // A horizontal flex split sits above the Quick Capture / Modeling row.
  assert.match(
    bar[0],
    /flexDirection:\s*"row"|flexDirection:\s*'row'|flex:\s*2|flexBasis/,
    'the textarea and action column must share a horizontal split',
  );
});

test('the textarea is no longer full-width (it shares the bar with the action column)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  const textarea = bar[0].match(/<textarea[\s\S]*?\/>/);
  assert.ok(textarea, 'the prompt bar must still render a textarea');
  // The textarea takes ~two-thirds via flex, not a hard width:100%.
  assert.doesNotMatch(
    textarea[0],
    /width:\s*"100%"/,
    'the textarea must no longer be width:100% — it shares the split with the action column',
  );
});

test('the right-side action column holds a single Work button seeding the bare WORK_COMMAND (aw-024)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.match(bar[0], /label="Work"/, 'prompt bar must render a Work button');
  const work = bar[0].match(/label="Work"[\s\S]{0,260}?\/>/);
  assert.ok(work, 'Work button must be present');
  // Work seeds the bare constant, NOT a prompt-taking builder.
  assert.match(work[0], /command=\$\{WORK_COMMAND\}/, 'Work must seed the bare WORK_COMMAND');
});

test('Work threads skipPermissions but does NOT pass onResult (no clear / no confetti) (aw-024)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  const work = bar[0].match(/label="Work"[\s\S]{0,260}?\/>/);
  assert.ok(work, 'Work button must be present');
  assert.match(work[0], /skipPermissions=\$\{skipPermissions\}/, 'Work must carry skipPermissions (aw-021/ADR-0019)');
  assert.doesNotMatch(work[0], /onResult/, 'Work must NOT pass onResult — it never consumed the prompt');
});

test('board.js imports WORK_COMMAND from modeling-command (aw-024)', () => {
  assert.match(
    boardSrc,
    /import\s*\{[^}]*WORK_COMMAND[^}]*\}\s*from\s*"\.\/modeling-command\.js"/,
    'board.js must import the WORK_COMMAND constant',
  );
});

test('confetti honours prefers-reduced-motion and avoids the reserved selection accent (ADR-0014 / ADR-0016)', () => {
  // The confetti is board-local (the styleguide has no celebration motion). It must
  // be strippable under reduced motion and must NOT use the reserved selection
  // accent --accent-ochre-soft (ADR-0016) for its pieces.
  assert.match(
    boardSrc,
    /prefers-reduced-motion/,
    'confetti must be gated on prefers-reduced-motion (ADR-0014 strip-to-plain)',
  );
  const confetti = boardSrc.match(/function BoardConfetti[\s\S]*?\n}/);
  assert.ok(confetti, 'a board-local BoardConfetti component must exist');
  assert.doesNotMatch(
    confetti[0],
    /--accent-ochre-soft/,
    'confetti must not paint with the reserved selection accent (ADR-0016)',
  );
});
