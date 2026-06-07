#!/usr/bin/env node
// Dashboard launcher (ADR-0002): ONE launcher, not a .sh + .bat pair. All OS
// differences are confined to the spawn options and the kill path below.
//
// Usage:
//   node dashboard/launch.mjs           # or: launch (+ auto-open browser)
//   node dashboard/launch.mjs stop      # stop the detached server
//   node dashboard/launch.mjs status    # report running/not-running (read-only)
//
// `launch` spawns serve.mjs DETACHED so the terminal returns to a prompt; the
// child binds 127.0.0.1 on an ephemeral port and writes the runfile itself,
// then the default browser is auto-opened at the served URL.

import { spawn, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { discoverRoot } from './discovery.mjs';
import {
  readRunfile,
  deleteRunfile,
  isPidAlive,
  inspectExisting,
} from './runfile.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVE_ENTRY = path.join(__dirname, 'serve.mjs');

/** Wait until a fresh runfile (pid !== excludePid) appears, or time out. */
async function waitForRunfile(root, excludePid, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rf = readRunfile(root);
    if (rf && rf.pid !== excludePid && isPidAlive(rf.pid)) return rf;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

/**
 * Launch the dashboard for `root`. Reuses a live server, replaces a stale one.
 * Returns { action: 'launched'|'reused', pid, port } (or throws on failure).
 */
export async function launchDashboard(root) {
  const existing = inspectExisting(root); // reaps a stale runfile as a side effect
  if (existing.state === 'live') {
    return { action: 'reused', pid: existing.runfile.pid, port: existing.runfile.port };
  }

  // Detached spawn — differences across OSes live ONLY in these options.
  // POSIX: detached:true lets the child outlive the shell.
  // Windows: detached:true + windowsHide:true; do NOT rely on shell job control
  //          or `start /b` semantics that tie the child to the console window.
  // cwd is a neutral temp dir, NOT the project root: a running process locks its
  // cwd on Windows, and the dashboard must never hold a lock on the project. The
  // child discovers the root from AGENTHEIM_ROOT instead of cwd.
  const child = spawn(process.execPath, [SERVE_ENTRY], {
    cwd: tmpdir(),
    env: { ...process.env, AGENTHEIM_ROOT: root },
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
  });
  child.unref();

  const rf = await waitForRunfile(root, /* excludePid */ undefined);
  if (!rf) {
    throw new Error('Dashboard server did not report a runfile within the timeout.');
  }
  return { action: 'launched', pid: rf.pid, port: rf.port };
}

/**
 * Terminate `pid`. process.kill works on both OSes; on Windows, if the process
 * is stubborn we fall back to `taskkill /PID <pid> /F /T` (documented in ADR-0002).
 */
export function terminate(pid) {
  if (!isPidAlive(pid)) return;
  try {
    process.kill(pid);
  } catch {
    /* fall through to platform fallback */
  }
  if (process.platform === 'win32' && isPidAlive(pid)) {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/F', '/T'], { stdio: 'ignore' });
    } catch {
      /* best effort */
    }
  }
}

/**
 * Stop the dashboard for `root`: kill by pid, remove the runfile.
 * Returns { action: 'stopped'|'none', pid? }.
 */
export async function stopDashboard(root) {
  const rf = readRunfile(root);
  if (!rf) return { action: 'none' };
  terminate(rf.pid);
  deleteRunfile(root);
  return { action: 'stopped', pid: rf.pid };
}

/**
 * Report whether a dashboard is running for `root` WITHOUT launching or stopping.
 * Pure read over the runfile via inspectExisting (which reaps a stale file).
 * Returns { state: 'running', port, pid } or { state: 'none' }.
 */
export function statusDashboard(root) {
  const existing = inspectExisting(root); // reaps a stale runfile as a side effect
  if (existing.state === 'live') {
    return { state: 'running', port: existing.runfile.port, pid: existing.runfile.pid };
  }
  return { state: 'none' };
}

/**
 * Pick the OS-native browser opener for `url`. This is the one new OS-divergent
 * path (joining spawn/kill); it stays here so launch.mjs remains the single home
 * for cross-OS differences (ADR-0002).
 *   Windows: cmd /c start "" <url>   (the empty "" is start's title arg)
 *   macOS:   open <url>
 *   Linux:   xdg-open <url>
 */
export function browserCommand(platform, url) {
  if (platform === 'win32') return { command: 'cmd', args: ['/c', 'start', '', url] };
  if (platform === 'darwin') return { command: 'open', args: [url] };
  return { command: 'xdg-open', args: [url] };
}

/**
 * Best-effort auto-open of the default browser at `url`. Detached + unref so it
 * never holds the terminal, and any failure (no display, missing opener) is
 * swallowed — a failed browser-open must not fail the launch.
 * `opts.spawnFn` / `opts.platform` are injectable for tests.
 */
export function openBrowser(url, opts = {}) {
  const spawnFn = opts.spawnFn || spawn;
  const platform = opts.platform || process.platform;
  const { command, args } = browserCommand(platform, url);
  try {
    const child = spawnFn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    if (child && typeof child.unref === 'function') child.unref();
  } catch {
    /* best effort — a failed browser-open never fails the launch */
  }
}

// ---- CLI ----
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const cmd = process.argv[2] || 'launch';
  const root = discoverRoot(process.cwd());
  if (cmd === 'stop') {
    const r = await stopDashboard(root);
    if (r.action === 'stopped') console.log(`Dashboard stopped (pid ${r.pid}); runfile removed.`);
    else console.log('No dashboard running (no runfile).');
  } else if (cmd === 'status') {
    const r = statusDashboard(root);
    if (r.state === 'running') console.log(`Dashboard running at http://127.0.0.1:${r.port}/ (pid ${r.pid}).`);
    else console.log('No dashboard running.');
  } else {
    const r = await launchDashboard(root);
    const url = `http://127.0.0.1:${r.port}/`;
    const verb = r.action === 'reused' ? 'already running' : 'launched';
    console.log(`Dashboard ${verb} at ${url} (pid ${r.pid}).`);
    openBrowser(url);
    console.log('Opening it in your default browser…');
    console.log('Stop it with: node dashboard/launch.mjs stop');
  }
}
