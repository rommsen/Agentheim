// applyTaskMove — the single Task-lifecycle mover (ADR-0001, ADR-0007, ADR-0017).
//
// This is agentic-workflow DOMAIN logic. It is the canonical writer of
// task-lifecycle state, owned by and used by the skills (`modeling` / `work`).
// The dashboard does NOT call it: as of ADR-0017 the dashboard is read-only and
// has no write path, so skills are the sole owners of lifecycle transitions. The
// `ui` policy below is retained as a generic restricted (Promote-only) move set —
// it models a legal-move subset and is no longer wired to any caller.
//
// It (1) validates `from→to` against the legal-move policy incl. `depends_on`
// guards, (2) enforces *status matches folder* — folder rename AND frontmatter
// `status` rewrite together, never one without the other, (3) performs the move,
// and (4) returns success-with-new-state OR a structured rejection carrying a
// domain reason. An optimistic precondition (expected `from` folder + the file's
// mtime) is honored: if disk disagrees it rejects WITHOUT mutating anything.
//
// Scope boundary (ADR-0007): this operation owns ONLY the task-file move + status
// rewrite + precondition. INDEX/protocol side-effects stay with the skills /
// orchestrator; a dashboard-performed promote does NOT touch indexes in v1.
//
// Node stdlib only (node:fs, node:path) — zero dependencies, matching the
// dashboard runtime's constraint.

