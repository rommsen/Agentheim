// Celebration palette resolver (agentic-workflow-034).
//
// The board celebration (BoardConfetti) is rendered by canvas-confetti, which draws
// on a JS <canvas> and CANNOT consume `var(--st-done)` the way the old CSS-keyframe
// burst did — it needs concrete color strings. We resolve the FOUR status-palette
// bases at FIRE TIME off the document root, so the burst tracks the active
// light/dark theme automatically (the tokens differ per theme) and stays a true
// PROJECTION of the styleguide tokens (ADR-0003) rather than a forked hard-coded
// list.
//
// The palette is exactly the four STATUS bases. It deliberately drops the old
// muted --fg-3 grey and adds the warm --st-doing amber for a livelier spread. It
// draws NEITHER the reserved selection accent --accent-ochre-soft (ADR-0016) NOR
// the --obligation skip-permissions danger hue (aw-021) — both are excluded by
// construction (neither is a status base).
export const CONFETTI_TOKENS = ['--st-done', '--st-todo', '--st-doing', '--st-backlog'];

// Resolve each token to its current concrete value off a CSSStyleDeclaration-like
// object (in the browser: getComputedStyle(document.documentElement)). Values are
// trimmed; tokens that resolve empty are dropped (defensive — never invent a color).
export function resolveConfettiColors(rootStyle) {
  return CONFETTI_TOKENS
    .map((token) => (rootStyle.getPropertyValue(token) || '').trim())
    .filter((value) => value.length > 0);
}
