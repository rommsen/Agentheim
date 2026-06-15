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

// agentic-workflow-026: the shell is relaid-out to the styleguide §05 left-rail
// layout, and the Work launch MOVES OUT of the prompt bar into the main-column
// topbar (BoardTopbar). aw-024's two-thirds/one-third split collapses back: the
// prompt bar keeps ONLY its textarea + the Quick Capture / Modeling pair. The Work
// button (WORK_COMMAND, threaded skipPermissions, no onResult) now lives on the
// topbar — see shell-relayout.test.mjs for its new home.
test('the prompt bar no longer renders a Work button (relocated to the topbar in aw-026)', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  assert.doesNotMatch(
    bar[0],
    /label="Work"/,
    'the prompt bar must NOT render a Work button — it moved to the main-column topbar (aw-026)',
  );
});

test('the prompt bar no longer carries the aw-024 two-thirds/one-third action column', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  // The split collapses back: no right-side action column / flex:2 textarea split.
  assert.doesNotMatch(
    bar[0],
    /Run the ready backlog/,
    'the right-side Work action column must be removed',
  );
});

test('board.js still imports WORK_COMMAND from modeling-command (now used by the topbar)', () => {
  assert.match(
    boardSrc,
    /import\s*\{[^}]*WORK_COMMAND[^}]*\}\s*from\s*"\.\/modeling-command\.js"/,
    'board.js must import the WORK_COMMAND constant (the topbar Work launch reuses it)',
  );
});

// agentic-workflow-025: a TEMPORARY replay-on-demand trigger for the celebration
// confetti, confined to one clearly-commented block in BoardPromptBar. It reuses the
// existing confettiKey state UNCHANGED — a second, unconditional caller of
// setConfettiKey((k)=>k+1) — and must NOT launch, hit the bridge, copy, clear the
// textarea, or write lifecycle state. These guards lock that wiring (and the single
// removable block) without a DOM harness.
test('a temporary aw-025 block adds a confetti-replay button to the prompt-bar button row', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar component must exist');
  // The temp control lives in a single clearly-commented fenced block.
  const block = bar[0].match(/TEMP \(aw-025\)[\s\S]*?END TEMP \(aw-025\)/);
  assert.ok(block, 'the temp button must be a single TEMP (aw-025) … END TEMP (aw-025) block');
  // It renders a button inside the prompt-bar button row.
  assert.match(block[0], /<button/, 'the temp block must render a <button>');
});

test('the aw-025 temp button bumps the existing confettiKey and does nothing else', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  const block = bar[0].match(/TEMP \(aw-025\)[\s\S]*?END TEMP \(aw-025\)/);
  assert.ok(block, 'the temp block must exist');
  // Reuses the existing remount trigger unchanged.
  assert.match(
    block[0],
    /setConfettiKey\(\(k\)\s*=>\s*k\s*\+\s*1\)/,
    'the temp button must bump confettiKey via the existing setConfettiKey((k) => k + 1)',
  );
  // No launch / bridge / clipboard / textarea-clear inside the temp block.
  assert.doesNotMatch(block[0], /launchOrCopy|LaunchButton|command=/, 'the temp button must not launch or hit the bridge');
  assert.doesNotMatch(block[0], /clipboard/i, 'the temp button must not copy to the clipboard');
  assert.doesNotMatch(block[0], /setPrompt\(/, 'the temp button must not clear/touch the textarea');
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
