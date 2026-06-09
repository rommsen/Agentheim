/* ============================================================
   Agentheim — ticket-card helpers
   Framework-free (no React) so the load-bearing decisions are
   testable under `node --test` without the canvas import map.
   ============================================================ */

// The em-dash placeholder the dashboard board-data feeds when the read
// projection carries no estimate (ADR-0002: pointers/metadata only). Treated as
// "no estimate" — it must never render as a "— pt" chip.
const EST_PLACEHOLDER = "—";

/**
 * Whether the `… pt` estimate chip should render for a given estimate value
 * (design-system-006).
 *
 * The /api/tree read projection carries no estimate, so every dashboard card was
 * being fed the `'—'` placeholder and showing a meaningless "— pt" chip — dead
 * space on every card. The chip now renders ONLY when there is a real estimate:
 * an absent / empty / whitespace / em-dash value hides it. A value the author
 * deliberately set (including an explicit `'?'`) still shows.
 *
 * Pure and React-free so the decision is testable without the canvas import map,
 * mirroring `doingPulseClass` (motion.js / ADR-0014).
 *
 * @param {string|null|undefined} est — the ticket's estimate field.
 * @returns {boolean} true when a real estimate should be shown.
 */
export function showEstimate(est) {
  if (est == null) return false;
  const trimmed = String(est).trim();
  return trimmed !== "" && trimmed !== EST_PLACEHOLDER;
}
