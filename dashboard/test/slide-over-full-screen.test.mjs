// Static guard for the slide-over "Open in full screen" → main-pane wiring
// (agentic-workflow-039).
//
// design-system-009 turned the styleguide Drawer header's "Open in editor" into an
// "Open in full screen" action backed by a BARE optional `onOpenFullScreen()` callback
// (rendered only when the consumer supplies it). aw-039 wires that callback so the
// dashboard renders the OPEN TASK in the MAIN content pane — the same surface non-task
// documents render in (MainPaneReader, aw-027) — and closes the slide-over.
//
// The seam (verified against live board.js): the shell holds two mutually-exclusive
// selection states — `openIntent` (task → SlideOver) and `selectedDoc` (non-task doc →
// main pane). "Open in full screen" moves the task from the first to the second:
//   setSelectedDoc(openIntent); setOpenIntent(null);
// The Drawer callback is bare; the shell already owns the open task, so nothing travels
// back through the callback. NO pure module is extracted — the transition is two setState
// calls in the shell. This is a deliberate per-action override of the ADR-0021 split, NOT
// a change to isTaskIntent / the default click routing.
//
// The board's React glue has no DOM render harness — the established idiom (ds-009,
// aw-027) is source-reading static guards. This suite locks the aw-039 acceptance criteria.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');
const slideOverSrc = readFileSync(path.join(dashboardDir, 'app', 'slide-over.js'), 'utf8');

test('SlideOver accepts an onOpenFullScreen prop and threads it to the styleguide Drawer (ds-009 callback)', () => {
  // The wrapper destructures the prop from its props object.
  assert.match(slideOverSrc, /function SlideOver\(\{[^}]*\bonOpenFullScreen\b[^}]*\}\)/,
    'SlideOver must accept an onOpenFullScreen prop');
  // It forwards the SAME prop to the imported Drawer (consumed unforked, ADR-0003).
  assert.match(slideOverSrc, /<\$\{Drawer\}[\s\S]*?onOpenFullScreen=\$\{onOpenFullScreen\}/,
    'SlideOver must forward onOpenFullScreen to the Drawer');
});

test('the shell wires an onOpenFullScreen handler that promotes openIntent into the main pane and closes the slide-over', () => {
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  // A handler exists, built over the existing two selection states (no new state).
  assert.match(app, /onOpenFullScreen\s*=\s*useCallback\(/,
    'the shell must define an onOpenFullScreen handler');
  // It promotes the open task into the main pane (selectedDoc) and closes the slide-over.
  const handler = app.match(/const onOpenFullScreen = useCallback\([\s\S]*?\}, \[[^\]]*\]\)/);
  assert.ok(handler, 'the onOpenFullScreen handler must be a useCallback block');
  assert.match(handler[0], /setSelectedDoc\(\s*openIntent\s*\)/,
    'the handler must promote openIntent into selectedDoc (the main pane)');
  assert.match(handler[0], /setOpenIntent\(\s*null\s*\)/,
    'the handler must clear openIntent (close the slide-over)');
});

test('the shell passes the onOpenFullScreen handler to the mounted SlideOver', () => {
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  assert.match(app, /<\$\{SlideOver\}[\s\S]*?onOpenFullScreen=\$\{onOpenFullScreen\}/,
    'the SlideOver must receive the onOpenFullScreen handler');
});

test('the full-screen path is an explicit override, NOT a change to the default isTaskIntent routing (AC5)', () => {
  // onOpen still routes via isTaskIntent (the default split is untouched).
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  assert.match(app, /isTaskIntent\(/, 'the default onOpen routing must still use isTaskIntent');
  // The full-screen handler must NOT consult isTaskIntent — it is an unconditional promotion.
  const handler = app.match(/const onOpenFullScreen = useCallback\([\s\S]*?\}, \[[^\]]*\]\)/)[0];
  assert.doesNotMatch(handler, /isTaskIntent/,
    'the explicit full-screen override must not branch on isTaskIntent');
});

test('the full-screen path stays read-only: no write verbs introduced (ADR-0017)', () => {
  // The wiring is two setState calls + a prop thread — no fetch/write of any kind.
  const handler = boardSrc.match(/const onOpenFullScreen = useCallback\([\s\S]*?\}, \[[^\]]*\]\)/)[0];
  assert.doesNotMatch(handler, /method:\s*["'](POST|PUT|PATCH|DELETE)["']/i,
    'the full-screen handler must perform no write');
});
