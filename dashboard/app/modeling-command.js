/* ============================================================
   Agentheim — dashboard modeling-command string builder (agentic-workflow-016)

   A pure, framework-free builder for the ONE string the board's backlog
   copy-affordance writes to the system clipboard: the Claude Code command the
   builder runs next to REFINE an unrefined ticket. The board stays a projection
   of disk (ADR-0001) — this adds no lifecycle write, only the clipboard
   side-effect; the string itself is a pure function of the ticket id.

   No React, no htm, no DOM, no clipboard, so it is unit-testable under
   `node --test`, mirroring board-sort.js / board-data.js. The React wiring (the
   cornerAction button + the ColumnHeader onAdd handler) and the navigator
   .clipboard.writeText call live in board.js as integration glue around this.

   The command text is the FULLY-QUALIFIED `/agentheim:modeling` (confirmed with
   the builder, aw-016), NOT the bare `/modeling` alias, so the paste resolves
   regardless of the builder's alias setup. A backlog CARD copies it with the
   card's id appended; the backlog column's add-ticket `+` copies it bare.
   ============================================================ */

// The fully-qualified, bare modeling command — what the backlog add-ticket `+`
// copies, and the prefix every per-card command shares.
export const MODELING_COMMAND = '/agentheim:modeling';

/**
 * Build the modeling command to copy for a backlog affordance.
 * @param {string} [id] — the ticket id (card affordance) or omitted (add-button).
 * @returns {string} `"/agentheim:modeling <id>"` for a real id, else the bare
 *   `"/agentheim:modeling"`.
 *
 * Pure: no DOM, no I/O. A missing/empty/whitespace/non-string id degrades to the
 * bare command (the add-button shape) — never `"[object Object]"`, never a throw.
 * A real id is trimmed before appending so a stray-padded projection value can
 * never produce `"/agentheim:modeling  id "`.
 */
export function modelingCommandFor(id) {
  const trimmed = typeof id === 'string' ? id.trim() : '';
  return trimmed ? `${MODELING_COMMAND} ${trimmed}` : MODELING_COMMAND;
}
