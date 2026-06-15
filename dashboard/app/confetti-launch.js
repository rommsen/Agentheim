// Celebration launch geometry (agentic-workflow-035, inverted by aw-037).
//
// aw-034's BoardConfetti fired canvas-confetti from a HARDCODED origin
// {x:0.18,y:0.92} at a fixed angle 75 — an arbitrary lower-left corner. aw-035
// made the burst read as an explosion OUT OF the prompt bar (origin =
// textarea-center, aim = viewport-center). aw-037 INVERTS that reading so the
// confetti CONVERGES ON the prompt bar: it originates at the PAGE CENTER and
// shoots UPWARD toward the prompt-bar textarea's center.
//
// confettiLaunchToRect is a PURE function — geometry only (rect + viewport in,
// canvas-confetti {origin, angle} out), mirroring confetti-palette.js's
// pure-module pattern so it can be unit-tested without a DOM. The LIVE read
// (textarea.getBoundingClientRect() + window.innerWidth/innerHeight) and the
// confetti() call stay in board.js, fed in at FIRE TIME.
//
//   origin = the PAGE CENTER, pinned to canvas-confetti viewport coords {0.5,0.5}.
//   angle  = the launch direction toward the TARGET rect center, where the rect
//            center is normalized to viewport coords (0..1, top-left):
//            tx = (left + width/2)/vw, ty = (top + height/2)/vh.
//            canvas-confetti's angle is math-style (90° = straight up, CCW), and
//            screen-y grows downward, so the vertical component is INVERTED:
//            angle = atan2( -(ty - 0.5), (tx - 0.5) ) in degrees.
//            (Textarea above page center ⇒ ty < 0.5 ⇒ aim points up.)
export function confettiLaunchToRect(rect, viewport) {
  const origin = { x: 0.5, y: 0.5 };
  const tx = (rect.left + rect.width / 2) / viewport.width;
  const ty = (rect.top + rect.height / 2) / viewport.height;
  const dx = tx - 0.5;
  const dy = -(ty - 0.5); // invert screen-y → math-y (90° = up)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return { origin, angle };
}
