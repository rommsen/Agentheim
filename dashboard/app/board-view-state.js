/* ============================================================
   Agentheim — dashboard board persisted view-state (agentic-workflow-014)

   The single, versioned localStorage store for the board's per-column VIEW
   LENS — grouped/flat, sort choice, and per-(column, BC) collapse state — that
   now SURVIVES a reload.

   This deliberately REVERSES ADR-0009's "in-session view-state only — no
   localStorage" clause and SUPERSEDES agentic-workflow-012's in-session-only
   sort (see the ADR-0009 addendum). The reversal is bounded: this store carries
   PRESENTATION view-state ONLY. It never records lifecycle truth — which task is
   in which column stays a pure projection of disk (/api/tree, ADR-0001/0002),
   re-fetched on every SSE `tree-changed` frame. Persisting how you LOOK at the
   board is not a second source of truth about the board's CONTENT.

   The store is pure over an INJECTED storage backend (the real localStorage, or a
   stub in tests), framework-free, and defensive: any malformed / stale / missing
   blob degrades to "every column defaults" rather than throwing — a blank board
   must never come from a corrupt preference. Unit-tested under `node --test`.
   ============================================================ */

import { DEFAULT_SORT, SORT_OPTIONS } from './board-sort.js';

// The one localStorage key the whole board view-state lives under.
export const VIEW_STATE_KEY = 'agentheim.board.viewState';

// Bump this when the persisted shape changes incompatibly: a blob written by a
// different version is ignored on load (treated as "no stored state"), so an old
// preference can never feed a new board a shape it does not understand.
export const VIEW_STATE_VERSION = 1;

const SORT_VALUES = new Set(SORT_OPTIONS.map((o) => o.value));

/**
 * The state a column with NO stored preference falls back to: flat (not grouped),
 * the default sort, and every section expanded. A brand-new bounded context, or a
 * fresh column, lands here.
 */
export function defaultColumnState() {
  return { grouped: false, sort: DEFAULT_SORT, collapsed: [] };
}

// Coerce one stored (untrusted) column blob into a well-formed column state.
// grouped → boolean; sort → a known sort value or the default; collapsed → an
// array of strings. Never NaN, never undefined, never a throw.
function normalizeColumn(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const sort = SORT_VALUES.has(r.sort) ? r.sort : DEFAULT_SORT;
  const collapsed = Array.isArray(r.collapsed)
    ? r.collapsed.filter((bc) => typeof bc === 'string')
    : [];
  return { grouped: !!r.grouped, sort, collapsed };
}

/**
 * Read the persisted per-column view-state from the injected storage.
 * @param {{ getItem: (k: string) => (string|null) }} [storage] — the storage backend.
 * @returns {Object<string, { grouped, sort, collapsed }>} a map of column → state.
 *
 * Returns `{}` (so every column defaults) when there is no backend, no stored
 * blob, a stale version, or malformed JSON. Each stored column is normalized, so
 * a partially-corrupt blob still yields a safe shape. Never throws.
 */
export function loadViewState(storage) {
  if (!storage || typeof storage.getItem !== 'function') return {};
  let raw;
  try {
    raw = storage.getItem(VIEW_STATE_KEY);
  } catch {
    return {}; // storage access can throw (e.g. disabled / private mode).
  }
  if (raw == null) return {};

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {}; // a corrupt blob must never crash the board.
  }
  if (!parsed || typeof parsed !== 'object') return {};
  if (parsed.version !== VIEW_STATE_VERSION) return {}; // a different shape — ignore.

  const columns = parsed.columns && typeof parsed.columns === 'object' ? parsed.columns : {};
  const out = {};
  for (const [col, colRaw] of Object.entries(columns)) {
    out[col] = normalizeColumn(colRaw);
  }
  return out;
}

/**
 * Persist the per-column view-state under the versioned envelope.
 * @param {{ setItem: (k: string, v: string) => void } | null | undefined} storage
 * @param {Object<string, { grouped, sort, collapsed }>} state — column → state map.
 *
 * A no-op when there is no backend (e.g. SSR / no DOM). Storage write failures
 * (quota, disabled) are swallowed — a failed PREFERENCE write must never surface
 * as a board error. Never throws.
 */
export function saveViewState(storage, state) {
  if (!storage || typeof storage.setItem !== 'function') return;
  const columns = {};
  for (const [col, colState] of Object.entries(state || {})) {
    columns[col] = normalizeColumn(colState);
  }
  try {
    storage.setItem(VIEW_STATE_KEY, JSON.stringify({ version: VIEW_STATE_VERSION, columns }));
  } catch {
    /* preference persistence is best-effort; never throw. */
  }
}
