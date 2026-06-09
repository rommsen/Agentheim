// Tests for the TicketCard estimate-chip visibility + corner-action slot
// (design-system-006).
//
// TicketCard renders via htm/React with no DOM under `node --test`, so —
// mirroring the doing-pulse suite — the load-bearing, framework-free contracts
// are tested directly against the pure decision the card delegates to:
//   1. `showEstimate(est)` — the empty "— pt" chip is dead space on every
//      dashboard card (the /api/tree projection carries no estimate, ADR-0002,
//      so board-data feeds the '—' placeholder). The chip must render ONLY for a
//      real estimate, never for absent / empty / the em-dash placeholder.
//   2. the card source wires that decision (no chip when showEstimate is false)
//      and exposes an optional `cornerAction` render-prop occupying the
//      bottom-right meta slot, whose activation stops propagation so it never
//      opens the card.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { showEstimate } from '../app/card.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..', 'app');
const kanbanSrc = readFileSync(join(APP, 'kanban.js'), 'utf8');

test('showEstimate is true only for a real estimate value', () => {
  assert.equal(showEstimate('3'), true);
  assert.equal(showEstimate('1'), true);
  assert.equal(showEstimate('?'), true, 'an explicit unknown-marker is still a value the author chose to show');
});

test('showEstimate is false for absent / empty / em-dash placeholder', () => {
  for (const est of ['—', '', '  ', undefined, null]) {
    assert.equal(showEstimate(est), false, `est ${JSON.stringify(est)} must hide the chip`);
  }
});

test('the card renders the estimate chip behind the showEstimate decision', () => {
  // The chip must be conditional on showEstimate — never unconditional. Catches a
  // regression to the old `${ticket.est} pt` that always rendered.
  // The "… pt" chip must appear ONLY guarded by showEstimate(...) on the same
  // line — never as a bare unconditional render. This catches a regression to the
  // old `<${MetaChip} mono>${ticket.est} pt` that always rendered.
  const estChipLines = kanbanSrc
    .split('\n')
    .filter((line) => /\$\{ticket\.est\}\s*pt/.test(line));
  assert.equal(estChipLines.length, 1, 'exactly one estimate-chip render line expected');
  assert.match(estChipLines[0], /showEstimate\(ticket\.est\)\s*&&/, 'the estimate chip must be guarded by showEstimate(ticket.est)');
});

test('the card exposes an optional cornerAction slot in the bottom-right meta position', () => {
  // Render-prop: the styleguide owns look/placement, the consumer owns behavior.
  assert.match(kanbanSrc, /cornerAction/, 'TicketCard must accept a cornerAction');
});

test('activating the corner action stops propagation so it never opens the card', () => {
  // The card itself is a button (role="button", onClick opens the slide-over). The
  // action sits inside it, so its click MUST be isolated. The card wraps the slot
  // in a propagation-stopping container.
  assert.match(kanbanSrc, /stopPropagation\(\)/, 'corner action must stop click propagation');
});
