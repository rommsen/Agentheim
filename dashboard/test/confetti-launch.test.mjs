// Unit guard for the celebration launch geometry (agentic-workflow-035,
// inverted by aw-037).
//
// aw-034 fired the canvas-confetti burst from a HARDCODED origin {x:0.18,y:0.92}
// at a fixed angle 75. aw-035 made the burst read as an explosion OUT OF the
// prompt-bar textarea (origin = textarea-center, aim = viewport-center).
// aw-037 INVERTS that: confettiLaunchToRect pins the origin to the PAGE CENTER
// {0.5,0.5} and derives the launch angle as the vector page-center → TARGET rect
// center (the textarea), so a textarea ABOVE page center makes the burst shoot
// UPWARD into the prompt bar. canvas-confetti's angle is math-style (90° = up),
// so screen-y is inverted in the atan2. This is a PURE function (rect + viewport
// in, geometry out) mirroring confetti-palette.js — the live getBoundingClientRect
// read and the confetti() call stay in board.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confettiLaunchToRect } from '../app/confetti-launch.js';

// A 1000x1000 viewport keeps the normalization arithmetic obvious.
const VIEWPORT = { width: 1000, height: 1000 };

test('origin is always pinned to the page center {0.5,0.5}, regardless of the rect', () => {
  // A 200-wide, 100-tall rect at (300,100): wherever the target sits, the burst
  // starts from the middle of the page.
  const { origin } = confettiLaunchToRect(
    { left: 300, top: 100, width: 200, height: 100 },
    VIEWPORT,
  );
  assert.deepEqual(origin, { x: 0.5, y: 0.5 });
});

test('a textarea centered above page center aims straight up (90°)', () => {
  // Center at x=0.5, y=0.1: directly above the page center → straight up.
  const { angle } = confettiLaunchToRect(
    { left: 450, top: 50, width: 100, height: 100 },
    VIEWPORT,
  );
  assert.equal(Math.round(angle), 90);
});

test('a textarea above and right of page center aims up-and-right (first quadrant)', () => {
  // Center at (0.82, 0.1): above and right of {0.5,0.5} → up and to the right.
  const { angle } = confettiLaunchToRect(
    { left: 770, top: 50, width: 100, height: 100 },
    VIEWPORT,
  );
  assert.ok(angle > 0 && angle < 90, `expected first-quadrant aim, got ${angle}`);
});

test('a textarea above and left of page center aims up-and-left (second quadrant)', () => {
  // Center at (0.18, 0.1): above and left of center → up and to the left.
  const { angle } = confettiLaunchToRect(
    { left: 130, top: 50, width: 100, height: 100 },
    VIEWPORT,
  );
  assert.ok(angle > 90 && angle < 180, `expected second-quadrant aim, got ${angle}`);
});

test('the angle is the atan2 of the page-center→target vector (screen-y inverted)', () => {
  // Target center (0.18, 0.1). dx = 0.18-0.5 = -0.32; dy(math) = -(0.1-0.5) = 0.4.
  const { angle } = confettiLaunchToRect(
    { left: 130, top: 50, width: 100, height: 100 },
    VIEWPORT,
  );
  const expected = Math.atan2(0.4, -0.32) * 180 / Math.PI;
  assert.ok(Math.abs(angle - expected) < 1e-9, `got ${angle}, expected ${expected}`);
});

test('a target below page center aims downward (negative math-y)', () => {
  // Center at x=0.5, y=0.9: below the page center → straight down (-90°). Confirms
  // the inversion is correct for the degenerate below-center case.
  const { angle } = confettiLaunchToRect(
    { left: 450, top: 850, width: 100, height: 100 },
    VIEWPORT,
  );
  assert.equal(Math.round(angle), -90);
});
