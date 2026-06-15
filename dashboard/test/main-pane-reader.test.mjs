// Static guard for the main-pane document reader + the open-intent SPLIT
// (agentic-workflow-027).
//
// aw-027 splits the single open-intent sink (aw-026) into TWO render targets keyed
// on artifact kind (the pure discriminator is unit-tested in intent-route.test.mjs):
//   - a board TASK intent (carries `status`) keeps the right-hand SlideOver;
//   - a non-task DOCUMENT intent (a rail row) renders in the MAIN content pane via
//     a new reader that fetches /api/doc and renders the markdown through the
//     styleguide `Markdown` primitive, consumed UNFORKED (ADR-0003).
// The shell holds TWO states now: `openIntent` (task → SlideOver, drives the board
// card ring) and `selectedDoc` (non-task doc → main pane, drives the rail row edge).
// The Board RailItem clears `selectedDoc` and is `active` exactly when it is null.
//
// The board's React glue has no DOM render harness in this project — the established
// idiom (aw-016/020/022/023/024/026) is source-reading static guards plus pure-module
// unit tests. This suite locks the aw-027 acceptance criteria that are not pure
// string logic; the discriminator itself is locked in intent-route.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');
const readerSrc = readFileSync(path.join(dashboardDir, 'app', 'main-pane-reader.js'), 'utf8');

function fn(src, name) {
  const m = src.match(new RegExp(`function ${name}\\b[\\s\\S]*?\\n}`));
  assert.ok(m, `${name} must exist`);
  return m[0];
}

test('a main-pane document reader exists and renders through the styleguide Markdown primitive (unforked)', () => {
  // Imported from the design-system single source by relative path (ADR-0003/0009).
  assert.match(readerSrc, /import\s*\{[^}]*\bMarkdown\b[^}]*\}\s*from\s*["'][^"']*design-system\/styleguide\/app\/primitives\.js["']/,
    'the reader must import the styleguide Markdown primitive across the BC boundary');
  assert.match(readerSrc, /<\$\{Markdown\}/, 'the reader must render the Markdown primitive');
  // Markdown's prop is `source` (primitives.js).
  assert.match(readerSrc, /source=/, 'the reader must pass markdown into Markdown via the `source` prop');
});

test('the reader reuses the existing /api/doc fetch mechanism (docUrl) — one fetch mechanism', () => {
  assert.match(readerSrc, /docUrl/, 'the reader must build the URL via slide-over-data.docUrl');
  assert.match(readerSrc, /\/api\/doc|docUrl/, 'the reader must fetch /api/doc');
});

test('the reader is read-only: no write verbs to the doc endpoint', () => {
  assert.doesNotMatch(readerSrc, /method:\s*["'](POST|PUT|PATCH|DELETE)["']/i, 'the reader must not write');
});

test('the shell holds TWO selection states: openIntent (task) and selectedDoc (non-task doc)', () => {
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  assert.match(app, /useState\([^)]*\)[\s\S]*?openIntent/, 'openIntent state must remain');
  assert.match(app, /selectedDoc/, 'a new selectedDoc state must exist');
  // Both the SlideOver and the main-pane reader are mounted.
  assert.match(app, /<\$\{SlideOver\}/, 'the SlideOver must remain mounted (task target)');
  assert.match(app, /<\$\{MainPaneReader\}|<\$\{DocReader\}/, 'the main-pane reader must be mounted (doc target)');
});

test('the onOpen sink ROUTES on artifact kind via isTaskIntent (task → slide-over; else → main pane)', () => {
  assert.match(boardSrc, /import\s*\{[^}]*\bisTaskIntent\b[^}]*\}\s*from\s*["']\.\/intent-route\.js["']/,
    'the shell must import the pure isTaskIntent router');
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  assert.match(app, /isTaskIntent\(/, 'onOpen must route via isTaskIntent');
  // A task sets openIntent; a doc sets selectedDoc.
  assert.match(app, /setOpenIntent/, 'a task intent must set openIntent');
  assert.match(app, /setSelectedDoc/, 'a non-task doc intent must set selectedDoc');
});

test('the rail selection edge follows selectedDoc, not openIntent (AC4)', () => {
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  // ShellRail is fed selectedId derived from selectedDoc.
  assert.match(app, /<\$\{ShellRail\}[\s\S]*?selectedId=\$\{[^}]*selectedDoc/,
    'the rail selectedId must follow selectedDoc');
});

test('the main pane shows EITHER the selected document OR the board (board is the default)', () => {
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  // A conditional in the main column: selectedDoc ? reader : board.
  assert.match(app, /selectedDoc\s*\?[\s\S]*?MainPaneReader|selectedDoc\s*\?[\s\S]*?DocReader/,
    'the main column must render the reader when a doc is selected');
  assert.match(app, /<\$\{DashboardBoard\}/, 'the board remains the default main-pane content');
});

test('the Board RailItem clears the selected doc and is active exactly when selectedDoc is null (AC4/AC5)', () => {
  const rail = fn(boardSrc, 'ShellRail');
  // The Board RailItem onClick clears the doc; active reflects "no doc selected".
  const boardItem = rail.match(/<\$\{RailItem\}[\s\S]*?label="Board"[\s\S]*?\/>/);
  assert.ok(boardItem, 'the Board RailItem must be present');
  assert.match(boardItem[0], /active=\$\{[^}]*\}/, 'the Board RailItem active must be derived, not a literal true');
  assert.doesNotMatch(boardItem[0], /active=\$\{true\}/, 'Board active must no longer be a hardcoded true');
  assert.match(boardItem[0], /onClick=\$\{[^}]*\}/, 'the Board RailItem must have an onClick that returns to the board');
});
