// Static guard for the dashboard shell relayout (agentic-workflow-026).
//
// The live shell is rewritten from a horizontal top header over a centered 1160px
// <main> to the styleguide §05 "Components in context" layout: a full-height left
// RAIL beside a MAIN COLUMN (a ~52px topbar over the scrollable board). The rail is
// composed from styleguide PRIMITIVES (Glyph / RailItem / TreeGroup / TreeItem) —
// NOT the styleguide AppRail (hardwired to the demo LIBRARY) — and fed the LIVE
// treeToLibrary(tree) projection. The Board RailItem is the only nav item; the
// always-visible Workspace tree IS the library. The theme + skip-permissions
// toggles live in the main-column TOPBAR, left of the inverse Work launch
// (aw-029 — a partial reversal of aw-026's rail-footer placement); the rail no
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

test('the topbar hosts the theme + skip-permissions toggles, in that order, LEFT of the Work launch (aw-029)', () => {
  const top = fn('BoardTopbar');
  assert.match(top, /<\$\{ThemeToggle\}/, 'the topbar must host the theme toggle');
  assert.match(top, /<\$\{SkipPermissionsToggle\}/, 'the topbar must host the skip-permissions toggle');
  // Left-to-right order in the top-right cluster: theme, skip-permissions, Work.
  const themeAt = top.indexOf('${ThemeToggle}');
  const skipAt = top.indexOf('${SkipPermissionsToggle}');
  const workAt = top.indexOf('label="Work"');
  assert.ok(themeAt > -1 && skipAt > -1 && workAt > -1, 'all three controls must render in the topbar');
  assert.ok(themeAt < skipAt, 'the theme toggle must render before the skip-permissions toggle');
  assert.ok(skipAt < workAt, 'the skip-permissions toggle must render before (left of) the Work launch');
});

test('a main-column topbar renders the inverse Work launch and no Search box', () => {
  const top = fn('BoardTopbar');
  // The §05 inverse button look: background + border var(--fg-1), color var(--surface-0).
  assert.match(top, /var\(--fg-1\)/, 'the topbar action must use the inverse fill (--fg-1)');
  assert.match(top, /var\(--surface-0\)/, 'the inverse button text must be --surface-0');
  // No Search affordance (read-only dashboard, no search backend).
  assert.doesNotMatch(top, /Search/, 'no Search box may be rendered');
});

test('the topbar Work button IS the Work launch: bare WORK_COMMAND, skipPermissions threaded, no onResult', () => {
  const top = fn('BoardTopbar');
  assert.match(top, /label="Work"/, 'the topbar must render the Work launch');
  const work = top.match(/label="Work"[\s\S]{0,320}?\/>/);
  assert.ok(work, 'the Work button must be present in the topbar');
  assert.match(work[0], /command=\$\{WORK_COMMAND\}/, 'Work must seed the bare WORK_COMMAND');
  assert.match(work[0], /emphasis="inverse"/, 'Work must use the §05 inverse emphasis');
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
