/* ============================================================
   Agentheim — dashboard modeling-command string builders (agentic-workflow-016,
   extended by aw-020 and aw-022)

   Pure, framework-free builders for the exact Claude Code command strings the
   board's backlog affordances launch (VS Code bridge, ADR-0018) — and copy to the
   clipboard on the bridge-absent fallback. The board stays a projection of disk
   (ADR-0001) — these add no lifecycle write, only the launch/clipboard
   side-effect; each string is a pure function of the ticket id.

   No React, no htm, no DOM, no clipboard, so they are unit-testable under
   `node --test`, mirroring board-sort.js / board-data.js. The React wiring (the
   cornerAction buttons + the column launch pair) and the window.fetch / clipboard
   side-effects live in board.js / bridge-launch.js as integration glue around this.

   The command text is the FULLY-QUALIFIED `/agentheim:modeling` (confirmed with
   the builder, aw-016), NOT the bare `/modeling` alias, so the launch/paste
   resolves regardless of the builder's alias setup.

   - Backlog COLUMN affordance (aw-020): the bare `/agentheim:modeling`
     (MODELING_COMMAND) and `/agentheim:quick-capture` (QUICK_CAPTURE_COMMAND).
   - Backlog CARD affordance (aw-022): a per-card Refine / Promote pair — an
     EXPLICIT-VERB command per the card's id: `refineCommandFor(id)` →
     `/agentheim:modeling refine <id>` and `promoteCommandFor(id)` →
     `/agentheim:modeling promote <id>`. The verbs are explicit on purpose
     (builder decision, 2026-06-14): they read unambiguously to the `modeling`
     skill's REFINE / PROMOTE routing and stay symmetric, rather than relying on a
     bare-id implicit refine.
   ============================================================ */

// The fully-qualified, bare modeling command — what the backlog add-ticket `+`
// copies, and the prefix every per-card command shares.
export const MODELING_COMMAND = '/agentheim:modeling';

// The fully-qualified quick-capture command (agentic-workflow-020) — the fast
// idea-dump skill, renamed to `/agentheim:quick-capture` in aw-019. The backlog
// add affordance is now TWO launch buttons (Quick Capture / Modeling); this is
// the exact prompt the Quick Capture button hands to the bridge's POST /run (the
// extension wraps it as `claude "<prompt>"`, ADR-0018) and the exact text it
// copies to the clipboard on the bridge-absent fallback path. Bare and
// fully-qualified for the same reason MODELING_COMMAND is — it resolves
// regardless of the builder's alias setup.
export const QUICK_CAPTURE_COMMAND = '/agentheim:quick-capture';

// The fully-qualified, bare WORK command (agentic-workflow-024) — what the board
// prompt bar's right-side action column launches to kick off an EXECUTION run
// against the ready backlog. Unlike Quick Capture / Modeling (authoring actions that
// consume the typed prompt), Work IGNORES the textarea and always launches this bare
// command, so it is a plain constant rather than a `*CommandFor(prompt)` builder.
// Bare and fully-qualified for the same reason MODELING_COMMAND is — it resolves
// regardless of the builder's alias setup (ADR-0018 launch / clipboard fallback).
export const WORK_COMMAND = '/agentheim:work';

// The fully-qualified, bare DASHBOARD-STOP command (agentic-workflow-028) — what the
// main-column topbar's quiet "Stop dashboard" button launches to stop the running
// dashboard server FROM the UI it is already looking at. It REUSES the existing bridge
// launch path (launchOrCopy): the spawned session runs `/dashboard stop` →
// stopDashboard(root) (kill pid + remove runfile, aw-011), so the dashboard server is
// never asked to stop itself — server.mjs stays purely read-only (ADR-0017; the seam
// decision is bridge-reuse, not a new self-stop endpoint). Like WORK_COMMAND it IGNORES
// the prompt-bar textarea, so it is a plain constant rather than a `*CommandFor(prompt)`
// builder. Bare and fully-qualified for the same reason the others are — it resolves
// regardless of the builder's alias setup (ADR-0018 launch / clipboard fallback).
export const STOP_DASHBOARD_COMMAND = '/agentheim:dashboard stop';

