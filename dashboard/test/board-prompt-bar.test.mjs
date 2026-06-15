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

// agentic-workflow-034: the celebration is reimplemented over canvas-confetti
// (amends ADR-0020). The hand-rolled CSS-keyframe burst is GONE — no @keyframes
// injection, no .agentheim-confetti-piece DOM spans. BoardConfetti now drives a
// canvas-confetti call from an origin near the prompt-bar buttons, fired once on
// remount, with colors resolved at fire time off the four status-palette bases.
// Trigger wiring (confettiKey / setConfettiKey / onResult) is UNCHANGED — only the
// implementation behind BoardConfetti swapped.
test('confetti honours prefers-reduced-motion: the canvas-confetti call is never invoked under reduce (ADR-0014)', () => {
  // BoardConfetti reads the matchMedia reduce flag and the fire path is guarded by
  // it — under reduce the canvas-confetti call (fireConfetti / confetti()) is never
  // reached, so the celebration shows NOTHING (ADR-0014 strip-to-plain).
  assert.match(
    boardSrc,
    /prefers-reduced-motion/,
    'confetti must be gated on prefers-reduced-motion (ADR-0014 strip-to-plain)',
  );
  const confettiFn = boardSrc.match(/function BoardConfetti[\s\S]*?\n}/);
  assert.ok(confettiFn, 'a board-local BoardConfetti component must exist');
  // The effect bails out under reduce (or a falsy fireKey) BEFORE firing.
  assert.match(
    confettiFn[0],
    /if\s*\(\s*reduce\s*\|\|\s*!fireKey\s*\)\s*return/,
    'the fire path must early-return under reduce (and on a falsy fireKey)',
  );
  assert.match(
    confettiFn[0],
    /fireConfetti\(/,
    'BoardConfetti must drive the canvas-confetti call (fireConfetti) once unguarded',
  );
});

test('the celebration is rendered by canvas-confetti, not the old CSS keyframes (aw-034 swap)', () => {
  // board.js imports the bundled canvas-confetti dependency.
  assert.match(
    boardSrc,
    /import\s+confetti\s+from\s+["']canvas-confetti["']/,
    'board.js must import the bundled canvas-confetti dependency',
  );
  // The old CSS-keyframe implementation is removed.
  assert.doesNotMatch(boardSrc, /@keyframes/, 'no @keyframes injection (CSS burst removed)');
  assert.doesNotMatch(boardSrc, /agentheim-confetti-piece/, 'no .agentheim-confetti-piece DOM spans (CSS burst removed)');
  assert.doesNotMatch(boardSrc, /ensureConfettiStyle/, 'ensureConfettiStyle (the keyframe injector) is gone');
});

test('the burst fires from canvas-confetti default global, with a dynamic origin computed at fire time (aw-035)', () => {
  const fire = boardSrc.match(/function fireConfetti[\s\S]*?\n}/);
  assert.ok(fire, 'a fireConfetti helper must drive the canvas-confetti call');
  // Default global confetti() (full-viewport canvas), not confetti.create(...).
  assert.match(fire[0], /\bconfetti\(\{/, 'must call the default global confetti({...})');
  assert.doesNotMatch(fire[0], /confetti\.create/, 'must use the default global, not a scoped confetti.create canvas');
  // aw-035: the origin/angle are no longer the hardcoded {x:0.18,y:0.92}/75 on the
  // fire path — they come from the launch geometry computed at fire time.
  assert.match(
    fire[0],
    /origin:\s*launch\.origin/,
    'the confetti() call must use the dynamically-computed origin (launch.origin), not a hardcoded literal',
  );
  assert.match(
    fire[0],
    /angle:\s*launch\.angle/,
    'the confetti() call must use the dynamically-computed aim (launch.angle), not a fixed angle',
  );
  assert.doesNotMatch(fire[0], /x:\s*0\.5\s*,\s*y:\s*0\.5/, 'must not fire from the stock {x:0.5,y:0.5} centre');
});

test('origin + aim are derived from the textarea live rect at FIRE TIME, aimed at the viewport center (aw-035)', () => {
  // board.js imports the pure launch-geometry helper.
  assert.match(
    boardSrc,
    /import\s*\{[^}]*confettiLaunchFromRect[^}]*\}\s*from\s*["']\.\/confetti-launch\.js["']/,
    'board.js must import confettiLaunchFromRect from the launch-geometry module',
  );
  const fire = boardSrc.match(/function fireConfetti[\s\S]*?\n}/);
  // The live on-screen rect is read at fire time (getBoundingClientRect + window
  // innerWidth/innerHeight), so a scrolled/resized board still fires correctly.
  assert.match(
    fire[0],
    /getBoundingClientRect\(\)/,
    'origin must be read from the textarea live rect at fire time (getBoundingClientRect)',
  );
  assert.match(
    fire[0],
    /window\.innerWidth/,
    'the rect must be normalized against the live viewport (window.innerWidth/innerHeight)',
  );
  assert.match(
    fire[0],
    /confettiLaunchFromRect\(/,
    'fireConfetti must delegate the origin/angle geometry to confettiLaunchFromRect',
  );
  // The prompt-bar textarea ref is plumbed down to BoardConfetti so the fire path
  // can read it.
  assert.match(boardSrc, /originRef=\$\{textareaRef\}/, 'the textarea ref must be passed to BoardConfetti as originRef');
  assert.match(boardSrc, /ref=\$\{textareaRef\}/, 'the textarea must carry the ref BoardConfetti reads at fire time');
});

test('colors are resolved at fire time off the four status bases (theme-aware), not a static var() list', () => {
  // board.js uses the pure resolver against getComputedStyle(documentElement).
  assert.match(
    boardSrc,
    /import\s*\{[^}]*resolveConfettiColors[^}]*\}\s*from\s*["']\.\/confetti-palette\.js["']/,
    'board.js must import resolveConfettiColors from the palette module',
  );
  const fire = boardSrc.match(/function fireConfetti[\s\S]*?\n}/);
  assert.match(
    fire[0],
    /resolveConfettiColors\(\s*getComputedStyle\(document\.documentElement\)\s*\)/,
    'colors must be resolved at fire time via getComputedStyle(document.documentElement)',
  );
  // The fire path holds NO static var(--st-*) color literal — colors come only from
  // the resolver (the old CSS CONFETTI_TOKENS list of var(--st-*) strings is gone).
  assert.doesNotMatch(fire[0], /var\(--st-/, 'fireConfetti must not hold a static var(--st-*) color literal (resolved at fire time now)');
  assert.doesNotMatch(boardSrc, /CONFETTI_TOKENS\s*=\s*\[/, 'the old in-board CONFETTI_TOKENS var(--st-*) array is gone (moved to the palette resolver)');
});
