---
id: design-system-004
title: Animated "actively working" treatment for doing-column tickets
status: backlog
type: feature
context: design-system
created: 2026-06-08
completed:
commit:
depends_on: []
blocks: []
tags: [captured]
related_adrs: []
related_research: []
prior_art: []
---

## Why
Not stated explicitly, but: it should be visually, unmistakably clear that the tickets in
the doing column are *actively being worked on* right now.

## What
Give tickets in the doing column an animated background — something glowing, rotating,
animating — so that "work is happening here" reads at a glance. The exact visual idea is
still open; we still need to design what the animation actually is.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `capture` on 2026-06-08 — raw, unrefined. Needs a `modeling` refine pass
before it can be promoted. The visual concept is deliberately undecided — refinement
should land on a concrete animation idea that fits the styleguide ("quiet by default,
color used only to signal ticket status") and respects motion tokens. As a frontend task,
refinement must add the `design-system-001-styleguide` dependency per the styleguide gate.
