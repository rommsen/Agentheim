// Celebration launch geometry (agentic-workflow-035).
//
// aw-034's BoardConfetti fired canvas-confetti from a HARDCODED origin
// {x:0.18,y:0.92} at a fixed angle 75 — an arbitrary lower-left corner. aw-035
// makes the burst read as an explosion OUT OF the prompt bar: it originates at
// the prompt-bar textarea's center and shoots toward the center of the viewport.
//
// confettiLaunchFromRect is a PURE function — geometry only (rect + viewport in,
// canvas-confetti {origin, angle} out), mirroring confetti-palette.js's
// pure-module pattern so it can be unit-tested without a DOM. The LIVE read
// (textarea.getBoundingClientRect() + window.innerWidth/innerHeight) and the
// confetti() call stay in board.js, fed in at FIRE TIME.
//
//   origin = the rect center, normalized to canvas-confetti viewport coords
//            (0..1, top-left): x = (left + width/2)/vw, y = (top + height/2)/vh
//   angle  = the launch direction toward the viewport center {0.5,0.5}.
//            canvas-confetti's angle is math-style (90° = straight up, CCW), and
//            screen-y grows downward, so the vertical component is INVERTED:
//            angle = atan2( -(0.5 - origin.y), (0.5 - origin.x) ) in degrees.
//            (Textarea near the lower middle ⇒ ~straight-up-and-inward.)
export function confettiLaunchFromRect(rect, viewport) {
  const origin = {
    x: (rect.left + rect.width / 2) / viewport.width,
    y: (rect.top + rect.height / 2) / viewport.height,
  };
  const dx = 0.5 - origin.x;
  const dy = -(0.5 - origin.y); // invert screen-y → math-y (90° = up)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return { origin, angle };
}
