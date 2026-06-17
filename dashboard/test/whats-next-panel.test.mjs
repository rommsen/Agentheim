// Static guard for the board's WHAT'S-NEXT advisory recommendation panel
// (agentic-workflow-073 / ADR-0027).
//
// The `whats-next` skill writes a single-latest advisory artifact at
// `.agentheim/state/whats-next.md` (aw-076). This panel READS it via the existing
// /api/doc body carrier and renders it above the board prompt bar's "Prompt" title,
// through the SAME withFrontmatterSection + styleguide Markdown path the slide-over /
// main-pane reader use. It self-suppresses when the artifact is absent or the current
// recommendation was dismissed (keyed by `generated`), re-fetches on every SSE frame,
// and shows a staleness cue.
//
// The board's React glue has no DOM render harness in this project — the idiom
// (aw-023/043/065) is: pure logic gets node --test coverage (whats-next-state.test.mjs),
// and the board's wiring is guarded by reading its source. This suite locks the aw-073
// acceptance criteria that are not pure helper logic.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');

function panel() {
  // The component body runs from its declaration to the start of the helper that
  // immediately follows it (defaultFetchWhatsNext).
  const m = boardSrc.match(/function WhatsNextPanel[\s\S]*?(?=\/\*\* Default fetch for the advisory artifact)/);
  assert.ok(m, 'WhatsNextPanel component must exist');
  return m[0];
}

test('a WhatsNextPanel component exists and renders the styleguide Markdown primitive', () => {
  assert.match(panel(), /<\$\{Markdown\}/, 'the panel must render through the unforked Markdown primitive (ADR-0003)');
});

test('the panel reads the body through withFrontmatterSection (the aw-043 render path)', () => {
  assert.match(panel(), /withFrontmatterSection\(body\)/);
});

test('the panel fetches the ADR-0027 artifact via /api/doc, NOT /api/tree', () => {
  // The default fetcher targets the advisory artifact through the docUrl (/api/doc) carrier.
  assert.match(boardSrc, /defaultFetchWhatsNext[\s\S]*?docUrl\(WHATS_NEXT_DOC_PATH\)/);
  // The panel never folds the recommendation into the always-fetched tree projection.
  assert.doesNotMatch(panel(), /api\/tree/, 'the recommendation must not enter /api/tree (ADR-0023)');
});

test('an absent artifact (fetch failure) resolves to render NOTHING (no shell, no error)', () => {
  // The fetch .catch sets body to null; a null/blank body returns null (renders nothing).
  assert.match(panel(), /\.catch\([\s\S]*?setBody\(null\)/);
  assert.match(panel(), /if \(typeof body !== "string" \|\| body\.trim\(\) === ""\) return null;/);
});

test('the panel re-fetches live on every SSE frame (ADR-0006)', () => {
  assert.match(panel(), /useLiveTree\(reload\)/);
});

test('the panel shows a staleness cue derived from the generated stamp (ADR-0027 §4)', () => {
  assert.match(panel(), /formatStaleness\(generated, Date\.now\(\)\)/);
  assert.match(panel(), /\$\{staleness\}/);
});

test('the panel is dismissible and persists the dismiss keyed by generated', () => {
  assert.match(panel(), /isDismissed\(storage, generated\)/, 'dismissed-by-generated suppresses render');
  assert.match(panel(), /saveDismissed\(storage, generated\)/, 'dismiss persists the current generated stamp');
  assert.match(panel(), /Dismiss the What's next recommendation/, 'a dismiss control must exist');
});

test('the panel is composed ABOVE the "Prompt" title in BoardPromptBar', () => {
  const bar = boardSrc.match(/function BoardPromptBar[\s\S]*?\n}/);
  assert.ok(bar, 'BoardPromptBar must exist');
  const idxPanel = bar[0].indexOf('<${WhatsNextPanel}');
  const idxPrompt = bar[0].indexOf('>Prompt<');
  assert.ok(idxPanel !== -1, 'BoardPromptBar must render the WhatsNextPanel');
  assert.ok(idxPrompt !== -1, 'BoardPromptBar must render the Prompt title');
  assert.ok(idxPanel < idxPrompt, 'the panel must sit ABOVE the Prompt title');
});

test('the panel is styleguide-consumed unforked — token-styled, no new design-system child', () => {
  // Token-referencing styles only (light/dark aware for free); no hardcoded hex chrome.
  assert.match(panel(), /var\(--surface-1\)/);
  assert.match(panel(), /var\(--hairline\)/);
});