/**
 * Trim an id-like value to a safe suffix, or '' for anything that is not a real
 * id. Shared by the explicit-verb card builders so each degrades identically: a
 * missing/empty/whitespace/non-string id yields '' (never `"[object Object]"`,
 * never a throw). A real id is trimmed so a stray-padded projection value can
 * never produce a doubled space.
 */
function safeId(id) {
  return typeof id === 'string' ? id.trim() : '';
}

/**
 * Trim a prompt-like value to a safe, non-empty string, or '' for anything that is
 * not real prompt text. Shared by the board prompt-bar builders (aw-023) so each
 * degrades identically: a missing / empty / whitespace-only / non-string prompt
 * yields '' (never `"[object Object]"`, never a throw). Only the ENDS are trimmed —
 * interior whitespace in the typed prompt is preserved verbatim.
 */
function safePrompt(prompt) {
  return typeof prompt === 'string' ? prompt.trim() : '';
}

/**
 * Build the QUICK CAPTURE command, optionally seeded with the board prompt-bar's
 * typed prompt (aw-023). The relocated column button hands the bridge this exact
 * string (the extension wraps it as `claude "<prompt>"`, ADR-0018) and copies it on
 * the bridge-absent fallback.
 * @param {string} [prompt] — the live textarea contents.
 * @returns {string} `"/agentheim:quick-capture <prompt>"` for a real prompt (one
 *   separating space, trimmed ends), else the bare `QUICK_CAPTURE_COMMAND`
 *   (byte-identical to aw-020). Pure: no DOM, no I/O, never throws.
 */
export function quickCaptureCommandFor(prompt) {
  const trimmed = safePrompt(prompt);
  return trimmed ? `${QUICK_CAPTURE_COMMAND} ${trimmed}` : QUICK_CAPTURE_COMMAND;
}

/**
 * Build the MODELING command, optionally seeded with the board prompt-bar's typed
 * prompt (aw-023). The relocated column button hands the bridge this exact string;
 * the clipboard fallback copies the same.
 * @param {string} [prompt] — the live textarea contents.
 * @returns {string} `"/agentheim:modeling <prompt>"` for a real prompt (one
 *   separating space, trimmed ends), else the bare `MODELING_COMMAND`
 *   (byte-identical to aw-020). Pure: no DOM, no I/O, never throws.
 */
export function modelingCommandFor(prompt) {
  const trimmed = safePrompt(prompt);
  return trimmed ? `${MODELING_COMMAND} ${trimmed}` : MODELING_COMMAND;
}

/**
 * Build the per-card REFINE command — what the backlog card's Refine launch
 * button seeds (aw-022). Refine runs the full Socratic refinement of the ticket.
 * @param {string} [id] — the card's ticket id.
 * @returns {string} `"/agentheim:modeling refine <id>"` for a real id, else the
 *   bare verb command `"/agentheim:modeling refine"` (the skill then asks for a
 *   target rather than the board guessing). Pure: no DOM, no I/O, never throws.
 */
export function refineCommandFor(id) {
  const trimmed = safeId(id);
  const base = `${MODELING_COMMAND} refine`;
  return trimmed ? `${base} ${trimmed}` : base;
}

/**
 * Build the per-card PROMOTE command — what the backlog card's Promote launch
 * button seeds (aw-022). Promote runs the readiness check + the backlog → todo
 * move (so it only ever appears on backlog cards).
 * @param {string} [id] — the card's ticket id.
 * @returns {string} `"/agentheim:modeling promote <id>"` for a real id, else the
 *   bare verb command `"/agentheim:modeling promote"`. Pure: no DOM, no I/O,
 *   never throws.
 */
export function promoteCommandFor(id) {
  const trimmed = safeId(id);
  const base = `${MODELING_COMMAND} promote`;
  return trimmed ? `${base} ${trimmed}` : base;
}
