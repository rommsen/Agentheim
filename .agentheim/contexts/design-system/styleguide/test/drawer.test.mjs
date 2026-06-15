// Tests for the Drawer header actions (design-system-009).
//
// The Drawer renders via htm/React with no DOM under `node --test`, so —
// mirroring the ticket-card / doing-pulse suites — the load-bearing contracts
// are tested as source-reading static guards against drawer.js:
//   1. Neither header (HeaderMinimal / HeaderContextual) renders a "Copy path"
//      button anymore — the dead Copy IconButton is gone.
//   2. The remaining action reads "Open in full screen" (title + aria-label),
//      not "Open in editor".
//   3. That action fires an optional `onOpenFullScreen` callback supplied by the
//      consumer, threaded through Drawer → both headers (ds-006 cornerAction
//      consumer-owns-behavior precedent).
//   4. When `onOpenFullScreen` is absent, the button is NOT rendered — for BOTH
//      headers (absent-slot → nothing).
//   5. The HeaderMinimal divider before Close does not dangle: it renders only
//      when an action button precedes it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..', 'app');
const drawerSrc = readFileSync(join(APP, 'drawer.js'), 'utf8');
const appSrc = readFileSync(join(APP, 'app.js'), 'utf8');

test('neither header renders a "Copy path" button anymore', () => {
  assert.doesNotMatch(drawerSrc, /Copy path/, 'the dead Copy button must be removed from the Drawer headers');
  assert.doesNotMatch(drawerSrc, /name="copy"/, 'the copy IconButton must no longer be used in the Drawer');
});

test('the remaining action reads "Open in full screen", not "Open in editor"', () => {
  assert.doesNotMatch(drawerSrc, /Open in editor/, 'the old "Open in editor" label must be gone');
  assert.match(drawerSrc, /Open in full screen/, 'the action must be relabelled "Open in full screen"');
  // It must be the square-arrow-out-up-right glyph (placement/look unchanged).
  assert.match(drawerSrc, /name="square-arrow-out-up-right"/, 'the open action keeps its glyph');
});

test('the "Open in full screen" button is wired to an onOpenFullScreen callback', () => {
  // The IconButton onClick must call onOpenFullScreen (bare, no-arg).
  assert.match(drawerSrc, /onClick=\$\{onOpenFullScreen\}/, 'the open action must fire onOpenFullScreen');
});

test('onOpenFullScreen is threaded through Drawer to both headers', () => {
  // Drawer accepts the prop...
  assert.match(drawerSrc, /export function Drawer\(\{[^}]*onOpenFullScreen[^}]*\}\)/s, 'Drawer must accept onOpenFullScreen');
  // ...and passes it to whichever header it renders.
  const headerPasses = drawerSrc.match(/onOpenFullScreen=\$\{onOpenFullScreen\}/g) || [];
  assert.ok(headerPasses.length >= 2, 'onOpenFullScreen must be passed to both HeaderMinimal and HeaderContextual');
  // Both headers must accept the prop.
  assert.match(drawerSrc, /export function HeaderMinimal\(\{[^}]*onOpenFullScreen[^}]*\}\)/s, 'HeaderMinimal must accept onOpenFullScreen');
  assert.match(drawerSrc, /export function HeaderContextual\(\{[^}]*onOpenFullScreen[^}]*\}\)/s, 'HeaderContextual must accept onOpenFullScreen');
});

test('the open button is conditional on onOpenFullScreen — absent callback renders nothing (both headers)', () => {
  // Mirrors the cornerAction absent-slot contract: the square-arrow IconButton
  // must only render when onOpenFullScreen is supplied. Each header carries one
  // guarded render line.
  const openLines = drawerSrc
    .split('\n')
    .filter((line) => /name="square-arrow-out-up-right"/.test(line));
  assert.equal(openLines.length, 2, 'exactly two open-action render lines expected (one per header)');
  for (const line of openLines) {
    assert.match(line, /onOpenFullScreen\s*&&/, 'the open action must be guarded by onOpenFullScreen &&');
  }
});

test('the HeaderMinimal divider does not dangle — it renders only when the action precedes it', () => {
  // The vertical hairline divider must be guarded by onOpenFullScreen so it does
  // not float orphaned beside Close when no action is present.
  const dividerLines = drawerSrc
    .split('\n')
    .filter((line) => /width:\s*1,\s*height:\s*18/.test(line));
  assert.equal(dividerLines.length, 1, 'the minimal-header divider should appear exactly once');
  assert.match(dividerLines[0], /onOpenFullScreen\s*&&/, 'the divider must be guarded by onOpenFullScreen so it never dangles');
});

test('the canvas demo supplies an onOpenFullScreen handler so the button is visibly rendered', () => {
  // ds-007 precedent: a visible header change must be documented on the canvas so
  // the builder can re-review the gate. The demo must pass onOpenFullScreen.
  assert.match(appSrc, /onOpenFullScreen=\$\{/, 'the canvas Drawer demo must supply an onOpenFullScreen handler');
});
