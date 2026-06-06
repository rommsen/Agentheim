// Runfile management (ADR-0002): `.agentheim/.dashboard/runtime.json` is the
// sole runtime state on disk = { pid, port, startedAt }. Provides the
// reuse-or-replace logic that keeps a relaunch from orphaning a process.

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const DASHBOARD_DIR = '.dashboard';
const RUNFILE_NAME = 'runtime.json';

/** Absolute path to the runfile for a project root. */
export function runfilePath(root) {
  return path.join(root, '.agentheim', DASHBOARD_DIR, RUNFILE_NAME);
}

/** Absolute path to the gitignored dashboard runtime dir. */
export function dashboardDir(root) {
  return path.join(root, '.agentheim', DASHBOARD_DIR);
}

/** Write { pid, port, startedAt } atomically-ish to the runfile. */
export function writeRunfile(root, { pid, port, startedAt }) {
  const dir = dashboardDir(root);
  mkdirSync(dir, { recursive: true });
  writeFileSync(runfilePath(root), JSON.stringify({ pid, port, startedAt }, null, 2));
}

/** Read the runfile, or null if it does not exist / is unreadable. */
export function readRunfile(root) {
  const p = runfilePath(root);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/** Delete the runfile if present. */
export function deleteRunfile(root) {
  const p = runfilePath(root);
  if (existsSync(p)) rmSync(p, { force: true });
}

/**
 * Is a process with `pid` alive? `process.kill(pid, 0)` probes without
 * delivering a signal: ESRCH ⇒ dead, EPERM ⇒ alive (exists, not ours).
 */
export function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

/**
 * Inspect any existing runfile and classify it:
 * - { state: 'none' }                 — no runfile
 * - { state: 'live', runfile }        — pid alive: caller should reuse-or-replace
 * - { state: 'stale' }                — pid dead: runfile reaped here so a relaunch
 *                                        never reuses a dead port / orphans nothing
 */
export function inspectExisting(root) {
  const runfile = readRunfile(root);
  if (!runfile) return { state: 'none' };
  if (isPidAlive(runfile.pid)) return { state: 'live', runfile };
  deleteRunfile(root);
  return { state: 'stale' };
}
