// Foreign-project integration test for infrastructure-009 (ADR-0002).
//
// Makes the hand-run infrastructure-008 end-to-end simulation PERMANENT: run the
// EXACT /dashboard card command form — `node "${CLAUDE_PLUGIN_ROOT:-.}/dashboard/launch.mjs"`
// with CLAUDE_PLUGIN_ROOT pointing at this repo and cwd inside a temp project that
// has ONLY `.agentheim/` (no dashboard/) — and assert the full launch → status →
// stop cycle, with the runfile landing under the FOREIGN project's
// `.agentheim/.dashboard/`. This is the regression the 008 fix addressed.
//
// Teardown is the risk area (ADR-0002: detached, unref'd process + Windows
// process.kill/taskkill): launch spawns a detached server, so the test MUST stop
// it via the launcher's own stop path AND remove the temp dir in a `finally`, so a
// failed assertion never orphans a process or leaks a temp project.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { runfilePath } from '../runfile.mjs';
import { extractLauncherInvocations, verbOf } from './helpers/card.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..');
const cardPath = path.join(repoRoot, 'commands', 'dashboard.md');

/**
 * Pull the launcher command for a given verb straight out of the card, so the
 * integration test runs the LITERAL card form (incl. the `${CLAUDE_PLUGIN_ROOT:-.}`
 * shell expansion) rather than a hand-retyped approximation that could drift.
 */
function cardCommandFor(verb) {
  const card = readFileSync(cardPath, 'utf8');
  const invocations = extractLauncherInvocations(card);
  const match = invocations.find((line) => verbOf(line) === verb);
  if (!match) throw new Error(`card has no "${verb}" invocation`);
  return match;
}

/**
 * Run a card command through bash (the card's `allowed-tools: Bash(node:*)`
 * execution context), so `${CLAUDE_PLUGIN_ROOT:-.}` is expanded by the same shell
 * Claude Code uses. cwd is the foreign project; CLAUDE_PLUGIN_ROOT is the repo.
 */
function runCard(command, { cwd, pluginRoot }) {
  return spawnSync('bash', ['-c', command], {
    cwd,
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
    encoding: 'utf8',
  });
}

test('foreign project: card-form launch writes the runfile under the project, status + stop work', async () => {
  const foreign = mkdtempSync(path.join(tmpdir(), 'infra009-foreign-'));
  mkdirSync(path.join(foreign, '.agentheim'));

  const launchCmd = cardCommandFor('launch');
  const statusCmd = cardCommandFor('status');
  const stopCmd = cardCommandFor('stop');

  // Guard: bash must be available for the card execution context. If not, the
  // card's `${CLAUDE_PLUGIN_ROOT:-.}` form cannot be exercised — skip rather than
  // false-fail on an environment without bash.
  const bashProbe = spawnSync('bash', ['-c', 'exit 0']);
  if (bashProbe.error) {
    rmSync(foreign, { recursive: true, force: true });
    return; // node:test treats a non-asserting test as passing; nothing to assert.
  }

  try {
    // --- launch via the literal card command ---
    const launched = runCard(launchCmd, { cwd: foreign, pluginRoot: repoRoot });
    assert.equal(
      launched.status,
      0,
      `launch failed (no module-not-found expected):\n${launched.stdout}\n${launched.stderr}`
    );
    assert.doesNotMatch(
      `${launched.stdout}${launched.stderr}`,
      /Cannot find module/,
      'plugin-rooted launch must resolve launch.mjs (no module-not-found)'
    );

    // --- the runfile lands under the FOREIGN project, not the repo ---
    const rfPath = runfilePath(foreign);
    let appeared = false;
    for (let i = 0; i < 100 && !appeared; i++) {
      appeared = existsSync(rfPath);
      if (!appeared) await new Promise((r) => setTimeout(r, 50));
    }
    assert.ok(appeared, `runfile must be written under the foreign project at ${rfPath}`);
    const rf = JSON.parse(readFileSync(rfPath, 'utf8'));
    assert.ok(rf.pid > 0 && rf.port > 0, 'runfile must carry a live pid + port');
    // The runfile landing under `foreign` (cwd) proves discovery resolved to the
    // foreign project, not the plugin repo — the infrastructure-008 regression.

    // --- status reports running ---
    const status = runCard(statusCmd, { cwd: foreign, pluginRoot: repoRoot });
    assert.equal(status.status, 0, `status failed:\n${status.stderr}`);
    assert.match(status.stdout, /running/i, `status should report running:\n${status.stdout}`);
  } finally {
    // --- mandatory teardown: stop the detached server, remove the temp project ---
    try {
      const stopped = runCard(stopCmd, { cwd: foreign, pluginRoot: repoRoot });
      // Best-effort assertion-free stop in finally; surface its result only via runfile check.
      void stopped;
    } catch {
      /* swallow — teardown must not mask the real failure */
    }
    rmSync(foreign, { recursive: true, force: true });
  }
});

test('foreign project: after card-form stop, the runfile is gone (no orphan)', async () => {
  const foreign = mkdtempSync(path.join(tmpdir(), 'infra009-stop-'));
  mkdirSync(path.join(foreign, '.agentheim'));

  const bashProbe = spawnSync('bash', ['-c', 'exit 0']);
  if (bashProbe.error) {
    rmSync(foreign, { recursive: true, force: true });
    return;
  }

  const launchCmd = cardCommandFor('launch');
  const stopCmd = cardCommandFor('stop');
  try {
    runCard(launchCmd, { cwd: foreign, pluginRoot: repoRoot });
    const rfPath = runfilePath(foreign);
    for (let i = 0; i < 100 && !existsSync(rfPath); i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const stopped = runCard(stopCmd, { cwd: foreign, pluginRoot: repoRoot });
    assert.equal(stopped.status, 0, `stop failed:\n${stopped.stderr}`);

    let gone = false;
    for (let i = 0; i < 100 && !gone; i++) {
      gone = !existsSync(rfPath);
      if (!gone) await new Promise((r) => setTimeout(r, 50));
    }
    assert.ok(gone, 'stop must remove the runfile (no orphaned runtime state)');
  } finally {
    // Defensive second stop in case the assertion above tripped before stop ran.
    try {
      runCard(stopCmd, { cwd: foreign, pluginRoot: repoRoot });
    } catch {
      /* best effort */
    }
    rmSync(foreign, { recursive: true, force: true });
  }
});
