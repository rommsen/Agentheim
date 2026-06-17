// Static guards for the board's LaunchButton hover + armed-icon cue
// (agentic-workflow-030, narrowed further by agentic-workflow-041).
//
// Two changes locked here, both board-local in board.js's LaunchButton:
//   1. HOVER (all non-flashed buttons): hover now raises the button with a stronger
//      box-shadow (styleguide --shadow-sm/--shadow-md, consumed unforked — ADR-0003)
//      AND a background highlight. The content must NOT move (no translateY/transform).
//      This replaces the old border-only onMouseEnter/onMouseLeave handlers; the
//      :focus/focusable affordance stays intact.
//   2. ARMED cue narrowed to the RED ICON (amends ADR-0019, aw-041): the separate
//      indicator DOT is GONE — the icon is ALWAYS rendered. When skip-permissions is
//      armed, the icon is tinted --obligation (the at-a-glance per-launch "skips
//      permissions" cue mandated by amended ADR-0018 — a narrowing of aw-030's
//      dot-only treatment, not a reversal). The button body (border + label color)
//      is identical to an unarmed button in both states.
//
// The launch PAYLOAD is unchanged (armed → skipPermissions:true, unarmed omits it);
// that contract is unit-tested in bridge-launch.test.mjs. The SkipPermissionsToggle
// keeps its full --obligation danger treatment (out of scope here).
//
// The board has no DOM render harness in this project — the established idiom
// (aw-016/020/022/023/024/026/028) is source-reading static guards over board.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');

function fn(name) {
  const m = boardSrc.match(new RegExp(`function ${name}\\b[\\s\\S]*?\\n}`));
  assert.ok(m, `${name} must exist in board.js`);
  return m[0];
}

test('LaunchButton hover applies a stronger box-shadow from the styleguide --shadow scale', () => {
  const lb = fn('LaunchButton');
  const enter = lb.match(/onMouseEnter=\$\{[\s\S]*?\}\}/);
  assert.ok(enter, 'LaunchButton must have an onMouseEnter handler');
  assert.match(
    enter[0],
    /boxShadow[\s\S]*?var\(--shadow-(sm|md)\)/,
    'hover must set a box-shadow from the styleguide --shadow-sm/--shadow-md scale (consumed unforked)',
  );
});

test('LaunchButton hover changes the background to highlight the pointer-over state', () => {
  const lb = fn('LaunchButton');
  const enter = lb.match(/onMouseEnter=\$\{[\s\S]*?\}\}/);
  assert.ok(enter, 'LaunchButton must have an onMouseEnter handler');
  assert.match(
    enter[0],
    /\.background\s*=/,
    'hover must change the background to signal the pointer is over the button',
  );
});

test('LaunchButton hover does NOT move the content (no translateY / transform offset)', () => {
  const lb = fn('LaunchButton');
  // No transform/translateY anywhere in LaunchButton — the raise is shadow+bg only.
  assert.doesNotMatch(lb, /translateY/, 'hover must not nudge the content with translateY');
  assert.doesNotMatch(lb, /\.transform\s*=/, 'hover must not set a transform offset on the button');
});

test('LaunchButton onMouseLeave restores the resting box-shadow and background', () => {
  const lb = fn('LaunchButton');
  const leave = lb.match(/onMouseLeave=\$\{[\s\S]*?\}\}/);
  assert.ok(leave, 'LaunchButton must have an onMouseLeave handler');
  assert.match(leave[0], /boxShadow\s*=/, 'leave must reset the box-shadow');
  assert.match(leave[0], /\.background\s*=/, 'leave must reset the background');
});

test('LaunchButton keeps the focusable affordance intact', () => {
  const lb = fn('LaunchButton');
  assert.match(lb, /className="focusable"/, 'LaunchButton must keep the focusable class for the :focus affordance');
});

