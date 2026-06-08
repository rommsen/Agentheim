// Static guard for infrastructure-009 (guarding infrastructure-008's fix, ADR-0002).
//
// The /dashboard slash-command card is plain markdown prose with no automated
// invocation check — the infrastructure-008 bug (a bare `node dashboard/launch.mjs`
// that breaks in every foreign consumer project) and its sibling infrastructure-004
// were both "project-root assumption" regressions that NO test would have caught.
// This test extracts the launcher invocation lines from the card and asserts the
// plugin-rooted form, so the next edit to the card can't silently reintroduce the
// project-relative-path regression class. It also guards the launcher's printed
// user-facing hint strings against the same class.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractLauncherInvocations, verbOf, isPluginRooted } from './helpers/card.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..');
const cardPath = path.join(repoRoot, 'commands', 'dashboard.md');
const launchPath = path.join(here, '..', 'launch.mjs');

test('every launcher invocation in the card is plugin-rooted (no bare project-relative path)', () => {
  const card = readFileSync(cardPath, 'utf8');
  const invocations = extractLauncherInvocations(card);
  assert.ok(invocations.length >= 3, 'expected at least three launcher invocations in the card');
  for (const line of invocations) {
    assert.ok(
      isPluginRooted(line),
      `card invocation is not plugin-rooted (infrastructure-008 regression): ${line}`
    );
  }
});

test('the card carries all three verbs: launch, stop, status', () => {
  const card = readFileSync(cardPath, 'utf8');
  const verbs = new Set(extractLauncherInvocations(card).map(verbOf));
  for (const verb of ['launch', 'stop', 'status']) {
    assert.ok(verbs.has(verb), `card is missing the "${verb}" verb`);
  }
});

test('the card issues no `cd` directive (launcher must run from the consumer cwd)', () => {
  const card = readFileSync(cardPath, 'utf8');
  // Match a `cd ` command at the start of a fenced/runnable line, not the prose
  // word "cd" inside a sentence. Runnable lines are the ones we'd execute.
  const offending = card
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^cd\s+\S/.test(l));
  assert.deepEqual(offending, [], `card must not change directory: ${offending.join(' | ')}`);
});

test('the launcher prints no bare project-relative `node dashboard/launch.mjs` hint', () => {
  const src = readFileSync(launchPath, 'utf8');
  // The infrastructure-008 fix replaced the stale `node dashboard/launch.mjs stop`
  // hint with `/dashboard stop`. Guard against any printed string reintroducing the
  // project-relative invocation form. We look only at user-facing console output:
  // a bare `node dashboard/launch.mjs` anywhere in a printed string is the regression.
  const stringLiterals = src.match(/(['"`])(?:\\.|(?!\1).)*\1/g) || [];
  for (const lit of stringLiterals) {
    assert.ok(
      !/node\s+dashboard\/launch\.mjs/.test(lit),
      `launcher prints a project-relative invocation hint (infrastructure-008 class): ${lit}`
    );
  }
});

// --- Meta: prove the extractor/assertions actually CATCH the regression class. ---
// A passing guard against an already-correct card is worthless unless we show it
// would fail against the bad form. These exercise the pure extraction/predicate
// logic against deliberately-bad samples (the infrastructure-008 pre-fix card).

test('extractor + plugin-rooted predicate FAIL against a bare project-relative card (Red proof)', () => {
  const badCard = [
    'No argument → launch:',
    '```',
    'node dashboard/launch.mjs',
    '```',
    '`stop`:',
    '```',
    'node dashboard/launch.mjs stop',
    '```',
  ].join('\n');
  const invocations = extractLauncherInvocations(badCard);
  assert.equal(invocations.length, 2, 'extractor must find the bad invocations');
  assert.ok(
    invocations.some((line) => !isPluginRooted(line)),
    'the plugin-rooted predicate must reject a bare `node dashboard/launch.mjs`'
  );
});

test('verb-missing detection FAILS a card that drops the status verb (Red proof)', () => {
  const badCard = [
    '```',
    'node "${CLAUDE_PLUGIN_ROOT:-.}/dashboard/launch.mjs"',
    '```',
    '```',
    'node "${CLAUDE_PLUGIN_ROOT:-.}/dashboard/launch.mjs" stop',
    '```',
  ].join('\n');
  const verbs = new Set(extractLauncherInvocations(badCard).map(verbOf));
  assert.ok(!verbs.has('status'), 'detection must notice the dropped status verb');
});
