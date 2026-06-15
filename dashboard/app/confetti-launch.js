// Celebration fire-sequence parameters (agentic-workflow-035 → aw-037 → aw-042).
//
// aw-034 fired ONE canvas-confetti burst from a hardcoded origin. aw-035/aw-037
// turned it into a single AIMED burst (origin = page center, angle derived from the
// prompt-bar textarea's live rect) so the particles converged on the prompt bar.
// aw-042 RETIRES that aim entirely: the celebration is now canvas-confetti's
// canonical "realistic look" demo — a LAYERED MULTI-FIRE burst of five overlaid
// shots with different spreads, velocities, decays and scalars — fired from a
// CENTERED origin with NO angle. There is no longer any textarea geometry, so the
// old confettiLaunchToRect(rect, viewport) aim helper is gone.
//
// confettiFireSequence is a PURE function — parameters only (no DOM, no confetti()
// call), mirroring confetti-palette.js's pure-module pattern so the five-shot
// profile can be unit-tested without a browser. It returns:
//
//   {
//     count,                       // the shared particle budget (200, the demo)
//     defaults: { origin },        // shared per-shot defaults (the centered origin)
//     shots: [ { particleRatio, ...opts }, … ]   // the five overlaid fire() shots
//   }
//
// board.js's fireConfetti walks `shots`, computes each shot's particleCount as
// Math.floor(count * particleRatio), spreads `defaults` + the resolved palette under
// each shot's opts, and issues one confetti() call per shot.
//
// CENTERED origin (aw-042): origin.x = 0.5 (horizontal center of the screen) and the
// demo's origin.y = 0.7 (the bursts rise from just below center — the demo's
// signature look). There is NO angle: the realistic preset is a symmetric upward
// spray, not a directional shot. The exact y is the open aw-025 replay-loop dial.
//
// The five shots are the canvas-confetti "realistic look" demo verbatim, adapted to
// this module's shape:
//   fire(0.25, { spread: 26, startVelocity: 55 });
//   fire(0.2,  { spread: 60 });
//   fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
//   fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
//   fire(0.1,  { spread: 120, startVelocity: 45 });
export function confettiFireSequence() {
  return {
    count: 200,
    defaults: { origin: { x: 0.5, y: 0.7 } },
    shots: [
      { particleRatio: 0.25, spread: 26, startVelocity: 55 },
      { particleRatio: 0.2, spread: 60 },
      { particleRatio: 0.35, spread: 100, decay: 0.91, scalar: 0.8 },
      { particleRatio: 0.1, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 },
      { particleRatio: 0.1, spread: 120, startVelocity: 45 },
    ],
  };
}
