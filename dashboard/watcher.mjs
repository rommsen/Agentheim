// .agentheim/ file-watcher (ADR-0006, supersedes-in-part ADR-0002's
// request/response-only clause). Watches the discovered project's `.agentheim/`
// tree and emits RAW change pointers — { type: 'tree-changed', path } — on every
// mutation. It does NOT interpret a change as a Task transition; that is the
// consumer's job (agentic-workflow-009). Every emitted path is validated against
// the project root, like every other file path in the runtime.
//
// Transport strategy (ADR-0006):
//   - Primary: node:fs.watch with { recursive: true } where the platform supports
//     it (macOS, Windows). One watcher covers the whole subtree.
//   - Fallback: a debounced stat-poll of the tree where recursive watch is
//     unreliable or unsupported (notably Linux, and some Windows / network-drive
//     cases). The poll diffs a snapshot of file mtimes/sizes to detect changes.
// Either source funnels through the same debounce so a burst (e.g. a move that is
// a delete+create, or an editor's atomic save) collapses into one event.

import fs from 'node:fs';
import path from 'node:path';
import { resolveInRoot } from './discovery.mjs';

const RECURSIVE_SUPPORTED = process.platform === 'darwin' || process.platform === 'win32';

/**
 * Start watching `<root>/.agentheim/` and invoke `onChange({ type, path })` for
 * every (debounced) mutation. `path` is project-root-relative and guaranteed
 * inside the root.
 *
 * @param {string} root        Absolute project root (the `.agentheim/` holder).
 * @param {(evt: {type: string, path: string}) => void} onChange
 * @param {{ debounceMs?: number, pollMs?: number, forcePoll?: boolean }} [opts]
 * @returns {{ close: () => void }}
 */
export function watchAgentheim(root, onChange, opts = {}) {
  const absRoot = path.resolve(root);
  const agentheim = path.join(absRoot, '.agentheim');
  const debounceMs = opts.debounceMs ?? 150;
  const pollMs = opts.pollMs ?? 1000;

  let closed = false;
  let debounceTimer = null;
  let lastPath = null;

  // The board is a projection rebuilt from disk (ADR-0001): a single
  // `tree-changed` signal tells the consumer to re-fetch /api/tree, so a burst
  // of mutations (a move = delete+create, an atomic editor save, a folder rename)
  // collapses into ONE debounced event. `path` is a validated pointer at one of
  // the changed paths — a hint, never an interpreted transition (aw-009 owns that).
  function flush() {
    debounceTimer = null;
    if (closed) return;
    const rel = lastPath;
    lastPath = null;
    let safeRel;
    try {
      const resolved = resolveInRoot(absRoot, rel);
      safeRel = path.relative(absRoot, resolved) || '.';
    } catch {
      // A path that escapes the root is never emitted (defence in depth —
      // fs.watch should only ever report paths under the watched dir).
      return;
    }
    onChange({ type: 'tree-changed', path: safeRel.split(path.sep).join('/') });
  }

  /** Queue a changed path (relative to the project root) for the next flush. */
  function queue(relToAgentheim) {
    if (closed) return;
    lastPath = path.join('.agentheim', relToAgentheim || '');
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, debounceMs);
  }

  // ---- Primary: recursive fs.watch -----------------------------------------
  let fsWatcher = null;
  let usePoll = opts.forcePoll === true || !RECURSIVE_SUPPORTED;

  if (!usePoll) {
    try {
      fsWatcher = fs.watch(agentheim, { recursive: true, persistent: true }, (_event, filename) => {
        queue(filename ? String(filename) : '');
      });
      fsWatcher.on('error', () => {
        // Recursive watch can fail at runtime on some platforms / mounts; drop
        // to the poll fallback rather than going silent.
        if (closed) return;
        try { fsWatcher.close(); } catch { /* ignore */ }
        fsWatcher = null;
        startPoll();
      });
    } catch {
      // Recursive watch unsupported here → poll.
      usePoll = true;
    }
  }

  // ---- Fallback: debounced stat-poll ---------------------------------------
  let pollTimer = null;
  let snapshot = null;

  function snapshotTree() {
    const map = new Map();
    const walk = (dir) => {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          walk(full);
        } else {
          try {
            const st = fs.statSync(full);
            map.set(full, `${st.mtimeMs}:${st.size}`);
          } catch {
            /* file vanished mid-walk; ignore */
          }
        }
      }
    };
    walk(agentheim);
    return map;
  }

  function pollOnce() {
    if (closed) return;
    const next = snapshotTree();
    if (snapshot) {
      // Added or modified files.
      for (const [full, sig] of next) {
        if (snapshot.get(full) !== sig) {
          queue(path.relative(agentheim, full));
        }
      }
      // Removed files.
      for (const full of snapshot.keys()) {
        if (!next.has(full)) {
          queue(path.relative(agentheim, full));
        }
      }
    }
    snapshot = next;
  }

  function startPoll() {
    if (closed || pollTimer) return;
    snapshot = snapshotTree();
    pollTimer = setInterval(pollOnce, pollMs);
    if (typeof pollTimer.unref === 'function') pollTimer.unref();
  }

  if (usePoll) startPoll();

  return {
    close() {
      closed = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (pollTimer) clearInterval(pollTimer);
      if (fsWatcher) {
        try { fsWatcher.close(); } catch { /* ignore */ }
      }
    },
  };
}
