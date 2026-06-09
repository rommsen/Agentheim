/* ============================================================
   Agentheim — motion helpers
   Framework-free (no React) so the load-bearing decisions are
   testable under `node --test` without the canvas import map.
   ============================================================ */

/**
 * The ambient "actively working" pulse (design-system-004).
 *
 * Returns the CSS hook class for a card's status rail. The pulse is keyed
 * strictly off `status === "doing"` — NOT the `agent` field: "in the doing
 * column" is the honest signal for actively-worked, since the dashboard reads
 * disk state (which folder a task sits in), not whether a worker process is
 * live this second. Motion (not just the ochre hue) now carries the status
 * signal — see ADR-0014. The animation itself, its ochre-only glow, and the
 * `prefers-reduced-motion` strip-to-plain contract live in the CSS
 * (`styles/agentheim.css` + the `--duration-ambient` token in
 * `styles/colors_and_type.css`); this returns only the class that turns it on.
 *
 * @param {string} status — a ticket status ("backlog" | "todo" | "doing" | "done").
 * @returns {string} the pulse class for doing cards, otherwise "".
 */
export function doingPulseClass(status) {
  return status === "doing" ? "ticket-rail--pulse" : "";
}
