/* ============================================================
   Agentheim — dashboard global-search FLAT → GROUPED transform
   (agentic-workflow-052)

   The pure, framework-free bridge between aw-050's GET /api/search
   (ADR-0023) and the approved styleguide SearchField combobox
   (design-system-016). The endpoint returns a FLAT, already-ranked
   list of matches — `results: [{ category, title, excerpt, path,
   ...intent }]`, title-hits-first then by fixed category order —
   and SearchField wants `groups: [{ label, items }]`. This buckets
   the flat list into the four fixed-order category groups,
   PRESERVING the within-category order the endpoint ranked (so the
   title-hits-first ranking survives inside each group).

   The fixed group order mirrors aw-050/ADR-0023's CATEGORY_ORDER and
   the library nav grouping (aw-008, library-data.js): Bounded
   contexts → Decisions → Research → Tickets.

   Empty groups are PASSED THROUGH unfiltered — ds-016's SearchField
   renders no header for a zero-row group, so the consumer needn't
   filter. Each item is the full result row UNCHANGED so it still
   carries the `...intent` fields the shell routes on (ADR-0021):
   ds-016's getTitle/getExcerpt defaults read item.title/item.excerpt
   directly, so no reshaping board-side.

   Loss-tolerant (the tree.mjs / library-data idiom): a malformed or
   empty result set yields all-empty groups, never a throw; individual
   malformed rows (null, non-object, unknown category) are skipped. No
   React, no htm — unit-testable under `node --test` without a DOM.
   ============================================================ */

// The four result groups, in display order. Mirrors aw-050's CATEGORY_ORDER
// (search.mjs / ADR-0023) and the library nav grouping (library-data.js).
export const GROUP_ORDER = ['Bounded contexts', 'Decisions', 'Research', 'Tickets'];

/**
 * Bucket aw-050's flat ranked `results` into ds-016's `groups: [{label, items}]`
 * in fixed category order, preserving the within-category order as received.
 *
 * @param {Array<{category: string, title: string, excerpt: string, path: string}>} results
 *   — the flat ranked match list from GET /api/search (each row carries the
 *   open-intent fields the shell routes on; opaque to this transform).
 * @returns {Array<{label: string, items: object[]}>} the four groups in fixed
 *   order. Empty groups are kept (ds-016 renders no header for a zero-row group).
 *   A malformed/empty input yields all-empty groups; malformed rows are skipped.
 */
export function searchResultsToGroups(results) {
  const buckets = new Map(GROUP_ORDER.map((label) => [label, []]));
  if (Array.isArray(results)) {
    for (const row of results) {
      if (!row || typeof row !== 'object') continue;
      const bucket = buckets.get(row.category);
      if (!bucket) continue; // unknown / missing category → dropped, never thrown on
      bucket.push(row);
    }
  }
  return GROUP_ORDER.map((label) => ({ label, items: buckets.get(label) }));
}
