// Static guard for the dashboard shell relayout (agentic-workflow-026).
//
// The live shell is rewritten from a horizontal top header over a centered 1160px
// <main> to the styleguide §05 "Components in context" layout: a full-height left
// RAIL beside a MAIN COLUMN (a ~52px topbar over the scrollable board). The rail is
// composed from styleguide PRIMITIVES (Glyph / RailItem / TreeGroup / TreeItem) —
// NOT the styleguide AppRail (hardwired to the demo LIBRARY) — and fed the LIVE
// treeToLibrary(tree) projection. The Board RailItem is the only nav item; the
// always-visible Workspace tree IS the library. The theme + skip-permissions
// toggles live in the main-column TOPBAR, left of the theme-following Work launch
// (aw-029 placement; aw-033 made the launch follow the scheme); the rail no
// longer renders a toggle footer. No styleguide file is modified.
//
// The board's React glue has no DOM render harness in this project — the established
// idiom (aw-016/020/022/023/024) is source-reading static guards plus pure-module
// unit tests. This suite locks the aw-026 acceptance criteria that are not pure
// string logic; the prompt-bar Work removal is locked in board-prompt-bar.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');
const styleguideRail = readFileSync(
  path.join(dashboardDir, '..', '.agentheim', 'contexts', 'design-system', 'styleguide', 'app', 'library.js'),
  'utf8',
);

function fn(name) {
  const m = boardSrc.match(new RegExp(`function ${name}\\b[\\s\\S]*?\\n}`));
  assert.ok(m, `${name} must exist in board.js`);
  return m[0];
}

test('DashboardApp renders a flex-row shell (rail beside a main column), not a centered <main>', () => {
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  assert.match(app, /flexDirection:\s*"row"/, 'the shell must be a horizontal flex row');
  // The retired centered 1160px <main> wrapper must be gone.
  assert.doesNotMatch(app, /maxWidth:\s*1160/, 'the centered 1160px main wrapper must be retired');
});

test('the shell mounts the ShellRail beside the board main column', () => {
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  assert.match(app, /<\$\{ShellRail\}/, 'DashboardApp must mount ShellRail');
  assert.match(app, /<\$\{DashboardBoard\}/, 'DashboardApp must mount the board in the main column');
});

test('the board↔library view toggle and the full-pane DashboardLibrary surface are retired', () => {
  // No view state branch, no separate Library full-pane mount.
  assert.doesNotMatch(boardSrc, /view === "library"/, 'the library full-pane branch must be gone');
  assert.doesNotMatch(boardSrc, /<\$\{DashboardLibrary\}/, 'the DashboardLibrary full pane must not be mounted');
});

test('ShellRail is a vertical full-height nav composed from styleguide primitives', () => {
  const rail = fn('ShellRail');
  assert.match(rail, /flexDirection:\s*"column"/, 'the rail must stack vertically (full-height column)');
  assert.match(rail, /<\$\{Glyph\}/, 'rail brand must use the styleguide Glyph');
  assert.match(rail, /<\$\{RailItem\}[\s\S]*?label="Board"/, 'rail must have a Board RailItem');
  assert.match(rail, /<\$\{TreeGroup\}/, 'rail must render the live tree via styleguide TreeGroup');
});

test('the rail has a SINGLE nav RailItem (Board) — no separate Library RailItem', () => {
  const rail = fn('ShellRail');
  const railItems = rail.match(/<\$\{RailItem\}/g) || [];
  assert.equal(railItems.length, 1, 'exactly one RailItem (Board) — the tree below is the library');
  assert.doesNotMatch(rail, /label="Library"/, 'there must be no separate Library RailItem');
});

test('the rail tree is fed the LIVE treeToLibrary projection, never the demo LIBRARY constant', () => {
  const rail = fn('ShellRail');
  assert.match(rail, /treeToLibrary/, 'the rail tree must come from treeToLibrary(tree)');
  // The styleguide demo LIBRARY constant must never be imported or rendered by the
  // dashboard (a comment may name it; iterating it — LIBRARY.map — would be a fork).
  assert.doesNotMatch(boardSrc, /\bLIBRARY\.map\b|import\s*\{[^}]*\bLIBRARY\b/, 'the dashboard must not consume the styleguide demo LIBRARY');
  // The dashboard does not consume the hardwired AppRail (it composes primitives).
  assert.doesNotMatch(boardSrc, /<\$\{AppRail\}/, 'the dashboard must not mount the styleguide AppRail');
});

