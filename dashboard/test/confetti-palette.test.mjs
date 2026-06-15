// Unit guard for the celebration palette resolver (agentic-workflow-034).
//
// aw-034 swaps the board's celebration from a CSS-keyframe burst to canvas-confetti.
// canvas-confetti draws on a JS <canvas> and cannot consume `var(--st-done)` — it
// needs concrete color strings. resolveConfettiColors reads the FOUR status-palette
// bases (--st-done / --st-todo / --st-doing / --st-backlog) at fire time off the
// document root, so the burst tracks the active light/dark theme (ADR-0003: a true
// projection of the styleguide tokens, not a forked copy). It must draw NEITHER the
// reserved selection accent --accent-ochre-soft (ADR-0016) NOR the --obligation
// skip-permissions danger hue (aw-021), and no longer the old --fg-3 grey.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFETTI_TOKENS, resolveConfettiColors } from '../app/confetti-palette.js';

// A stand-in for getComputedStyle(document.documentElement): maps each token name
// to a resolved hex (as the browser would per the active theme).
function fakeRoot(map) {
  return {
    getPropertyValue: (name) => (name in map ? map[name] : ''),
  };
}

test('the palette is exactly the four status-palette bases', () => {
  assert.deepEqual(
    CONFETTI_TOKENS,
    ['--st-done', '--st-todo', '--st-doing', '--st-backlog'],
  );
});

test('the palette excludes the reserved accent, the obligation hue, and the old --fg-3 grey', () => {
  assert.equal(CONFETTI_TOKENS.includes('--accent-ochre-soft'), false, 'no reserved selection accent (ADR-0016)');
  assert.equal(CONFETTI_TOKENS.includes('--obligation'), false, 'no --obligation skip-permissions hue (aw-021)');
  assert.equal(CONFETTI_TOKENS.includes('--fg-3'), false, 'the old --fg-3 grey is dropped');
});

test('resolveConfettiColors reads each token off the root and trims the value', () => {
  const colors = resolveConfettiColors(fakeRoot({
    '--st-done': ' #4F7D5B ',
    '--st-todo': '#5B7DA8',
    '--st-doing': '  #E0A95C',
    '--st-backlog': '#8A8F98 ',
  }));
  assert.deepEqual(colors, ['#4F7D5B', '#5B7DA8', '#E0A95C', '#8A8F98']);
});

test('resolveConfettiColors tracks the theme: different root values yield different colors', () => {
  const light = resolveConfettiColors(fakeRoot({
    '--st-done': '#3F6B4A', '--st-todo': '#3F5F8A', '--st-doing': '#B07A2A', '--st-backlog': '#6B7079',
  }));
  const dark = resolveConfettiColors(fakeRoot({
    '--st-done': '#7FB58C', '--st-todo': '#8FB1DC', '--st-doing': '#E0A95C', '--st-backlog': '#9AA0AA',
  }));
  assert.notDeepEqual(light, dark, 'resolving at fire time picks up the active theme tokens');
});

test('resolveConfettiColors drops tokens that resolve empty (defensive, never invents a color)', () => {
  const colors = resolveConfettiColors(fakeRoot({
    '--st-done': '#4F7D5B', '--st-todo': '', '--st-doing': '#E0A95C', '--st-backlog': '   ',
  }));
  assert.deepEqual(colors, ['#4F7D5B', '#E0A95C']);
});
