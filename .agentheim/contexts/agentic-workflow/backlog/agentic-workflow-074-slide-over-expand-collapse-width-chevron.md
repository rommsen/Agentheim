---
id: agentic-workflow-074
title: Slide-over gets an expand/collapse-width chevron, replacing the full-screen button
status: backlog
type: feature
context: agentic-workflow
created: 2026-06-17
completed:
depends_on: [design-system-001-styleguide]
blocks: []
tags: [dashboard, slide-over, drawer, frontend]
related_adrs: [0021, 0010, 0003]
related_research: []
prior_art: [agentic-workflow-039, agentic-workflow-007]
---

## Why
When reading a ticket's description in the slide-over, the right-hand drawer is
cramped. Today the only way to get more room is the header's **"Open in full
screen"** button (aw-039), which yanks the task *out* of the slide-over and into
the main content pane — a context switch, not an in-place enlargement. The builder
wants to widen the reading surface *where they already are*: stay in the drawer,
just make it bigger, and shrink it back when done.

## What
Replace the slide-over header's **"Open in full screen"** action with an **expand
chevron** at the **top-left** of the ticket description. Clicking it **widens the
slide-over (the styleguide `Drawer`) in place** to **fill the main content area**
(right of the left rail — the rail stays visible), covering almost the entire
content surface. Once expanded, the chevron becomes a **collapse chevron** that
returns the drawer to its default narrow width. It is a single in-place
expand/collapse width toggle on the drawer — no main-pane promotion.

The underlying main-pane full-screen render **path stays** (it is *only* the
slide-over's button that is removed): global search (aw-052) routes tickets through
the aw-039 "open in full screen → main pane" path, so that capability must keep
working — it simply loses its entry point from the slide-over header.

## Acceptance criteria
- [ ] The slide-over header no longer shows the "Open in full screen" button.
- [ ] An **expand chevron** sits at the **top-left** of the ticket description in
      the slide-over.
- [ ] Clicking the expand chevron widens the drawer to **fill the main content
      area** (rail still visible); the chevron flips to a **collapse chevron**.
- [ ] Clicking the collapse chevron returns the drawer to its default narrow width.
- [ ] The main-pane full-screen render path (aw-039) is **unchanged** and search
      (aw-052) still opens tickets in the main pane.
- [ ] Keyboard-operable and `prefers-reduced-motion`-respecting, consistent with
      the existing Drawer (ds-009/ds-013).
- [ ] Styleguide consumed **unforked** (ADR-0003) — if the `Drawer` needs an
      expandable-width mode, it is added to the primitive, not forked board-local.

## Notes
**Open questions for refine (likely needs the orchestrator / a tactical pass):**

- **Where does the width-expand live?** The slide-over consumes the styleguide
  `Drawer` unforked (ADR-0010, ADR-0003). An expandable-width mode + the
  expand/collapse chevron most likely belong **in the `Drawer` primitive**
  (design-system) — meaning this splits into a **design-system child task** (the
  Drawer capability) that this aw task depends on, mirroring the ds-009/ds-013
  lineage of the header action. Confirm during refine; if it splits, wire
  `depends_on` accordingly.
- **What replaces ds-009's `onOpenFullScreen` in the header?** The expand chevron
  is a *different* affordance (in-place widen) at a *different* spot (top-left of
  the description, not the header action row). Decide whether the header keeps any
  action or is left clean. The `onOpenFullScreen` callback itself may stay defined
  on the `Drawer` (search/other callers), just not surfaced by the slide-over.
- **"Almost the entire content surface" = fill the main pane** (decided at
  capture): the drawer grows to the width of the board/main-pane area; the left
  rail is **not** covered.
- **Glyph choice** — pick a chevron consistent with the icon set (the maximize
  glyph from ds-013 was for the old full-screen action; an expand/collapse chevron
  pair is the new motif).

**Relevant prior art / decisions:**
- aw-039 — Slide-over "Open in full screen" → main pane (the button being replaced;
  its main-pane path is retained for search).
- aw-007 — the slide-over itself.
- ds-009 / ds-013 — the `Drawer` "Open in full screen" callback + maximize glyph.
- aw-052 — global search routes tickets through the aw-039 main-pane path.
- ADR-0021 (open-intent split), ADR-0010 (slide-over feeds Drawer a doc-shaped
  item), ADR-0003 (styleguide unforked).
