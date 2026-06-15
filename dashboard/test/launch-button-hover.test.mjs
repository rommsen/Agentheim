// Static guards for the board's LaunchButton hover + toned-down armed cue
// (agentic-workflow-030).
//
// Two changes locked here, both board-local in board.js's LaunchButton:
//   1. HOVER (all non-flashed buttons): hover now raises the button with a stronger
//      box-shadow (styleguide --shadow-sm/--shadow-md, consumed unforked — ADR-0003)
//      AND a background highlight. The content must NOT move (no translateY/transform).
//      This replaces the old border-only onMouseEnter/onMouseLeave handlers; the
//      :focus/focusable affordance stays intact.
//   2. ARMED cue narrowed to the DOT alone (amends ADR-0019): when skip-permissions is
//      armed, a launch button no longer carries the --obligation border or the
//      --obligation label color — its body is identical to an unarmed button. The
//      --obligation indicator DOT remains (the at-a-glance per-launch "skips
//      permissions" cue mandated by amended ADR-0018 — a narrowing, not a reversal).
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

test('armed LaunchButton STILL renders the --obligation indicator dot (per-launch cue kept)', () => {
  const lb = fn('LaunchButton');
  // The dot is the surviving per-launch cue: an --obligation-filled span shown when armed.
  assert.match(
    lb,
    /armed[\s\S]*?background:\s*"var\(--obligation\)"/,
    'the armed branch must still render the --obligation-filled indicator dot',
  );
  assert.match(
    lb,
    /This launch skips permissions/,
    'the indicator dot must keep its "skips permissions" wording',
  );
});

test('armed LaunchButton keeps the aria-label/title "skips permissions" wording', () => {
  const lb = fn('LaunchButton');
  assert.match(lb, /\(skips permissions\)/, 'the armed aria-label must keep the "skips permissions" wording');
  assert.match(lb, /skip-permissions|dangerously-skip-permissions/, 'the armed title must explain the skip-permissions launch');
});
