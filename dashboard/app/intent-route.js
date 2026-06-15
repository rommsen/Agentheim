/* ============================================================
   Agentheim — dashboard open-intent router (agentic-workflow-027)

   The pure, framework-free discriminator behind the open-intent
   SPLIT. Through aw-026 a SINGLE open-intent sink sent every clicked
   artifact — board tasks AND non-task documents — into one right-hand
   slide-over (ADR-0010). aw-027 reverses that: a board TASK keeps the
   slide-over (a transient detail panel beside the board); a non-task
   DOCUMENT (a rail/library row — vision, context map, BC README, ADR,
   research) renders in the MAIN content pane instead.

   The discriminator is artifact KIND, and it already exists in the
   intent shape — no new field is needed:
     - a board-task intent carries a lifecycle `status`
       (backlog | todo | doing | done; from /api/tree, board-data.js);
     - a rail/library intent carries a styleguide content `type`
       (vision | map | context | adr | research; library-data.js) and
       NO `status`.
   So the fork is exactly "has `status` → task → slide-over; else →
   non-task document → main pane". This mirrors slide-over-data.js's
   resolveType, which already keys "ticket" off `status`.

   Kept in its own module (no React, no htm) so it is unit-testable
   under `node --test` without a DOM, the same idiom as slide-over-data
   / library-data. The styleguide stays the single source of UI truth
   (ADR-0003); this is pure routing logic, not UI.
   ============================================================ */

/**
 * Is this open-intent a board TASK (→ slide-over), as opposed to a non-task
 * DOCUMENT (→ main pane)?
 *
 * A task carries a truthy lifecycle `status`; a non-task document does not.
 * A null/absent intent is not a task (there is nothing to route).
 *
 * @param {object|null|undefined} intent — the clicked task/artifact open-intent.
 * @returns {boolean} true for a task intent, false for a non-task document.
 */
export function isTaskIntent(intent) {
  return Boolean(intent && intent.status);
}
