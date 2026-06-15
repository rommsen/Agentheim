// Static guard for the dashboard's "Stop dashboard" topbar control (agentic-workflow-028).
//
// Once the dashboard is open in the browser, the builder wants to stop the running
// server from the UI rather than returning to a session. The main-column topbar gains
// a quiet Stop dashboard button, set APART from the aw-029 [theme][skip-perms][Work]
// cluster so it never reads or fat-fingers as the Work primary. Clicking it REUSES the
// existing bridge launch path (launchOrCopy) to run `/agentheim:dashboard stop` — NOT a
// new server endpoint (ADR-0017 keeps server.mjs read-only). The seam decision (option
// B, builder 2026-06-15) is exactly this bridge-reuse.
//
// Post-stop UX is driven off launchOrCopy's discriminated return:
//   - res.via === 'bridge'   → the shell shows a full-pane "Dashboard stopped — safe to
//     close this tab" overlay over the main content area (optimistic on dispatch).
//   - res.via === 'clipboard' → NO overlay (nothing was actually stopped); the button
//     flashes the existing quiet "Copied" feedback only.
// The Stop button does NOT wear the armed/danger --obligation per-launch cue (aw-021 /
// ADR-0019) — that cue is for risky work launches, not a stop.
//
// The board's React glue has no DOM render harness in this project — the established
// idiom (aw-016/020/022/023/024/026) is source-reading static guards plus pure-module
// unit tests (the STOP_DASHBOARD_COMMAND constant is unit-tested in
// modeling-command.test.mjs). This suite locks the aw-028 wiring criteria.

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

test('the topbar imports and seeds the bare STOP_DASHBOARD_COMMAND (reusing launchOrCopy, no new endpoint)', () => {
  assert.match(boardSrc, /STOP_DASHBOARD_COMMAND/, 'board.js must consume STOP_DASHBOARD_COMMAND');
  assert.match(
    boardSrc,
    /import\s*\{[^}]*STOP_DASHBOARD_COMMAND[^}]*\}\s*from\s*"\.\/modeling-command\.js"/,
    'STOP_DASHBOARD_COMMAND must be imported from the pure modeling-command module',
  );
});

test('the topbar renders a Stop dashboard launch button seeded with STOP_DASHBOARD_COMMAND', () => {
  const top = fn('BoardTopbar');
  assert.match(top, /label="Stop dashboard"/, 'the topbar must render the Stop dashboard launch');
  const stop = top.match(/label="Stop dashboard"[\s\S]{0,400}?\/>/);
  assert.ok(stop, 'the Stop dashboard button must be present in the topbar');
  assert.match(stop[0], /command=\$\{STOP_DASHBOARD_COMMAND\}/, 'Stop must seed the bare STOP_DASHBOARD_COMMAND');
});

test('the Stop button is set APART from the [theme][skip-perms][Work] cluster (not inside it)', () => {
  const top = fn('BoardTopbar');
  const stopAt = top.indexOf('label="Stop dashboard"');
  const themeAt = top.indexOf('${ThemeToggle}');
  const workAt = top.indexOf('label="Work"');
  assert.ok(stopAt > -1 && themeAt > -1 && workAt > -1, 'Stop, theme, and Work must all render');
  // Apart means it does not sit BETWEEN the cluster controls. It renders either before
  // the whole cluster (far edge after the breadcrumb) or clearly after the Work primary.
  const insideCluster = stopAt > themeAt && stopAt < workAt;
  assert.ok(!insideCluster, 'the Stop button must NOT sit between the theme toggle and the Work launch');
});

test('the Stop button does NOT wear the armed/danger per-launch cue (it never threads skipPermissions)', () => {
  const top = fn('BoardTopbar');
  const stop = top.match(/label="Stop dashboard"[\s\S]{0,400}?\/>/);
  assert.ok(stop, 'the Stop dashboard button must be present');
  assert.doesNotMatch(stop[0], /skipPermissions/, 'Stop must NOT thread skipPermissions (no armed/danger cue — aw-021/ADR-0019 is a non-goal here)');
});

test('the Stop button fires with NO confirmation step (a single click launches)', () => {
  const top = fn('BoardTopbar');
  // No confirm()/window.confirm guard anywhere in the topbar — the click goes straight
  // through LaunchButton's onClick → launchOrCopy.
  assert.doesNotMatch(top, /confirm\s*\(/, 'the Stop launch must not be gated behind a confirmation prompt');
});

test('the topbar accepts an onStopped callback wired to the Stop button onResult, flipping shell state only on bridge', () => {
  const sig = boardSrc.match(/function BoardTopbar\(\{[^}]*\}\)/);
  assert.ok(sig, 'BoardTopbar must take a props object');
  assert.match(sig[0], /onStopped/, 'BoardTopbar must accept an onStopped prop from the shell');
  const top = fn('BoardTopbar');
  const stop = top.match(/label="Stop dashboard"[\s\S]{0,400}?\/>/);
  assert.ok(stop, 'the Stop dashboard button must be present');
  assert.match(stop[0], /onResult=/, 'Stop must pass an onResult to LaunchButton');
  // The onResult passed to Stop keys the shell-stopped flip off res.via === "bridge".
  assert.match(top, /res\.via === "bridge"/, 'the Stop onResult must flip the shell state only on a bridge dispatch');
});

test('DashboardApp owns a "stopped" shell state, flips it via onStopped, and mounts the overlay over the main content', () => {
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  assert.match(app, /\[stopped, setStopped\]\s*=\s*useState\(false\)/, 'DashboardApp must hold a stopped shell state (default false)');
  // The shell hands BoardTopbar an onStopped that flips the state to true.
  assert.match(app, /onStopped=/, 'DashboardApp must pass onStopped to BoardTopbar');
  assert.match(app, /setStopped\(true\)/, 'onStopped must flip the stopped state to true');
  // The overlay is mounted only when stopped, over the main content area.
  assert.match(app, /stopped\s*\?\s*html`<\$\{StoppedOverlay\}/, 'the StoppedOverlay must mount only when stopped is true');
});

test('a board-local StoppedOverlay carries the "stopped — safe to close" copy and is full-pane', () => {
  const overlay = fn('StoppedOverlay');
  assert.match(overlay, /Dashboard stopped — safe to close this tab/, 'the overlay must carry the "stopped — safe to close" copy');
  // Full-pane cover over the relatively-positioned content wrapper.
  assert.match(overlay, /position:\s*"absolute"/, 'the overlay must absolutely fill the main content area');
  assert.match(overlay, /inset:\s*0/, 'the overlay must cover the full content area (inset: 0)');
});

test('the stopped overlay is board-local and token-matched — NOT the Drawer side-panel primitive (ADR-0003)', () => {
  const overlay = fn('StoppedOverlay');
  // The overlay is composed from tokens; it must not reuse the Drawer side panel.
  assert.doesNotMatch(overlay, /<\$\{Drawer\}/, 'the stopped overlay must NOT use the Drawer side-panel primitive');
  assert.match(overlay, /var\(--surface-0\)/, 'the overlay must be token-matched (composed from styleguide tokens)');
});
