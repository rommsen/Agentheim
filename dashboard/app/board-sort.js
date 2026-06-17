/* ============================================================
   Agentheim — dashboard board sort comparator (agentic-workflow-012)

   A pure, framework-free reordering of already-projected board tickets.
   Each lifecycle column on the dashboard board (board.js) holds its own
   independent sort choice in React view-state; this module turns that choice
   into a deterministic ordering OVER the list board-data.treeToColumns already
   produced. It runs AFTER the projection — it never mutates the transform, the
   read model (/api/tree), or disk (ADR-0002 / ADR-0001). No React, no htm, no
   DOM, so it is unit-testable under `node --test`, mirroring board-data.js.

   The default ordering is `mtime-desc`: the cards that were just touched (the
   ones the builder cares about — the validated Why) sit at the top of every
   column. The file modification time it reads, `mtimeMs`, is carried into the
   ticket by the /api/tree projection (aw-013); a ticket whose mtime is
   absent/null degrades GRACEFULLY — it is treated as the oldest, never NaN,
   never a throw.
   ============================================================ */

// The orderings the per-column control offers, in control order. "Name" = the
// task `title`. Each carries a human label for the board-side <select>.
export const SORT_OPTIONS = [
  { value: 'mtime-desc', label: 'Recently modified' },
  { value: 'mtime-asc', label: 'Least recently modified' },
  { value: 'title-asc', label: 'Name A→Z' },
  { value: 'title-desc', label: 'Name Z→A' },
];

// Per-column default: modification date descending — surfaces recently-touched
// work at the top. The board resets to this on every load (no client
// persistence, pure in-session view-state).
export const DEFAULT_SORT = 'mtime-desc';

const SORT_VALUES = new Set(SORT_OPTIONS.map((o) => o.value));

// A defined, comparable mtime: a finite number, or -Infinity for absent/null/
// non-numeric so undated tickets sort as the OLDEST (never NaN). Keeping this in
// one place means every ordering degrades identically.
function mtimeOf(ticket) {
  const m = ticket && ticket.mtimeMs;
  return typeof m === 'number' && Number.isFinite(m) ? m : -Infinity;
}

// A defined id for the deterministic tie-break (always a string; ascending).
function idOf(ticket) {
  return ticket && typeof ticket.id === 'string' ? ticket.id : '';
}

// A defined title for name ordering (always a string; never NaN/throw for a
// missing or non-string title — it degrades to "").
function titleKey(ticket) {
  return ticket && typeof ticket.title === 'string' ? ticket.title : '';
}

// Locale-aware alphabetical collation for the Name orderings (agentic-workflow-061).
// Code-point comparison (`<`/`>`) is NOT "what a human calls alphabetical": it
// sorts leading digits oddly ("10" before "2"), leading symbols before letters,
// and accented/umlaut letters AFTER "z". A shared Intl.Collator on the host
// default locale fixes all three:
//   sensitivity:'base' — ignore case AND accents for ordering (à ≈ a ≈ A),
//   numeric:true        — read digit runs as numbers (2 before 10).
const titleCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

// Collate two tickets' titles alphabetically (ascending). title-desc negates this.
function byTitleCollated(a, b) {
  return titleCollator.compare(titleKey(a), titleKey(b));
}

function byIdAsc(a, b) {
  const ia = idOf(a);
  const ib = idOf(b);
  return ia < ib ? -1 : ia > ib ? 1 : 0;
}

// The four comparators. Every primary tie (equal title, equal mtime, AND the
// undated/undated case) falls through to id ASCending — a single, predictable
// tie-break direction, never mirrored by the primary direction.
const COMPARATORS = {
  'mtime-desc': (a, b) => (mtimeOf(b) - mtimeOf(a)) || byIdAsc(a, b),
  'mtime-asc': (a, b) => (mtimeOf(a) - mtimeOf(b)) || byIdAsc(a, b),
  'title-asc': (a, b) => byTitleCollated(a, b) || byIdAsc(a, b),
  'title-desc': (a, b) => -byTitleCollated(a, b) || byIdAsc(a, b),
};

/**
 * Reorder a list of already-projected tickets by the chosen ordering.
 * @param {Array<object>} list — TicketCard-shaped objects (from treeToColumns).
 * @param {string} [sortKey] — one of SORT_OPTIONS' values; unknown/missing → DEFAULT_SORT.
 * @returns {Array<object>} a NEW array, sorted. The input is never mutated.
 *
 * Pure: no DOM, no I/O. Degrades to `[]` for a null/non-array input and to the
 * default ordering for an unknown key — never NaN, never a throw. `mtime-desc`
 * (the default) surfaces recently-touched cards at the top of the column.
 */
export function sortTickets(list, sortKey) {
  if (!Array.isArray(list)) return [];
  const key = SORT_VALUES.has(sortKey) ? sortKey : DEFAULT_SORT;
  const cmp = COMPARATORS[key];
  // Copy first — Array.prototype.sort mutates in place; the board's projected
  // column array must stay untouched (it is React state).
  return list.slice().sort(cmp);
}
