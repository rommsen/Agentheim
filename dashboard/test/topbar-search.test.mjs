// Static guard for the topbar GLOBAL SEARCH UI (agentic-workflow-052).
//
// aw-052 replaces the BoardTopbar breadcrumb (`Board` + `agentheim / tickets`)
// with the design-system ds-016 SearchField (consumed UNFORKED, ADR-0003), wired
// to GET /api/search (aw-050): the consumer owns the controlled `value` + the
// ~200ms debounce + the min-length-2 FETCH gate + the flat→grouped transform
// (searchResultsToGroups), and feeds ds-016 `groups` + `onSelect`; ds-016 owns
// chrome + panel + keyboard. Selecting a result routes through the UNCHANGED
// isTaskIntent (ADR-0021): docs → setSelectedDoc; tickets → the aw-039 full-screen
// path (setSelectedDoc + setOpenIntent(null)), NOT the slide-over.
//
// The board's React glue has no DOM render harness in this project — the
// established idiom (aw-016/020/022/023/026/027/039/049) is source-reading static
// guards plus pure-module unit tests. The pure transform is locked in
// search-results.test.mjs; this suite locks the wiring acceptance criteria.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');
const boardSrc = readFileSync(path.join(dashboardDir, 'app', 'board.js'), 'utf8');

function fn(src, name) {
  const m = src.match(new RegExp(`function ${name}\\b[\\s\\S]*?\\n}`));
  assert.ok(m, `${name} must exist`);
  return m[0];
}

test('the breadcrumb is gone from the topbar — no "agentheim / tickets" mono line', () => {
  assert.doesNotMatch(boardSrc, /agentheim \/ tickets/, 'the dead breadcrumb text must be removed');
});

test('the topbar consumes the ds-016 SearchField unforked across the BC boundary (ADR-0003)', () => {
  assert.match(boardSrc,
    /import\s*\{[^}]*\bSearchField\b[^}]*\}\s*from\s*["'][^"']*design-system\/styleguide\/app\/search\.js["']/,
    'SearchField must be imported from the design-system styleguide single source');
  const topbar = fn(boardSrc, 'BoardTopbar');
  assert.match(topbar, /<\$\{(SearchField|TopbarSearch)\}/, 'the topbar must render the search field');
});

test('the search field is fed groups via the pure flat→grouped transform (no board-side ranking/forking)', () => {
  assert.match(boardSrc,
    /import\s*\{[^}]*\bsearchResultsToGroups\b[^}]*\}\s*from\s*["']\.\/search-results\.js["']/,
    'the search wiring must import the pure searchResultsToGroups transform');
  assert.match(boardSrc, /searchResultsToGroups\(/, 'the transform must be applied to the endpoint results');
  // No custom getters / board-side term marking — ds-016 defaults read item.title/excerpt.
  assert.doesNotMatch(boardSrc, /getTitle=/, 'no custom getTitle — ds-016 default reads item.title');
  assert.doesNotMatch(boardSrc, /getExcerpt=/, 'no custom getExcerpt — ds-016 default reads item.excerpt');
  assert.doesNotMatch(boardSrc, /markMatches\(/, 'no board-side term marking — ds-016 owns markMatches');
});

test('the search field is a CONTROLLED combobox: the consumer owns value + onChange', () => {
  const comp = fn(boardSrc, 'TopbarSearch');
  assert.match(comp, /value=\$\{/, 'SearchField must be fed a controlled value');
  assert.match(comp, /onChange=\$\{/, 'SearchField must be fed an onChange handler');
  assert.match(comp, /groups=\$\{/, 'SearchField must be fed groups');
  assert.match(comp, /onSelect=\$\{/, 'SearchField must be fed onSelect');
});

test('the query is debounced and gated at min length 2 BEFORE the /api/search fetch', () => {
  const comp = fn(boardSrc, 'TopbarSearch');
  // The fetch hits the aw-050 endpoint.
  assert.match(comp, /\/api\/search/, 'the search must query GET /api/search (aw-050)');
  // A debounce timer (~200ms) gates the network call, not the input.
  assert.match(comp, /setTimeout/, 'the fetch must be debounced via a timer');
  assert.match(comp, /clearTimeout/, 'the debounce must clear the prior timer on each keystroke');
  // The ~200ms debounce interval (a module constant fed to the timer).
  assert.match(boardSrc, /SEARCH_DEBOUNCE_MS\s*=\s*200|setTimeout\([^,]+,\s*200\b/, 'the debounce is ~200ms');
  // The min-length-2 gate suppresses the fetch (the field still displays the char).
  assert.match(comp, /length\s*<\s*(2|SEARCH_MIN_LENGTH)|length\s*>=\s*(2|SEARCH_MIN_LENGTH)/, 'a min-length-2 fetch gate must exist');
  assert.match(boardSrc, /SEARCH_MIN_LENGTH\s*=\s*2/, 'the min query length is 2');
});

test('the search fetch is read-only (no write verbs to /api/search)', () => {
  const comp = fn(boardSrc, 'TopbarSearch');
  assert.doesNotMatch(comp, /method:\s*["'](POST|PUT|PATCH|DELETE)["']/i, 'search must not write');
});

test('selecting a result routes through the UNCHANGED isTaskIntent → the shell onOpen (no slide-over for tickets)', () => {
  // The topbar search hands its selection up to the shell, which already routes via
  // isTaskIntent (docs → setSelectedDoc; tickets → the aw-039 full-screen handler).
  const comp = fn(boardSrc, 'TopbarSearch');
  assert.match(comp, /onSelect=\$\{/, 'onSelect must be wired');
  // The shell threads its open-intent sink down to the topbar search.
  const app = boardSrc.match(/export function DashboardApp[\s\S]*$/)[0];
  assert.match(app, /<\$\{BoardTopbar\}[\s\S]*?onOpen(Search)?=\$\{/,
    'the shell must pass its open-intent sink down to the topbar search');
  // The shell's onOpen routes search tickets through the aw-039 full-screen path
  // (setSelectedDoc + setOpenIntent(null)), reusing the existing isTaskIntent router.
  assert.match(app, /isTaskIntent\(/, 'routing stays on the unchanged isTaskIntent');
});

test('an empty query clears results and runs no fetch (ds-016 panelState "closed")', () => {
  const comp = fn(boardSrc, 'TopbarSearch');
  // The onChange handler treats an empty/trimmed query as "clear, no fetch".
  assert.match(comp, /trim\(\)/, 'the query must be trimmed to detect empty/whitespace');
  // On clear, the groups are emptied (no stale panel) — setGroups([]) or equivalent.
  assert.match(comp, /\[\]/, 'an empty query must clear the result groups');
});