// aw-068 (press de-inverted): a liftOnHover PRESS must stay in-theme — it keeps the
// bright hover chrome (--surface-2 fill / --fg-1 text) and only drops the lift shadow.
// The old press swapped roles (--fg-1 fill + --surface-0 text), which read as a theme
// inversion (dark-on-press in light mode, light-on-press in dark). The mousedown handler
// must therefore NOT paint the background --fg-1 nor the text --surface-0.
test('liftOnHover press does NOT invert the scheme (mousedown stays in-theme)', () => {
  const lb = fn('LaunchButton');
  const down = lb.match(/onMouseDown=\$\{[\s\S]*?\}\}/);
  assert.ok(down, 'LaunchButton must have an onMouseDown handler');
  assert.doesNotMatch(down[0], /background\s*=\s*"var\(--fg-1\)"/, 'press must not fill the background with --fg-1 (no inversion)');
  assert.doesNotMatch(down[0], /color\s*=\s*"var\(--surface-0\)"/, 'press must not paint the text --surface-0 (no inversion)');
  // It DOES settle into the in-theme highlight fill.
  assert.match(down[0], /background\s*=\s*"var\(--surface-2\)"/, 'press must keep the in-theme --surface-2 highlight fill');
});

test('armed LaunchButton no longer paints the button-wide --obligation label color or border', () => {
  const lb = fn('LaunchButton');
  // The color/border lines must not branch on `armed` to --obligation anymore.
  assert.doesNotMatch(
    lb,
    /color:[^,\n]*armed[^,\n]*var\(--obligation\)/,
    'the armed branch must NOT tint the label with --obligation (narrowed to the dot — aw-030)',
  );
  assert.doesNotMatch(
    lb,
    /border:[^,\n]*armed[^,\n]*var\(--obligation\)/,
    'the armed branch must NOT border the button with --obligation (narrowed to the dot — aw-030)',
  );
});

test('armed LaunchButton no longer renders a separate indicator dot element (aw-041)', () => {
  const lb = fn('LaunchButton');
  // The dot was a tiny --obligation-filled square span (width/height + borderRadius 99);
  // it is removed entirely — no --obligation-backgrounded element survives.
  assert.doesNotMatch(
    lb,
    /background:\s*"var\(--obligation\)"/,
    'the separate --obligation-filled indicator dot must be gone (icon-tint replaces it — aw-041)',
  );
  assert.doesNotMatch(
    lb,
    /This launch skips permissions/,
    'the standalone dot span and its title must be removed (aw-041)',
  );
});

test('LaunchButton ALWAYS renders the icon — no armed/unarmed swap (aw-041)', () => {
  const lb = fn('LaunchButton');
  // The Icon is rendered unconditionally now (not gated behind an `armed` ternary).
  assert.match(lb, /<\$\{Icon\}/, 'LaunchButton must render the Icon component');
  assert.doesNotMatch(
    lb,
    /armed[\s\S]*?\?[\s\S]*?<span[\s\S]*?:[\s\S]*?<\$\{Icon\}/,
    'the icon must NOT be rendered only in the non-armed branch of an `armed ? dot : icon` ternary',
  );
});

test('armed LaunchButton tints the ICON with --obligation; unarmed icon keeps its normal color (aw-041)', () => {
  const lb = fn('LaunchButton');
  // Find the Icon element and assert its color prop branches on armed -> --obligation.
  const iconEl = lb.match(/<\$\{Icon\}[\s\S]*?\/>/);
  assert.ok(iconEl, 'LaunchButton must have an Icon element');
  assert.match(
    iconEl[0],
    /armed[\s\S]*?var\(--obligation\)/,
    'the icon color must be tinted --obligation when armed',
  );
});

test('armed LaunchButton keeps the aria-label/title "skips permissions" wording', () => {
  const lb = fn('LaunchButton');
  assert.match(lb, /\(skips permissions\)/, 'the armed aria-label must keep the "skips permissions" wording');
  assert.match(lb, /skip-permissions|dangerously-skip-permissions/, 'the armed title must explain the skip-permissions launch');
});
