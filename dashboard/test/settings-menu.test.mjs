// Static guard for the dashboard's topbar SETTINGS MENU (agentic-workflow-049).
//
// The main-column topbar had accumulated four controls — Stop dashboard, theme,
// skip-permissions, and the Work launch. aw-049 collapses the first three utility
// controls behind a single SETTINGS GEAR (the existing `settings-2` glyph) sitting
// immediately LEFT of the standing Work button. Clicking the gear opens a board-local,
// token-matched dropdown (path 2 — no styleguide Menu/Popover primitive exists, so this
// is composed from tokens UNFORKED, the sort-<select> / group-by precedent, ADR-0003).
//
// The four resolved decisions (2026-06-16):
//   1. board-local dropdown (no styleguide source edit; ds-015 is the later shared primitive)
//   2. reuse the existing `settings-2` glyph (no new cog glyph)
//   3. the CLOSED gear carries NO armed cue — the --obligation danger hue lives ONLY on
//      the skip-permissions toggle INSIDE the open menu (amended ADR-0019)
//   4. the theme + skip-permissions toggles KEEP the menu open; the menu closes on
//      selecting Stop dashboard, on Esc, and on outside click
//
// The three relocated controls keep their existing implementations + persistence AS-IS
// (relocation, not rewrite): ThemeToggle (theme-state.js), SkipPermissionsToggle
// (--obligation armed treatment, skip-permissions-state.js), the Stop dashboard launch
// (STOP_DASHBOARD_COMMAND via launchOrCopy) + the post-stop StoppedOverlay.
//
// The board's React glue has no DOM render harness in this project — the established
// idiom (aw-016/020/022/023/024/026/028) is source-reading static guards. This suite
// locks the aw-049 acceptance criteria.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');
const styleguideIcons = readFileSync(
  path.join(dashboardDir, '..', '.agentheim', 'contexts', 'design-system', 'styleguide', 'app', 'icons.js'),
  'utf8',
);

function fn(name) {
  const m = boardSrc.match(new RegExp(`function ${name}\\b[\\s\\S]*?\\n}`));
  assert.ok(m, `${name} must exist in board.js`);
  return m[0];
}

test('a SettingsMenu component exists and the topbar mounts it', () => {
  assert.match(boardSrc, /function SettingsMenu\b/, 'board.js must define a SettingsMenu component');
  const top = fn('BoardTopbar');
  assert.match(top, /<\$\{SettingsMenu\}/, 'the topbar must mount the SettingsMenu');
});

test('the gear is the existing settings-2 glyph (decision 2 — no new cog glyph, no styleguide edit)', () => {
  const menu = fn('SettingsMenu');
  assert.match(menu, /name="settings-2"/, 'the gear must render the existing settings-2 glyph via Icon');
  // The reused glyph already exists in the styleguide icon set — no new glyph added.
  assert.match(styleguideIcons, /"settings-2":/, 'settings-2 must already exist in the styleguide icon set');
});

test('the gear sits immediately LEFT of the standing Work button in the topbar', () => {
  const top = fn('BoardTopbar');
  const menuAt = top.indexOf('${SettingsMenu}');
  const workAt = top.indexOf('label="Work"');
  assert.ok(menuAt > -1 && workAt > -1, 'both the SettingsMenu and the Work launch must render in the topbar');
  assert.ok(menuAt < workAt, 'the settings gear must render immediately before (left of) the Work launch');
});

test('the Work button remains a STANDING button in the topbar — not moved into the menu', () => {
  const top = fn('BoardTopbar');
  assert.match(top, /label="Work"/, 'the topbar must still render the standing Work launch');
  const menu = fn('SettingsMenu');
  assert.doesNotMatch(menu, /label="Work"/, 'the Work launch must NOT live inside the settings menu');
  assert.match(top, /command=\$\{WORK_COMMAND\}/, 'Work must seed the bare WORK_COMMAND');
  assert.match(top, /skipPermissions=\$\{skipPermissions\}/, 'Work must thread skipPermissions (aw-021/ADR-0019)');
});

test('the three utility controls live ONLY inside the menu — not inline in the topbar', () => {
  const top = fn('BoardTopbar');
  const menu = fn('SettingsMenu');
  // The menu hosts exactly the three relocated controls.
  assert.match(menu, /<\$\{ThemeToggle\}/, 'the menu must host the theme toggle');
  assert.match(menu, /<\$\{SkipPermissionsToggle\}/, 'the menu must host the skip-permissions toggle');
  assert.match(menu, /label="Stop dashboard"/, 'the menu must host the Stop dashboard launch');
  // None of the three is rendered directly by the topbar any more (they moved into the menu).
  assert.doesNotMatch(top, /<\$\{ThemeToggle\}/, 'the theme toggle must NOT render inline in the topbar');
  assert.doesNotMatch(top, /<\$\{SkipPermissionsToggle\}/, 'the skip-permissions toggle must NOT render inline in the topbar');
  assert.doesNotMatch(top, /label="Stop dashboard"/, 'the Stop dashboard control must NOT render inline in the topbar');
});

test('the menu contains EXACTLY the three relocated controls (no more, no less)', () => {
  const menu = fn('SettingsMenu');
  assert.equal((menu.match(/<\$\{ThemeToggle\}/g) || []).length, 1, 'exactly one theme toggle in the menu');
  assert.equal((menu.match(/<\$\{SkipPermissionsToggle\}/g) || []).length, 1, 'exactly one skip-permissions toggle in the menu');
  assert.equal((menu.match(/label="Stop dashboard"/g) || []).length, 1, 'exactly one Stop dashboard control in the menu');
});

