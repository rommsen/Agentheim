---
id: design-system-005
title: Shared collapsible-section primitive (decoupled from TreeItem) for board + library
status: backlog
type: feature
context: design-system
created: 2026-06-09
completed:
commit:
depends_on: [design-system-001]
blocks: []
tags: [captured, frontend, styleguide]
related_adrs: [ADR-0003]
related_research: []
prior_art: []
---

## Why
The dashboard board's group-by-bounded-context lens (agentic-workflow-014) needs a
**collapsible section header** — a chevron + uppercase label + mono count that
toggles a body open/closed. The styleguide already HAS exactly this affordance, but
only INSIDE `TreeGroup` (`design-system/styleguide/app/library.js`): it is welded to
`TreeItem` rows (it renders `TreeItem` children directly) and it owns its own open
state (`useState(defaultOpen)`). The board could not reuse it, because the board:

- renders **`TicketCard`** bodies with HTML5 drag affordances, not `TreeItem` rows;
- needs the collapse state **lifted out** (it is persisted per-`(column, BC)` in the
  board's `localStorage` view-state store, ADR-0015), not owned internally.

So aw-014 built a **board-local** collapsible header matching the same styleguide
tokens (chevron rotation, `--font-ui` uppercase label, `--font-mono` count) — the
sort-`<select>` board-local precedent (ADR-0003). That is defensible but it is the
SECOND consumer that wants this affordance: a shared primitive is now warranted to
avoid token drift between the library tree and the board.

## What
Extract a `Collapsible` (or `CollapsibleSection`) styleguide primitive that:

- renders the **header chrome only** (chevron + label + optional count/trailing
  slot), token-styled, and takes arbitrary **children** as its body — agnostic to
  whether they are `TreeItem`s or `TicketCard`s;
- supports BOTH **uncontrolled** (internal `useState`, the current `TreeGroup`
  behavior) AND **controlled** (`open` + `onToggle` props) collapse, so the board can
  drive it from external persisted view-state;
- is consumed by `TreeGroup` (refactored to compose it) AND the board's per-BC
  section, eliminating the board-local duplicate.

## Acceptance criteria
- [ ] A `Collapsible` styleguide primitive exists, controlled OR uncontrolled, body-agnostic.
- [ ] `TreeGroup` composes it (no behavior change to the library tree).
- [ ] The dashboard board's per-BC section header (`dashboard/app/board.js`,
      `BCSectionHeader`) is refactored to consume it, dropping the board-local copy.
- [ ] Styleguide demo + dashboard build/dist tests stay green.

## Notes
- Captured by agentic-workflow-014 (board group-by-BC). See ADR-0015 (board view-state)
  and ADR-0003 (styleguide single source, no fork). The board-local header is the
  interim; this task makes the affordance shared.
