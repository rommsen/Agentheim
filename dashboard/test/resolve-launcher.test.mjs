// Unit tests for the env-independent launcher resolver (infrastructure-010, ADR-0002 addendum).
//
// The /dashboard card can NOT depend on $CLAUDE_PLUGIN_ROOT — it comes through
// EMPTY in an installed plugin's command Bash context (the v0.8.3 field failure).
// resolve-launcher.mjs derives the plugin cache path from os.homedir(), picks the
// newest cached version by SEMVER (not lexical order), and resolves launch.mjs.
//
// These tests exercise the PURE helpers in isolation — no real installed cache,
// no spawning. cacheRoot/pickNewestVersion/resolveLauncher all take their inputs
// as arguments so they're deterministic on any platform.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  cacheRoot,
  pickNewestVersion,
  resolveLauncher,
  locateLauncher,
} from '../resolve-launcher.mjs';

// --- cacheRoot: homedir → ~/.claude/plugins/cache/agentheim/agentheim ---

test('cacheRoot derives the plugin cache path under a POSIX-shaped homedir', () => {
  const root = cacheRoot('/home/marco');
  // path.join normalizes separators per the running platform; compare via join.
  assert.equal(
    root,
    path.join('/home/marco', '.claude', 'plugins', 'cache', 'agentheim', 'agentheim')
  );
});

test('cacheRoot derives the plugin cache path under a win32-shaped homedir', () => {
  const root = cacheRoot('C:\\Users\\marco');
  assert.equal(
    root,
    path.join('C:\\Users\\marco', '.claude', 'plugins', 'cache', 'agentheim', 'agentheim')
  );
});

test('cacheRoot uses the agentheim/agentheim source/plugin segment (confirmed against live cache)', () => {
  const root = cacheRoot('/h');
  assert.match(root.replace(/\\/g, '/'), /\/\.claude\/plugins\/cache\/agentheim\/agentheim$/);
});

// --- pickNewestVersion: SEMVER maximum, NOT lexical ---

test('pickNewestVersion picks the semver maximum (the 0.8.10 > 0.8.9 lexical trap)', () => {
  assert.equal(pickNewestVersion(['0.8.3', '0.8.9', '0.8.10']), '0.8.10');
});

test('pickNewestVersion compares major/minor numerically, not as strings', () => {
  assert.equal(pickNewestVersion(['0.9.0', '0.10.0', '0.8.0']), '0.10.0');
  assert.equal(pickNewestVersion(['1.0.0', '0.99.99']), '1.0.0');
  assert.equal(pickNewestVersion(['2.0.0', '10.0.0', '9.9.9']), '10.0.0');
});

test('pickNewestVersion ignores non-semver dir names', () => {
  assert.equal(
    pickNewestVersion(['0.8.3', '.tmp', 'latest', 'node_modules', '0.8.10', 'README.md']),
    '0.8.10'
  );
});

test('pickNewestVersion returns null when no semver dir names are present', () => {
  assert.equal(pickNewestVersion(['latest', '.tmp', 'foo']), null);
  assert.equal(pickNewestVersion([]), null);
});

test('pickNewestVersion accepts the live cache version set and picks 0.8.3', () => {
  // Mirrors the live cache at time of writing: 0.6.0 0.7.0 0.8.0 0.8.2 0.8.3.
  assert.equal(pickNewestVersion(['0.6.0', '0.7.0', '0.8.0', '0.8.2', '0.8.3']), '0.8.3');
});

// --- resolveLauncher: pick newest version dir that actually has dashboard/launch.mjs ---

function makeCache(versions) {
  const cache = mkdtempSync(path.join(tmpdir(), 'infra010-cache-'));
  for (const v of versions) {
    const dash = path.join(cache, v, 'dashboard');
    mkdirSync(dash, { recursive: true });
    writeFileSync(path.join(dash, 'launch.mjs'), '// stub launcher\n');
  }
  return cache;
}

