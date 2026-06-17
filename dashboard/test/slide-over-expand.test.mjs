// Static guard for the slide-over in-place expand/collapse-width wiring
// (agentic-workflow-074).
//
// aw-074 replaces the slide-over header's "Open in full screen" maximize button with
// the ds-020 body-top expand chevron: a SINGLE in-place width toggle that widens the
// styleguide Drawer to fill the main content area (right of the 248px ShellRail), and
// shrinks it back. This is a PURE-CONSUMER task — the expandable-width capability lives
// in the Drawer primitive (design-system-020); slide-over.js only wires its controlled
// seam (`expanded` / `onToggleExpand`) and supplies the rail-aware `expandedWidth`.
//
// What changes in slide-over.js:
//   - It STOPS forwarding `onOpenFullScreen` to the Drawer (the callback-guard then hides
//     the header maximize button → Close-only header). board.js's promote path is untouched.
//   - It owns an `expanded` boolean (controlled) that RESETS to collapsed whenever the
//     open `intent` changes (reopening a task starts collapsed — no persisted state).
//   - It passes `onToggleExpand` (flip) and a rail-aware `expandedWidth` of
//     `calc(100vw - 248px)` (the ShellRail is fixed 248px; rail-awareness is a dashboard
//     fact, never the primitive's — no `248` literal in drawer.js).
//
// The slide-over's React glue has no DOM render harness — the established idiom (ds-009,
// aw-027, aw-039) is source-reading static guards. This suite locks the aw-074 criteria.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const slideOverSrc = readFileSync(path.join(dashboardDir, 'app', 'slide-over.js'), 'utf8');

// The <${Drawer} ... /> invocation in slide-over.js, isolated so prop assertions are scoped.
function drawerCall() {
  const m = slideOverSrc.match(/<\$\{Drawer\}[\s\S]*?\/>/);
  assert.ok(m, 'slide-over.js must mount a Drawer');
  return m[0];
}

test('AC1: slide-over.js no longer forwards onOpenFullScreen to its Drawer (maximize button hidden → Close-only header)', () => {
  assert.doesNotMatch(drawerCall(), /onOpenFullScreen/,
    'the Drawer mount must NOT pass onOpenFullScreen — the callback-guard then hides the header maximize action');
});

test('AC2: slide-over.js wires the ds-020 expand seam — expanded, onToggleExpand, expandedWidth — to the Drawer', () => {
  const call = drawerCall();
  assert.match(call, /\bexpanded=\$\{/, 'the Drawer must receive an `expanded` prop (controlled seam)');
  assert.match(call, /\bonToggleExpand=\$\{/, 'the Drawer must receive an `onToggleExpand` prop');
  assert.match(call, /\bexpandedWidth=\$\{/, 'the Drawer must receive an `expandedWidth` prop');
});

test('AC2: expandedWidth is rail-aware — calc(100vw - <rail>px) keyed on the 248px ShellRail (dashboard owns rail-awareness)', () => {
  // The expanded width fills everything right of the fixed-width ShellRail (board.js: 248).
  // Built as `calc(100vw - ${RAIL_WIDTH_PX}px)` with RAIL_WIDTH_PX = 248 — a named, self-
  // documenting constant rather than a magic inline number; rail-awareness lives in the
  // dashboard, never in the Drawer primitive (ds-020 keeps no 248 / calc(100vw - …)).
  assert.match(slideOverSrc, /calc\(100vw\s*-\s*(248px|\$\{[A-Za-z_$][\w$]*\}px)\)/,
    'slide-over.js must supply the rail-aware expanded width as calc(100vw - <rail>px)');
  assert.match(slideOverSrc, /\b248\b/,
    'the ShellRail width (248px) must be the rail constant the expanded width subtracts');
});

test('AC4: reopening starts collapsed — the expand state resets when the open intent changes (no persisted state)', () => {
  // A `useState` boolean for expand, reset to false on intent change. The reset must
  // depend on `intent` (either an effect keyed on [intent] that sets it false, or the
  // setter called in the same intent-driven effect that loads the body).
  assert.match(slideOverSrc, /useState\(\s*false\s*\)/,
    'slide-over.js must hold an expand boolean defaulting to collapsed (useState(false))');
  // The expand state is reset inside an intent-keyed effect (the body-load effect is keyed
  // on [intent, fetchDoc]); the reset call must set it back to false.
  assert.match(slideOverSrc, /setExpanded\(\s*false\s*\)/,
    'slide-over.js must reset the expand state to collapsed (setExpanded(false)) on intent change');
});

test('AC4: the expand reset is wired into the intent-driven effect (collapse on reopen)', () => {
  // The effect that runs on intent change must contain the collapse reset, so opening a
  // (possibly different) task always starts narrow.
  const effect = slideOverSrc.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?\}, \[intent[^\]]*\]\)/);
  assert.ok(effect, 'slide-over.js must have an intent-keyed effect');
  assert.match(effect[0], /setExpanded\(\s*false\s*\)/,
    'the intent-keyed effect must collapse the panel on (re)open');
});

test('AC8 / ADR-0003: the Drawer is consumed unforked — no board-local width or chevron logic in slide-over.js', () => {
  // The collapsed-width default + the chevron glyphs live in the primitive; the consumer
  // must not re-declare them (that would be a fork).
  assert.doesNotMatch(slideOverSrc, /min\(560px/,
    'the collapsed-width default must stay in the Drawer primitive, not be forked into slide-over.js');
  assert.doesNotMatch(slideOverSrc, /panel-right-(open|close)/,
    'the expand chevron glyph is rendered by the Drawer primitive, never by slide-over.js');
});