test('the rail carries a Workspace label above the tree', () => {
  const rail = fn('ShellRail');
  assert.match(rail, /Workspace/, 'the rail must label the tree section "Workspace"');
});

test('the rail no longer renders the theme or skip-permissions toggle (aw-029)', () => {
  const rail = fn('ShellRail');
  assert.doesNotMatch(rail, /<\$\{ThemeToggle\}/, 'the toggles moved to the topbar — the rail must not host the theme toggle');
  assert.doesNotMatch(rail, /<\$\{SkipPermissionsToggle\}/, 'the toggles moved to the topbar — the rail must not host the skip-permissions toggle');
});

test('the theme + skip-permissions toggles moved into the settings menu, left of the standing Work launch (aw-029 → aw-049)', () => {
  // aw-049 collapsed the theme + skip-permissions toggles (and Stop) into the gear's
  // SettingsMenu; they no longer render inline in the topbar. The topbar now hosts the
  // gear (SettingsMenu) immediately LEFT of the standing Work launch.
  const top = fn('BoardTopbar');
  assert.doesNotMatch(top, /<\$\{ThemeToggle\}/, 'the theme toggle moved into the settings menu — not inline in the topbar');
  assert.doesNotMatch(top, /<\$\{SkipPermissionsToggle\}/, 'the skip-permissions toggle moved into the settings menu — not inline in the topbar');
  const menu = fn('SettingsMenu');
  assert.match(menu, /<\$\{ThemeToggle\}/, 'the settings menu must host the theme toggle');
  assert.match(menu, /<\$\{SkipPermissionsToggle\}/, 'the settings menu must host the skip-permissions toggle');
  // The gear sits left of the Work launch in the topbar.
  const menuAt = top.indexOf('${SettingsMenu}');
  const workAt = top.indexOf('label="Work"');
  assert.ok(menuAt > -1 && workAt > -1, 'the gear and the Work launch must render in the topbar');
  assert.ok(menuAt < workAt, 'the settings gear must render left of the Work launch');
});

test('a main-column topbar renders the theme-following Work launch and no Search box', () => {
  const top = fn('BoardTopbar');
  // The Work launch FOLLOWS the active theme (aw-033): the primary emphasis
  // (idleBg --surface-2, idleColor --fg-1) — NOT the inverse §05 treatment that
  // reads as the opposite scheme. It must not be rendered with emphasis="inverse".
  assert.doesNotMatch(top, /emphasis="inverse"/, 'the topbar Work launch must not use the inverse (opposite-theme) treatment');
  // No Search affordance (read-only dashboard, no search backend).
  assert.doesNotMatch(top, /Search/, 'no Search box may be rendered');
});

test('the topbar Work button IS the Work launch: bare WORK_COMMAND, skipPermissions threaded, no onResult', () => {
  const top = fn('BoardTopbar');
  assert.match(top, /label="Work"/, 'the topbar must render the Work launch');
  const work = top.match(/label="Work"[\s\S]{0,320}?\/>/);
  assert.ok(work, 'the Work button must be present in the topbar');
  assert.match(work[0], /command=\$\{WORK_COMMAND\}/, 'Work must seed the bare WORK_COMMAND');
  assert.match(work[0], /emphasis="primary"/, 'Work must use the theme-following primary emphasis (aw-033)');
  assert.match(work[0], /skipPermissions=\$\{skipPermissions\}/, 'Work must thread skipPermissions (aw-021/ADR-0019)');
  assert.doesNotMatch(work[0], /onResult/, 'Work must NOT pass onResult — it never consumed a prompt');
});

test('LaunchButton supports an "inverse" emphasis filled with --fg-1 / --surface-0 (§05)', () => {
  const lb = fn('LaunchButton');
  assert.match(lb, /emphasis === "inverse"|inverse/, 'LaunchButton must recognise the inverse emphasis');
  assert.match(lb, /var\(--surface-0\)/, 'inverse text colour must be --surface-0');
});

test('no styleguide file is modified — the dashboard composes the unforked primitives', () => {
  // The styleguide AppRail still demos LIBRARY (proves we did not gut it to feed live data).
  assert.match(styleguideRail, /export function AppRail/, 'styleguide AppRail must remain intact');
  assert.match(styleguideRail, /LIBRARY\.map/, 'styleguide AppRail must still render the demo LIBRARY');
});
