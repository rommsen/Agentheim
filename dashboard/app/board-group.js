/* ============================================================
   Agentheim — dashboard board grouping transform (agentic-workflow-014)

   A pure, framework-free partition of already-projected, already-SORTED board
   tickets into per-bounded-context sections. It is the THIRD stage of the board
   render pipeline — project (board-data.treeToColumns) → sort (board-sort.sortTickets)
   → group (here) — and consumes the sorted list as-is. It NEVER re-orders cards
   beyond partitioning them, so the column's sort semantics (name / mod-date, id
   tie-break, null-mtime-oldest) are preserved INSIDE every section.

   Grouping is an optional, per-column VIEW LENS over the same read model, exactly
   as column-sort (aw-012) is. The board stays a pure projection of disk; this
   reshapes presentation only. No React, no htm, no DOM, so it is unit-testable
   under `node --test`, mirroring board-sort.js / board-data.js. It never mutates
   the transform output, the read model (/api/tree), or disk (ADR-0002 / ADR-0001).
   ============================================================ */

// The label a card with no bounded context is grouped under. The /api/tree
// projection normalizes an absent context to '' (board-data.treeTicket); rather
// than render an empty header, those cards share one defined, legible section.
// It sorts FIRST under ascending BC-name order (the parenthesis sorts before any
// lowercase letter), keeping the ordering deterministic and never undefined.
export const NO_CONTEXT_LABEL = '(no context)';

// The bc key carried by the single section when a column is FLAT (grouping off).
// A defined sentinel — never undefined — so the board can branch on it cleanly.
const FLAT_BC = null;

function bcOf(ticket) {
  const c = ticket && typeof ticket.context === 'string' ? ticket.context : '';
  return c === '' ? NO_CONTEXT_LABEL : c;
}

// Normalize the `collapsed` option (array OR Set OR undefined) into a membership
// test that never throws. A column with no stored collapse state → nothing
// collapsed (all sections expanded), the brand-new-BC default.
function collapsedSet(collapsed) {
  if (collapsed instanceof Set) return collapsed;
  if (Array.isArray(collapsed)) return new Set(collapsed);
  return new Set();
}

/**
 * Partition a list of already-sorted tickets into board sections.
 *
 * @param {Array<object>} sorted — TicketCard-shaped objects, ALREADY sorted by
 *        board-sort.sortTickets (grouping consumes, never re-sorts).
 * @param {object} [opts]
 * @param {boolean} [opts.grouped=false] — false → one flat section; true → per-BC sections.
 * @param {Array<string>|Set<string>} [opts.collapsed] — BC names collapsed in this column.
 * @returns {Array<{ bc, grouped, count, collapsed, tickets }>}
 *
 * FLAT (grouped off): a single section `{ bc: null, grouped: false, ... }` holding
 * the whole list in its incoming order — the board renders it exactly as before.
 *
 * GROUPED: one section per BC that HAS cards (a BC with zero cards in this column
 * renders no section — no empty headers), ordered by BC name ASCending. Each
 * section carries its `count`, a `collapsed` flag (the count is retained when
 * collapsed; the UI hides the cards), and the cards in their incoming sorted order.
 *
 * Pure: no DOM, no I/O, input never mutated. Degrades to `[]` for a null/non-array
 * input and to flat for a missing options object — never NaN, never a throw.
 */
export function groupTickets(sorted, opts) {
  if (!Array.isArray(sorted)) return [];
  const grouped = !!(opts && opts.grouped);

  if (!grouped) {
    return [{ bc: FLAT_BC, grouped: false, count: sorted.length, collapsed: false, tickets: sorted.slice() }];
  }

  const collapsed = collapsedSet(opts && opts.collapsed);

  // Partition while PRESERVING the incoming (sorted) order within each BC: a Map
  // built by iterating `sorted` once keeps each bucket in first-seen card order,
  // which — because `sorted` is already ordered — is the column's sort order.
  const buckets = new Map();
  for (const ticket of sorted) {
    const bc = bcOf(ticket);
    let bucket = buckets.get(bc);
    if (!bucket) {
      bucket = [];
      buckets.set(bc, bucket);
    }
    bucket.push(ticket);
  }

  // Sections ordered by BC name ascending — stable, legible, deterministic.
  return [...buckets.keys()]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((bc) => ({
      bc,
      grouped: true,
      count: buckets.get(bc).length,
      collapsed: collapsed.has(bc),
      tickets: buckets.get(bc),
    }));
}
