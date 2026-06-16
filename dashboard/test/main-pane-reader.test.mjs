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

test('the reader column is horizontally centered as a block while preserving the maxWidth measure (aw-040)', () => {
  // The reading column is the `<article>` wrapper holding the title header + Markdown.
  // It must keep its comfortable measure AND be centered (margin: 0 auto) — block
  // centering only, NOT center-aligned paragraph text, NOT vertical centering.
  const article = readerSrc.match(/<article style=\$\{\{([^}]*)\}\}>/);
  assert.ok(article, 'the reading column <article> wrapper must exist');
  const articleStyle = article[1];
  assert.match(articleStyle, /maxWidth:\s*760/, 'the maxWidth measure must be preserved');
  assert.match(articleStyle, /margin:\s*["']0 auto["']/, 'the article must center horizontally via margin: "0 auto"');
  // Guard against accidental center-aligned text or vertical centering creep.
  assert.doesNotMatch(articleStyle, /textAlign:\s*["']center["']/, 'paragraph text must NOT be center-aligned');
});

test('the ready-state header LEADS with doc.title (strong contrast, larger than the old 11.5px path), not the mono path line (aw-047)', () => {
  // The article wrapper holds a header element followed by the Markdown primitive.
  // aw-047: that header must now show the title, not the bare path. Isolate the
  // ready-state <article> block so the error-state path span (line 74) is excluded.
  const article = readerSrc.match(/<article[\s\S]*?<\/article>/);
  assert.ok(article, 'the ready-state <article> block must exist');
  const body = article[0];

  // The header renders the title (a path fallback for a title-less doc is fine).
  assert.match(body, /\$\{doc\.title\b/, 'the ready-state header must render doc.title');

  // Stronger contrast than the old quiet path line (--fg-3) — leads with --fg-1.
  assert.match(body, /color:\s*["']?var\(--fg-1\)["']?/, 'the title must use the strong --fg-1 foreground token');

  // A clearly larger font than the old 11.5px path line, declared as a number.
  const sizeMatch = body.match(/fontSize:\s*([0-9]+(?:\.[0-9]+)?)/);
  assert.ok(sizeMatch, 'the title element must set an explicit fontSize');
  assert.ok(Number(sizeMatch[1]) > 11.5, `the title font (${sizeMatch[1]}) must be clearly larger than the old 11.5px`);

  // Styleguide UI font token, not a bespoke stack (ADR-0003 consume-unforked).
  assert.match(body, /fontFamily:\s*["']var\(--font-ui\)["']/, 'the title must use the styleguide --font-ui token');

  // The first/leading element of the header is the title heading, not the path:
  // the strong --fg-1 title element must appear before any --fg-3 path sub-line.
  const titleIdx = body.search(/color:\s*["']?var\(--fg-1\)["']?/);
  const pathSubIdx = body.search(/color:\s*["']?var\(--fg-3\)["']?/);
  assert.ok(titleIdx >= 0, 'a --fg-1 title element must exist');
  assert.ok(pathSubIdx === -1 || titleIdx < pathSubIdx,
    'the title (--fg-1) must lead, with any path sub-line (--fg-3) demoted below it');
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
