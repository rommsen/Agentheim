/* ============================================================
   Agentheim — dashboard slide-over data shaping (agentic-workflow-007)

   The pure, framework-free logic behind the universal detail
   slide-over. The panel itself (slide-over.js) is a thin React
   wrapper around the APPROVED styleguide `Drawer` (imported, never
   forked — ADR-0003). Two responsibilities live here because they
   are pure and therefore unit-testable under `node --test` (no DOM):

     1. docUrl(path)            — build the /api/doc fetch URL.
     2. intentToDrawerItem(...) — turn an open-intent (a board task
        OR any non-task artifact) + the fetched markdown into the
        doc-shaped `item` the styleguide Drawer renders.

   Why a DOC shape, not a ticket shape: the styleguide `describeItem`
   (drawer.js) overrides a TICKET's path to `tickets/<id>.md` and its
   type to "ticket" — fine for the styleguide demo, wrong for the live
   dashboard where each artifact has a REAL in-root path and is fetched
   by it. We hand the Drawer a `doc` item ({ type, meta, body }) so it
   keeps the real path and renders the fetched markdown — UNIFORMLY for
   tasks and every non-task artifact (criterion 3). The body comes from
   /api/doc, client-side (criterion 2); nothing is server-rendered.
   ============================================================ */

// The styleguide content-type registry keys (data.js CONTENT_TYPES). The Drawer
// header pill (TypePill) renders nothing for an unknown type, so an intent must
// resolve to one of these. Kept as a local set so this module stays free of any
// styleguide import (it is pure data shaping, no UI).
const CONTENT_TYPE_KEYS = new Set([
  'ticket', 'context', 'vision', 'map', 'research', 'adr',
]);

/** Build the /api/doc URL for an in-root artifact path (query-encoded). */
export function docUrl(path) {
  return `/api/doc?path=${encodeURIComponent(path ?? '')}`;
}

/**
 * Map an open-intent + the fetched markdown into the styleguide Drawer's
 * doc-shaped `item`.
 *
 * An intent is either a board task (carries `status`, `/api/tree` `type` of
 * feature|bug|chore, and a real `path`) or a non-task artifact (carries an
 * explicit styleguide content `type` and a `path` — emitted by aw-008 nav).
 *
 * @param {object|null} intent — the clicked task/artifact (must carry `path`).
 * @param {string} body — the raw markdown fetched from /api/doc.
 * @returns {{ type, meta, body }|null} a doc item, or null for no intent.
 */
export function intentToDrawerItem(intent, body) {
  if (!intent) return null;
  return {
    // No `status` key on purpose — keeps the Drawer's describeItem on the DOC
    // branch so the REAL path (meta) and fetched markdown (body) are shown.
    type: resolveType(intent),
    meta: intent.path ?? '',
    body: body ?? '',
  };
}

/**
 * Resolve the styleguide content type for an intent. A task (anything with a
 * lifecycle `status`) is a "ticket". An artifact carrying a recognized content
 * type keeps it. Anything else falls back to "ticket" so the header pill always
 * renders (never the null-pill of an unknown type).
 */
function resolveType(intent) {
  if (intent.status) return 'ticket';
  if (intent.type && CONTENT_TYPE_KEYS.has(intent.type)) return intent.type;
  return 'ticket';
}
