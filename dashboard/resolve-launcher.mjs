#!/usr/bin/env node
// Env-independent launcher resolver (infrastructure-010; addendum to ADR-0002).
//
// WHY THIS EXISTS
// The /dashboard slash-command card cannot reach launch.mjs via
// `${CLAUDE_PLUGIN_ROOT:-.}/dashboard/launch.mjs`: in an INSTALLED plugin's
// command Bash context, $CLAUDE_PLUGIN_ROOT comes through EMPTY (verified in the
// field, v0.8.3, Windows 11), and `${VAR:-.}` collapses to `.` → the consumer
// project root, where no dashboard/ exists → `Cannot find module`. So the card
// must locate the launcher WITHOUT trusting that env var for correctness.
//
// MECHANISM (stdlib only, zero deps — ADR-0002)
//   1. Derive the plugin cache root from os.homedir() (covers %USERPROFILE% and
//      $HOME alike; never read the raw env vars):
//        <home>/.claude/plugins/cache/agentheim/agentheim
//      The agentheim/agentheim <source>/<plugin> segment is confirmed against the
//      live cache. The cache layout is a stable-in-practice implementation detail
//      (claude-code-guide: described, not a formal contract) — so we FAIL LOUDLY
//      if it's absent rather than silently degrading.
//   2. Pick the newest version subdir by SEMVER maximum (numeric per field, not
//      lexical: 0.8.10 > 0.8.9 > 0.8.3), ignoring non-semver dir names.
//   3. Resolve <version>/dashboard/launch.mjs; require it to exist.
//   4. spawn the real launcher (process.execPath) with cwd INHERITED (the consumer
//      project) and stdio: 'inherit', exiting with the child's code. This keeps the
//      load-bearing script-in-cache + cwd-in-project split so the launcher's
//      discoverRoot(process.cwd()) still finds the foreign .agentheim/.
//   5. When run from the Agentheim repo itself, the launcher lives right beside
//      this module — short-circuit to the repo-local launch.mjs and skip the cache.
//
// $CLAUDE_PLUGIN_ROOT is treated as an OPTIONAL fast-path only (forward-compatible
// if Claude Code ever populates it reliably); correctness NEVER depends on it.

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * The plugin cache root for Agentheim, derived purely from a home directory.
 * Works for both a win32-shaped homedir (C:\Users\x) and a POSIX one (/home/x):
 * path.join normalizes separators for the running platform.
 * @param {string} homedir
 * @returns {string} <home>/.claude/plugins/cache/agentheim/agentheim
 */
export function cacheRoot(homedir) {
  return path.join(homedir, '.claude', 'plugins', 'cache', 'agentheim', 'agentheim');
}

/**
 * Compare two semver strings numerically. Returns >0 if a is newer, <0 if older.
 * Non-throwing helper used by pickNewestVersion.
 */
function compareSemver(a, b) {
  const pa = a.match(SEMVER), pb = b.match(SEMVER);
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i]);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Pick the SEMVER-maximum dir name from a list, ignoring any name that isn't a
 * bare x.y.z. Returns null when none qualify. Numeric per-field comparison avoids
 * the lexical trap where "0.8.10" sorts before "0.8.9".
 * @param {string[]} dirNames
 * @returns {string|null}
 */
export function pickNewestVersion(dirNames) {
  const versions = dirNames.filter((n) => SEMVER.test(n));
  if (versions.length === 0) return null;
  return versions.reduce((best, v) => (compareSemver(v, best) > 0 ? v : best));
}

/**
 * Resolve the path to the newest cached dashboard/launch.mjs under a cache root.
 * Walks version dirs newest-first and returns the first whose dashboard/launch.mjs
 * actually exists (so a half-written newer version dir can't break the launch).
 * Fails LOUDLY — never returns a `.`-relative fallback — when nothing is found.
 * @param {string} root  the agentheim/agentheim cache root (see cacheRoot)
 * @returns {string} absolute path to launch.mjs
 */
export function resolveLauncher(root) {
  let names = [];
  try {
    names = readdirSync(root).filter((n) => {
      try {
        return statSync(path.join(root, n)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    names = [];
  }

  const versions = names
    .filter((n) => SEMVER.test(n))
    .sort((a, b) => compareSemver(b, a)); // newest first

  for (const v of versions) {
    const launcher = path.join(root, v, 'dashboard', 'launch.mjs');
    if (existsSync(launcher)) return launcher;
  }

  throw new Error(
    `no cached launcher found under ${root} — searched for ` +
      `<version>/dashboard/launch.mjs in version dirs [${versions.join(', ') || 'none'}]. ` +
      `Is the Agentheim plugin installed? (Do NOT fall back to a project-relative path.)`
  );
}

/**
 * Full resolution for the CLI: prefer the repo-local launcher (Agentheim's own
 * repo, where launch.mjs sits beside this module), else the newest cached one.
 * @param {object} [opts]
 * @param {string} [opts.moduleDir]  dir of this module (defaults to import.meta.url)
 * @param {string} [opts.homedir]    home dir (defaults to os.homedir())
 * @returns {string} absolute path to launch.mjs
 */
export function locateLauncher(opts = {}) {
  const moduleDir = opts.moduleDir || path.dirname(fileURLToPath(import.meta.url));
  const repoLocal = path.join(moduleDir, 'launch.mjs');
  if (existsSync(repoLocal)) return repoLocal;
  const homedir = opts.homedir || os.homedir();
  return resolveLauncher(cacheRoot(homedir));
}

/**
 * Locate the launcher and spawn it, cwd untouched, exiting with the child's code.
 * This is the whole runtime behavior of the resolver, exported so the card's
 * `node -e` bootstrap (which only finds THIS module via the same cache walk) can
 * delegate the rest here — keeping the un-testable inline bootstrap minimal.
 * @param {string[]} verbArgs  the /dashboard verb (stop | status | <empty>=launch)
 * @param {object}  [opts]     forwarded to locateLauncher (moduleDir, homedir)
 */
export function run(verbArgs = [], opts = {}) {
  let launcher;
  try {
    launcher = locateLauncher(opts);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
    return;
  }
  // cwd inherited (the consumer project) so launch.mjs's discoverRoot(process.cwd())
  // finds the foreign .agentheim/. stdio inherited so the URL/pid/status print through.
  const child = spawn(process.execPath, [launcher, ...verbArgs], { stdio: 'inherit' });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
  child.on('error', (err) => {
    console.error(`Failed to start the dashboard launcher: ${err.message}`);
    process.exit(1);
  });
}

// ---- CLI: delegate to the real launcher, cwd untouched ----
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  run(process.argv.slice(2));
}