test('the relocated controls keep their behavior + persistence (relocation, not rewrite)', () => {
  const menu = fn('SettingsMenu');
  // Theme toggle still feeds the theme props (theme-state.js persistence threaded from DashboardApp).
  assert.match(menu, /<\$\{ThemeToggle\}[\s\S]*?value=\$\{theme\}/, 'the theme toggle keeps its value/onChange threading');
  // Skip-permissions toggle keeps its armed/onToggle threading (skip-permissions-state.js persistence).
  assert.match(menu, /<\$\{SkipPermissionsToggle\}[\s\S]*?armed=\$\{skipPermissions\}/, 'the skip-permissions toggle keeps its armed threading');
  // Stop dashboard keeps the launchOrCopy bridge path (STOP_DASHBOARD_COMMAND) + onResult wiring.
  const stop = menu.match(/label="Stop dashboard"[\s\S]{0,400}?\/>/);
  assert.ok(stop, 'the Stop dashboard launch must be present in the menu');
  assert.match(stop[0], /command=\$\{STOP_DASHBOARD_COMMAND\}/, 'Stop must seed STOP_DASHBOARD_COMMAND');
  assert.match(stop[0], /onResult=/, 'Stop must pass onResult (drives the post-stop overlay)');
});

test('the skip-permissions toggle still wears its --obligation armed treatment inside the menu', () => {
  // The SkipPermissionsToggle implementation is unchanged (relocation): it still paints
  // --obligation when armed. Guard that the danger hue survives — it is the toggle, not
  // the menu chrome, that carries it.
  const toggle = fn('SkipPermissionsToggle');
  assert.match(toggle, /var\(--obligation\)/, 'the skip-permissions toggle keeps its --obligation armed hue inside the menu');
});

test('the CLOSED gear carries NO armed cue (decision 3 — danger lives only on the toggle inside the open menu)', () => {
  const menu = fn('SettingsMenu');
  // The gear trigger button must not branch its color on the armed/skipPermissions flag.
  // Isolate the trigger button (up to where the open-state dropdown begins).
  const trigger = menu.match(/<button[\s\S]*?name="settings-2"[\s\S]*?<\/button>/);
  assert.ok(trigger, 'the gear trigger button must render the settings-2 glyph');
  assert.doesNotMatch(trigger[0], /--obligation/, 'the closed gear must NOT wear the --obligation armed hue');
  assert.doesNotMatch(trigger[0], /skipPermissions\s*\?/, 'the gear trigger must not condition its look on the armed flag');
});

test('the gear is keyboard-operable: focusable, with the focusable class and a clear aria-label', () => {
  const menu = fn('SettingsMenu');
  const trigger = menu.match(/<button[\s\S]*?name="settings-2"[\s\S]*?<\/button>/);
  assert.ok(trigger, 'the gear trigger button must exist');
  assert.match(trigger[0], /className="focusable"/, 'the gear must carry the focusable class (keyboard focus ring)');
  assert.match(trigger[0], /aria-label=/, 'the gear must carry an aria-label naming it as settings');
  assert.match(trigger[0], /aria-expanded=/, 'the gear must expose its open/closed state via aria-expanded');
  assert.match(trigger[0], /aria-haspopup=/, 'the gear must declare it pops up a menu (aria-haspopup)');
});

test('the menu dismisses on Esc and on outside click; toggles keep it open (decision 4)', () => {
  const menu = fn('SettingsMenu');
  // Esc handling.
  assert.match(menu, /Escape/, 'the menu must close on Escape');
  // Outside-click dismiss is wired via a document listener (mousedown/pointerdown).
  assert.match(menu, /mousedown|pointerdown/, 'the menu must dismiss on an outside click (document listener)');
  // A ref scopes "inside" so clicks within the menu do not dismiss it (needed so toggles keep it open).
  assert.match(menu, /useRef/, 'the menu must use a ref to scope inside-vs-outside clicks');
  // Selecting Stop dashboard closes the menu; the toggles do NOT (they only thread their existing handlers).
  // Guard that the Stop control's onResult path closes the menu while the toggles keep their plain handlers.
  const stop = menu.match(/label="Stop dashboard"[\s\S]{0,400}?\/>/);
  assert.ok(stop, 'the Stop control must be present');
});

test('any open/close transition honors prefers-reduced-motion (token-matched, not hardcoded)', () => {
  const menu = fn('SettingsMenu');
  // Reduced-motion guard for the dropdown reveal.
  assert.match(menu, /prefers-reduced-motion/, 'the open/close transition must honor prefers-reduced-motion');
});

test('the dropdown is token-matched (styleguide tokens, no hardcoded colors) — board-local, no styleguide edit', () => {
  const menu = fn('SettingsMenu');
  // Surfaces / hairlines / shadow come from tokens.
  assert.match(menu, /var\(--surface-/, 'the dropdown surface must use a styleguide surface token');
  assert.match(menu, /var\(--hairline\)/, 'the dropdown border must use the styleguide hairline token');
  // No raw hex colors in the menu chrome.
  assert.doesNotMatch(menu, /#[0-9a-fA-F]{3,6}\b/, 'the dropdown must not hardcode hex colors (token-matched)');
});

test('no styleguide source file is edited — the gear reuses the unforked settings-2 glyph (decision 1/2, ADR-0003)', () => {
  // The Icon import (the unforked styleguide icon set) is the only glyph source.
  assert.match(boardSrc, /import\s*\{\s*Icon\s*\}\s*from\s*"[^"]*styleguide\/app\/icons\.js"/, 'the gear glyph must come from the unforked styleguide Icon');
});
