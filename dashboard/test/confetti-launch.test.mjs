// Unit guard for the celebration fire-sequence parameters (agentic-workflow-042).
//
// aw-037 fired a single AIMED burst (origin = page center, angle derived from the
// prompt-bar textarea's live rect). aw-042 retires the aim entirely: the
// celebration is canvas-confetti's "realistic look" demo — a LAYERED MULTI-FIRE
// burst of five overlaid shots — fired from a CENTERED origin with NO angle.
// confettiFireSequence is the PURE source of that profile (no DOM, no confetti()
// call), mirroring confetti-palette.js so the five-shot demo can be locked without a
// browser. board.js walks the returned `shots` and issues one confetti() call per
// shot, spreading `defaults` (the centered origin) + the resolved palette under each.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confettiFireSequence } from '../app/confetti-launch.js';

test('the fire sequence is the demo budget of 200 particles', () => {
  const { count } = confettiFireSequence();
  assert.equal(count, 200);
});

test('the burst fires from a CENTERED origin (x: 0.5, y: 0.7) with NO angle aim', () => {
  const { defaults } = confettiFireSequence();
  assert.deepEqual(defaults.origin, { x: 0.5, y: 0.7 });
  // aw-042 drops aw-037's textarea-aim geometry: no angle anywhere in the defaults.
  assert.ok(!('angle' in defaults), 'the centered preset must carry no angle aim');
});

test('the sequence is exactly the five overlaid shots from the canvas-confetti demo', () => {
  const { shots } = confettiFireSequence();
  assert.equal(shots.length, 5, 'the realistic look is a five-shot layered burst');
  assert.deepEqual(shots, [
    { particleRatio: 0.25, spread: 26, startVelocity: 55 },
    { particleRatio: 0.2, spread: 60 },
    { particleRatio: 0.35, spread: 100, decay: 0.91, scalar: 0.8 },
    { particleRatio: 0.1, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 },
    { particleRatio: 0.1, spread: 120, startVelocity: 45 },
  ]);
});

test('no shot carries an angle (the realistic preset is a symmetric upward spray)', () => {
  const { shots } = confettiFireSequence();
  for (const shot of shots) {
    assert.ok(!('angle' in shot), `shot ${JSON.stringify(shot)} must carry no angle`);
  }
});

test('Math.floor(count * particleRatio) yields the demo per-shot particle counts', () => {
  const { count, shots } = confettiFireSequence();
  const counts = shots.map((s) => Math.floor(count * s.particleRatio));
  assert.deepEqual(counts, [50, 40, 70, 20, 20]);
});