import { existsSync, statSync, renameSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** The four lifecycle folders, in forward order. */
export const LIFECYCLE_FOLDERS = ['backlog', 'todo', 'doing', 'done'];

/**
 * Legal move sets, keyed by policy.
 * - `ui`    — a restricted Promote-only set (`backlog→todo`). Originally the
 *             dashboard's drag surface; the dashboard write path was removed in
 *             ADR-0017, so this set is now wired to no caller and kept only as the
 *             generic restricted policy (and the default).
 * - `skill` — the fuller set the skills drive: forward steps only
 *             (Promote, Claim, Complete). Backward moves and skips remain illegal.
 */
const LEGAL_MOVES = {
  ui: new Set(['backlog->todo']),
  skill: new Set(['backlog->todo', 'todo->doing', 'doing->done']),
};

function reject(code, reason) {
  return { ok: false, code, reason };
}

/** The absolute path of a lifecycle folder for a context. */
function folderDir(rootDir, context, folder) {
  return path.join(rootDir, '.agentheim', 'contexts', context, folder);
}

/**
 * Resolve the actual task file for `id` inside one lifecycle folder, or null if
 * absent. Task files on disk follow the convention `<id>-<slug>.md` (e.g.
 * `agentic-workflow-009-dashboard-live-update.md`) while the id in frontmatter /
 * the read projection is the bare `<id>` (`agentic-workflow-009`). The skills'
 * worker and the dashboard both address a task by its bare id, so the mover must
 * map id → file. It matches either the exact `<id>.md` OR `<id>-<slug>.md`,
 * anchored so a bare `alpha-001` never collides with `alpha-0010` (ADR-0012).
 * If more than one file matches (a malformed project), the exact `<id>.md` wins,
 * else the first sorted match — deterministic, never ambiguous at runtime.
 */
function resolveTaskFile(rootDir, context, folder, id) {
  const dir = folderDir(rootDir, context, folder);
  const exact = path.join(dir, `${id}.md`);
  if (existsSync(exact)) return exact;
  if (!existsSync(dir)) return null;
  let names;
  try {
    names = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort();
  } catch {
    return null;
  }
  const match = names.find((name) => name === `${id}.md` || name.startsWith(`${id}-`) && name.toLowerCase().endsWith('.md'));
  return match ? path.join(dir, match) : null;
}

/** Parse `depends_on: [a, b]` out of YAML frontmatter. Returns a string[]. */
function parseDependsOn(content) {
  const m = content.match(/^depends_on:\s*\[([^\]]*)\]\s*$/m);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * A dependency is satisfied iff a file `<depId>.md` exists in some BC's `done/`
 * folder. We scan every `contexts/<bc>/done/` because a dependency may live in
 * another bounded context (e.g. the design-system styleguide gating a frontend
 * task in agentic-workflow).
 */
function dependencySatisfied(rootDir, depId) {
  const contextsDir = path.join(rootDir, '.agentheim', 'contexts');
  if (!existsSync(contextsDir)) return false;
  // depId may already encode its BC, but we don't rely on that — just look in
  // every done/ folder.
  let entries;
  try {
    entries = statSync(contextsDir).isDirectory()
      ? readdirNamesSync(contextsDir)
      : [];
  } catch {
    return false;
  }
  for (const bc of entries) {
    // Task files follow the `<id>-<slug>.md` convention (the slug rides along
    // with the id), so an exact `<depId>.md` rarely exists. Match the same way
    // resolveTaskFile does: exact id, or `<depId>-…` (trailing hyphen guards
    // against prefix collisions like `design-system-001` vs `…-0015`).
    if (resolveTaskFile(rootDir, bc, 'done', depId)) return true;
  }
  return false;
}

function readdirNamesSync(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/**
 * Move a task between lifecycle folders, enforcing the Task aggregate invariants.
 *
 * @param {string} rootDir  Absolute project root (the folder holding `.agentheim/`).
 *                          Passed explicitly — no ambient cwd — so a skill context
 *                          and the dashboard runtime call it identically.
 * @param {string} id       Task id, e.g. `agentic-workflow-003`.
 * @param {string} from     Folder the caller believes the task is in (the optimistic
 *                          precondition's source).
 * @param {string} to       Target folder.
 * @param {object} [options]
 * @param {string} [options.context]        Bounded-context name. Defaults to the
 *                                          `<bc>` prefix parsed from `id`.
 * @param {'ui'|'skill'} [options.policy]   Legal-move set to enforce. Default `ui`
 *                                          (the dashboard's Promote-only surface).
 * @param {number} [options.expectedMtimeMs] Optimistic mtime precondition; if the
 *                                          file's current mtime differs, reject.
 * @returns {{ok:true,state:{id,from,to,status,path,mtimeMs}}|{ok:false,code:string,reason:string}}
 */
export function applyTaskMove(rootDir, id, from, to, options = {}) {
  const context = options.context ?? deriveContext(id);
  const policy = options.policy ?? 'ui';

  // --- 1. Shape validation ------------------------------------------------
  if (!LIFECYCLE_FOLDERS.includes(from) || !LIFECYCLE_FOLDERS.includes(to)) {
    return reject(
      'illegal-move',
      `Unknown lifecycle folder in ${from}->${to}; valid folders are ${LIFECYCLE_FOLDERS.join(', ')}.`
    );
  }

  // --- 2. Legal-move policy ----------------------------------------------
  const legal = LEGAL_MOVES[policy] ?? LEGAL_MOVES.ui;
  if (!legal.has(`${from}->${to}`)) {
    return reject(
      'illegal-move',
      `${from}->${to} is not a legal ${policy} move. Legal ${policy} moves: ${[...legal].join(', ')}.`
    );
  }

  // --- 3. Optimistic precondition: file is actually in `from` -------------
  const fromPath = resolveTaskFile(rootDir, context, from, id);
  if (!fromPath) {
    // Distinguish "moved elsewhere" (stale view) from "never existed" (not-found).
    const elsewhere = LIFECYCLE_FOLDERS.some(
      (f) => f !== from && resolveTaskFile(rootDir, context, f, id) !== null
    );
    if (elsewhere) {
      return reject(
        'stale-precondition',
        `Task ${id} is not in ${from} — it appears to have already moved. Refetch the board.`
      );
    }
    return reject('not-found', `Task ${id} was not found in context ${context}.`);
  }

  // --- 4. Optimistic precondition: mtime guard ----------------------------
  const stat = statSync(fromPath);
  if (
    options.expectedMtimeMs !== undefined &&
    options.expectedMtimeMs !== null &&
    !mtimeMatches(stat.mtimeMs, options.expectedMtimeMs)
  ) {
    return reject(
      'stale-precondition',
      `Task ${id} was modified since it was read (mtime changed) — it may have already moved. Refetch the board.`
    );
  }

  // --- 5. depends_on guard (frontend gate) --------------------------------
  const content = readFileSync(fromPath, 'utf8');
  if (to === 'todo') {
    // Promote: no unmet dependency may exist. A frontend task cannot promote
    // ahead of e.g. the styleguide.
    const deps = parseDependsOn(content);
    const unmet = deps.filter((dep) => !dependencySatisfied(rootDir, dep));
    if (unmet.length > 0) {
      return reject(
        'blocked-dependency',
        `Task ${id} cannot be promoted: unmet depends_on [${unmet.join(', ')}] (the dependency is not yet in a done/ folder).`
      );
    }
  }

  // --- 6. Perform the move: status rewrite + folder rename, together -------
  // Rewrite frontmatter `status` to match the destination folder BEFORE the
  // rename, then rename. If the rename throws, the in-memory rewrite is
  // discarded (we never wrote it to the old path), so no partial move escapes.
  const rewritten = rewriteStatus(content, to);
  // Preserve the on-disk filename (the `<id>-<slug>.md` convention) across the
  // move — only the folder changes. The id is stable; the slug rides along.
  const toPath = path.join(folderDir(rootDir, context, to), path.basename(fromPath));

  // Write the status-rewritten body to the source path, then rename. Writing to
  // source first (not dest) keeps a single canonical file at all times; the
  // rename is the atomic publish of the new state.
  writeFileSync(fromPath, rewritten);
  renameSync(fromPath, toPath);

  return {
    ok: true,
    state: {
      id,
      from,
      to,
      status: to,
      path: toPath,
      mtimeMs: statSync(toPath).mtimeMs,
    },
  };
}

/**
 * Derive the `<bc>` from a bare task id, for BOTH id shapes (ADR-0028 §4):
 *   - legacy sequential: `<bc>-NNN` (all-digit tail, e.g. `agentic-workflow-077`)
 *   - new random token:  `<bc>-<token>` where token leads with a letter and is
 *     5 chars over Crockford base32 minus the look-alikes `i l o u`
 *     (`[a-hjkmnp-tv-z][0-9a-hjkmnp-tv-z]{4}`, e.g. `agentic-workflow-k3f9q`).
 *
 * The match is END-ANCHORED on the bare id (deriveContext's only caller,
 * `applyTaskMove`, always passes the bare id, never the slugged filename), so a
 * slug is never in scope and `m[1]` is the BC. The two tails are disjoint: a
 * digit-leading tail is never a new token, a letter-leading tail is never legacy.
 * Anything matching NEITHER shape (a malformed leading-digit "token" such as
 * `agentic-workflow-3f9qx`, or an id with no recognizable tail) falls through to
 * the `m ? m[1] : id` fallback and returns the id unchanged — never undefined.
 */
export function deriveContext(id) {
  const m = String(id).match(/^(.*)-(?:\d+|[a-hjkmnp-tv-z][0-9a-hjkmnp-tv-z]{4})$/);
  return m ? m[1] : id;
}

/** Rewrite the frontmatter `status:` line to `status: <folder>`. */
function rewriteStatus(content, folder) {
  if (/^status:.*$/m.test(content)) {
    return content.replace(/^status:.*$/m, `status: ${folder}`);
  }
  // No status line present — defensively inject one after the opening `---`.
  return content.replace(/^---\n/, `---\nstatus: ${folder}\n`);
}

/**
 * mtime comparison tolerant of float/precision drift across filesystems. Treat
 * values within 1ms as equal.
 */
function mtimeMatches(actual, expected) {
  return Math.abs(Number(actual) - Number(expected)) < 1;
}
