---
id: agentic-workflow-074
title: Slide-over gets an expand/collapse-width chevron, replacing the full-screen button
status: todo
type: feature
context: agentic-workflow
created: 2026-06-17
completed:
depends_on: [design-system-001-styleguide, design-system-020]
blocks: []
tags: [dashboard, slide-over, drawer, frontend]
related_adrs: [0021, 0010, 0003, 0014]
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
chevron** at the **top-left of the ticket description**. Clicking it **widens the
slide-over (the styleguide `Drawer`) in place** to **fill the main content area**
(right of the left rail — the rail stays visible). Once expanded, the chevron
becomes a **collapse chevron** that returns the drawer to its default narrow width.
A single in-place expand/collapse width toggle — **no main-pane promotion**.

This is a **pure-consumer** task: the expandable-width capability itself lives in the
`Drawer` primitive (**design-system-020**, this task's dependency) per ADR-0003. aw-074
only *consumes* that capability — it stops surfacing the header's full-screen button
and wires the new expand seam, supplying the **rail-aware width value** (the one fact
the dashboard owns, never the primitive).

The underlying main-pane full-screen render **path stays** — only the slide-over's
button is removed: global search (aw-052) routes tickets through the aw-039 "open in
full screen → main pane" path, so `board.js`'s `onOpenFullScreen` / `setMainView("board")`
promote path must keep working. It simply loses its entry point from the slide-over
header.

**Decided in refine:** reopening the slide-over on a task **resets to collapsed**
(no persisted expand state — no new view-state store, no ADR-0015); **Esc closes the
slide-over outright** when expanded (unchanged behavior — the chevron is the only
collapse affordance).

## Acceptance criteria
- [ ] `slide-over.js` **no longer passes `onOpenFullScreen` to its `Drawer`** — the
      slide-over header drops the "Open in full screen" button via the existing
      callback guard, leaving **Close only** in the header.
- [ ] `slide-over.js` passes the new ds-020 expand seam to the `Drawer`: `expanded`,
      `onToggleExpand`, and a **rail-aware `expandedWidth`** (`calc(100vw - 248px)`
      / the rail-width constant — rail-awareness lives in the dashboard, not the
      primitive).
- [ ] The **ds-020 body-top chevron** (rendered by the `Drawer` primitive — **not**
      a board-local glyph) appears at the **top-left of the ticket description body**
      once the expand seam is wired; clicking it widens the drawer to **fill the main
      content area** (rail still visible) and flips the glyph to **collapse**; clicking
      again returns the drawer to its default narrow width. aw-074 **wires and verifies**
      this seam (`expanded` / `onToggleExpand`), it does **not** render the chevron.
- [ ] Reopening the slide-over starts **collapsed** (no persisted expand state).
- [ ] **Esc closes the slide-over outright** when expanded (no collapse-then-close
      two-step).
- [ ] The main-pane full-screen render path (aw-039) is **unchanged** —
      `board.js`'s `onOpenFullScreen` / `setMainView("board")` promote path is still
      present and search (aw-052) still opens tickets in the main pane (existing
      full-screen guards stay green).
- [ ] Keyboard-operable (native `<button>` IconButton) and
      `prefers-reduced-motion`-respecting, inherited from the ds-020 `Drawer`.
- [ ] Styleguide consumed **unforked** (ADR-0003) — the expandable-width mode lives
      in the `Drawer` primitive (ds-020), **not** forked board-local.
- [ ] Dashboard `dist/` rebuilt (`node build.mjs`) so the live board picks up the
      unforked Drawer change.

## Notes
**Second refine (2026-06-17):** cross-checked the consumed interface against the
shipped **design-system-020** task — `expanded` / `onToggleExpand` / consumer-supplied
`expandedWidth`, the body-top chevron + `panel-right-open`/`panel-right-close` glyph
pair, and the deferred-to-consumer `dist/` rebuild all line up. Tightened AC#3 so the
chevron reads as the **ds-020 primitive's** (aw-074 wires + verifies the seam, never
renders a board-local glyph). **Stays in `backlog`: dependency-blocked** — ds-020 (the
primitive) is still in `backlog`, and a pure consumer cannot be worked or promoted ahead
of the primitive it imports. The path to working aw-074 runs through ds-020 first
(promote + work ds-020, then promote aw-074).

**Split in refine (2026-06-17):** the expandable-width capability landed in a new
**design-system-020** child (controlled expand seam + body-top chevron + the
`panel-right-open` / `panel-right-close` glyph pair). aw-074 depends on it and is now
a pure consumer — forced by ADR-0003 (unforked) + the ds-009→aw-039 / ds-014→aw-047 /
ds-016→aw-052 "styleguide-capability-first" precedent. **No ADR needed** — extends an
existing primitive along the already-ADR'd ds-005/ds-006 controlled-seam pattern under
ADR-0003 + ADR-0014; README prose is the right home (as ds-013 carried the maximize
glyph).

- **The `onOpenFullScreen` callback stays defined** on `Drawer` / `HeaderContextual` /
  `HeaderMinimal` (it is callback-guarded). The slide-over's only header change is to
  **stop passing it** — with the callback absent the guard hides the maximize action.
  `board.js`'s promote path (aw-039/aw-052) is untouched.
- **Glyph pair (added by ds-020):** `panel-right-open` (collapsed → "Expand panel") /
  `panel-right-close` (expanded → "Collapse panel") — deliberately distinct from
  ds-013's `maximize` (which means *promote into main pane*, a mode change), to preserve
  that resize-vs-promote distinction.
- **Width target** — "fill the main content area, rail still visible": the dashboard
  passes `expandedWidth = calc(100vw - 248px)` (the `ShellRail` is fixed `width: 248`);
  the collapsed default `min(560px, 78%)` stays in the primitive.

**Relevant prior art / decisions:**
- design-system-020 — the Drawer expandable-width capability this task consumes.
- aw-039 — slide-over "Open in full screen" → main pane (button being replaced; its
  main-pane path is retained for search).
- aw-007 — the slide-over itself.
- ds-009 / ds-013 / ds-014 — the `Drawer` "Open in full screen" callback + maximize
  glyph + title-led header.
- ds-005 — the controlled/uncontrolled seam ds-020's `expanded` prop follows.
- aw-052 — global search routes tickets through the aw-039 main-pane path.
- ADR-0021 (open-intent split), ADR-0010 (slide-over feeds Drawer a doc-shaped item),
  ADR-0003 (styleguide unforked), ADR-0014 (reduced-motion strip).
