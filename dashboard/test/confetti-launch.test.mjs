// Unit guard for the celebration launch geometry (agentic-workflow-035).
//
// aw-034 fired the canvas-confetti burst from a HARDCODED origin {x:0.18,y:0.92}
// at a fixed angle 75. aw-035 makes the burst read as an explosion OUT OF the
// prompt-bar textarea: confettiLaunchFromRect normalizes the textarea's live
// on-screen rect center into canvas-confetti viewport coords and derives the
// launch angle as the vector textarea-center → viewport-center {0.5,0.5}.
// canvas-confetti's angle is math-style (90° = straight up), so screen-y is
// inverted in the atan2. This is a PURE function (rect + viewport in, geometry
// out) mirroring confetti-palette.js — the live getBoundingClientRect read and
// the confetti() call stay in board.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confettiLaunchFromRect } from '../app/confetti-launch.js';

// A 1000x1000 viewport keeps the normalization arithmetic obvious.
const VIEWPORT = { width: 1000, height: 1000 };

test('origin is the rect center normalized to viewport coords', () => {
  // A 200-wide, 100-tall rect at (300,800): center (400, 850) → (0.4, 0.85).
  const { origin } = confettiLaunchFromRect(
    { left: 300, top: 800, width: 200, height: 100 },
    VIEWPORT,
  );
  assert.equal(origin.x, 0.4);
  assert.equal(origin.y, 0.85);
});

test('a textarea low and left of center aims up-and-right, toward the viewport center', () => {
  // Center at (0.18, 0.92): below and left of {0.5,0.5}. The aim vector points
  // up (negative screen-y → positive math-y) and to the right (positive x), so
  // the angle lands in the first quadrant, between 0° and 90°.
  const { angle } = confettiLaunchFromRect(
    { left: 130, top: 870, width: 100, height: 100 },
    VIEWPORT,
  );
  assert.ok(angle > 0 && angle < 90, `expected first-quadrant aim, got ${angle}`);
});

test('a textarea centered low aims straight up (90°)', () => {
  // Center at x=0.5, y=0.9: directly below the viewport center → straight up.
  const { angle } = confettiLaunchFromRect(
    { left: 450, top: 850, width: 100, height: 100 },
    VIEWPORT,
  );
  assert.equal(Math.round(angle), 90);
});

test('a textarea low and right of center aims up-and-left (between 90° and 180°)', () => {
  // Center at (0.82, 0.92): below and right of center → up and to the left.
  const { angle } = confettiLaunchFromRect(
    { left: 770, top: 870, width: 100, height: 100 },
    VIEWPORT,
  );
  assert.ok(angle > 90 && angle < 180, `expected second-quadrant aim, got ${angle}`);
});

test('the angle is the atan2 of the center→viewport-center vector (screen-y inverted)', () => {
  // Center (0.18, 0.92). dx = 0.5-0.18 = 0.32; dy(math) = -(0.5-0.92) = 0.42.
  const { angle } = confettiLaunchFromRect(
    { left: 130, top: 870, width: 100, height: 100 },
    VIEWPORT,
  );
  const expected = Math.atan2(0.42, 0.32) * 180 / Math.PI;
  assert.ok(Math.abs(angle - expected) < 1e-9, `got ${angle}, expected ${expected}`);
});
