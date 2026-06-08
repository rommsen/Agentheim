// Static guard for the /dashboard command card (ADR-0002 + infrastructure-010 addendum).
//
// History of the regression class this guards:
//   - infrastructure-008: a bare `node dashboard/launch.mjs` broke in every foreign
//     consumer project (project-root assumption). "Fixed" with ${CLAUDE_PLUGIN_ROOT:-.}.
//   - infrastructure-010: that fix was inert — $CLAUDE_PLUGIN_ROOT is EMPTY in the
//     command's Bash context for an installed plugin, so ${VAR:-.} collapsed back to
//     the project path and reproduced the exact module-not-found error. The card now
//     uses an env-INDEPENDENT `node -e` bootstrap that derives the launcher from
//     os.homedir() via dashboard/resolve-launcher.mjs.
//
// This test extracts the launcher invocations from the card and asserts the
// env-independent resolver shape, so the next edit to the card can't silently
// reintroduce either the project-relative-path OR the $CLAUDE_PLUGIN_ROOT-dependent
// regression. It also guards the launcher's printed user-facing hint strings.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  extractLauncherInvocations,
  verbOf,
  isPluginRooted,
  isEnvIndependentResolver,
} from './helpers/card.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..');
const cardPath = path.join(repoRoot, 'commands', 'dashboard.md');
const launchPath = path.join(here, '..', 'launch.mjs');

test('every launcher invocation in the card is the env-independent resolver bootstrap', () => {
  const card = readFileSync(cardPath, 'utf8');
  const invocations = extractLauncherInvocations(card);
  assert.ok(invocations.length >= 3, 'expected at least three launcher invocations in the card');
  for (const line of invocations) {
    assert.ok(
      isEnvIndependentResolver(line),
      `card invocation is not the env-independent resolver bootstrap ` +
        `(infrastructure-010 regression): ${line}`
    );
  }
});

test('no card invocation depends on $CLAUDE_PLUGIN_ROOT (infrastructure-010 field failure)', () => {
  const card = readFileSync(cardPath, 'utf8');
  for (const line of extractLauncherInvocations(card)) {
    assert.ok(
      !isPluginRooted(line),
      `card invocation depends on $CLAUDE_PLUGIN_ROOT, which is empty in installed ` +
        `consumers (infrastructure-010): ${line}`
    );
  }
});

test('the card derives the cache path from os.homedir() (never raw env vars)', () => {
  const card = readFileSync(cardPath, 'utf8');
  for (const line of extractLauncherInvocations(card)) {
    assert.match(line, /os\.homedir\(\)/, `card invocation must derive the path from os.homedir(): ${line}`);
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
  const offending = card
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^cd\s+\S/.test(l));
  assert.deepEqual(offending, [], `card must not change directory: ${offending.join(' | ')}`);
});

test('the launcher prints no bare project-relative `node dashboard/launch.mjs` hint', () => {
  const src = readFileSync(launchPath, 'utf8');
  const stringLiterals = src.match(/(['"`])(?:\\.|(?!\1).)*\1/g) || [];
  for (const lit of stringLiterals) {
    assert.ok(
      !/node\s+dashboard\/launch\.mjs/.test(lit),
      `launcher prints a project-relative invocation hint (infrastructure-008 class): ${lit}`
    );
  }
});

// --- Meta: prove the extractor/predicates actually CATCH the regression classes. ---
// A passing guard against an already-correct card is worthless unless we show it
// would fail against the bad forms (both the 008 bare-relative and the 010
// $CLAUDE_PLUGIN_ROOT-dependent ones).

test('predicate REJECTS a bare project-relative card (infrastructure-008 Red proof)', () => {
  const badCard = [
    'No argument → launch:',
    '```',
    'node dashboard/launch.mjs',
    '```',
  ].join('\n');
  const invocations = extractLauncherInvocations(badCard);
  assert.equal(invocations.length, 1, 'extractor must find the bad invocation');
  assert.ok(
    !isEnvIndependentResolver(invocations[0]),
    'the resolver predicate must reject a bare `node dashboard/launch.mjs`'
  );
});

test('predicate REJECTS a $CLAUDE_PLUGIN_ROOT-dependent card (infrastructure-010 Red proof)', () => {
  const badCard = [
    '```',
    'node "${CLAUDE_PLUGIN_ROOT:-.}/dashboard/launch.mjs"',
    '```',
  ].join('\n');
  const invocations = extractLauncherInvocations(badCard);
  assert.equal(invocations.length, 1, 'extractor must find the env-dependent invocation');
  assert.ok(isPluginRooted(invocations[0]), 'plugin-rooted predicate must flag it');
  assert.ok(
    !isEnvIndependentResolver(invocations[0]),
    'the resolver predicate must reject a $CLAUDE_PLUGIN_ROOT-dependent invocation'
  );
});

test('verb-missing detection FAILS a card that drops the status verb (Red proof)', () => {
  const goodLaunch =
    "node -e \"const os=require('node:os');os.homedir();/*resolve-launcher.mjs*/\"";
  const goodStop =
    "node -e \"const os=require('node:os');os.homedir();/*resolve-launcher.mjs*/\" stop";
  const badCard = ['```', goodLaunch, '```', '```', goodStop, '```'].join('\n');
  const verbs = new Set(extractLauncherInvocations(badCard).map(verbOf));
  assert.ok(!verbs.has('status'), 'detection must notice the dropped status verb');
});