test('resolveLauncher returns <newest-version>/dashboard/launch.mjs from a populated cache', () => {
  const cache = makeCache(['0.8.3', '0.8.9', '0.8.10']);
  try {
    const resolved = resolveLauncher(cache);
    assert.equal(resolved, path.join(cache, '0.8.10', 'dashboard', 'launch.mjs'));
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
});

test('resolveLauncher skips a newer version dir that lacks launch.mjs, falling to the next', () => {
  const cache = mkdtempSync(path.join(tmpdir(), 'infra010-gap-'));
  try {
    // 0.8.10 exists but has NO dashboard/launch.mjs; 0.8.3 is complete.
    mkdirSync(path.join(cache, '0.8.10'), { recursive: true });
    const good = path.join(cache, '0.8.3', 'dashboard');
    mkdirSync(good, { recursive: true });
    writeFileSync(path.join(good, 'launch.mjs'), '// stub\n');
    const resolved = resolveLauncher(cache);
    assert.equal(resolved, path.join(cache, '0.8.3', 'dashboard', 'launch.mjs'));
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
});

test('resolveLauncher fails loudly, naming the searched cache path, when nothing is found', () => {
  const empty = mkdtempSync(path.join(tmpdir(), 'infra010-empty-'));
  try {
    assert.throws(
      () => resolveLauncher(empty),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /no cached launcher/i);
        assert.ok(err.message.includes(empty), 'error message must name the searched cache path');
        // It must NOT silently fall back to a `.`-relative path.
        assert.doesNotMatch(err.message, /falling back/i);
        return true;
      }
    );
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test('resolveLauncher fails loudly when the cache dir itself does not exist', () => {
  const missing = path.join(tmpdir(), 'infra010-does-not-exist-' + Date.now());
  assert.throws(() => resolveLauncher(missing), /no cached launcher/i);
});

// --- locateLauncher: repo-local short-circuit (Agentheim's own repo, env unset) ---

test('locateLauncher uses the repo-local launch.mjs beside the module, skipping the cache', () => {
  // moduleDir contains launch.mjs (a sibling). Pass a bogus homedir to prove the
  // cache is NOT consulted when the repo-local launcher exists.
  const moduleDir = mkdtempSync(path.join(tmpdir(), 'infra010-repo-'));
  try {
    writeFileSync(path.join(moduleDir, 'launch.mjs'), '// repo-local launcher\n');
    const resolved = locateLauncher({
      moduleDir,
      homedir: '/no/such/home/should/never/be/read',
    });
    assert.equal(resolved, path.join(moduleDir, 'launch.mjs'));
  } finally {
    rmSync(moduleDir, { recursive: true, force: true });
  }
});

test('locateLauncher falls through to the home cache when no repo-local launcher exists', () => {
  const moduleDir = mkdtempSync(path.join(tmpdir(), 'infra010-nolocal-')); // no launch.mjs here
  const cache = makeCache(['0.8.3', '0.8.10']);
  // Build a fake home whose cacheRoot points at our temp cache.
  const home = mkdtempSync(path.join(tmpdir(), 'infra010-home-'));
  const target = cacheRoot(home);
  mkdirSync(path.dirname(target), { recursive: true });
  // symlink the agentheim/agentheim dir to our prebuilt cache
  symlinkSync(cache, target, 'junction');
  try {
    const resolved = locateLauncher({ moduleDir, homedir: home });
    // Resolved via the home cache (through the junction), newest version 0.8.10.
    assert.ok(existsSync(resolved), 'resolved launcher must exist');
    assert.equal(path.join('0.8.10', 'dashboard', 'launch.mjs'),
      resolved.split(path.sep).slice(-3).join(path.sep),
      `expected newest-version launcher, got ${resolved}`);
  } finally {
    rmSync(moduleDir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    rmSync(cache, { recursive: true, force: true });
  }
});
