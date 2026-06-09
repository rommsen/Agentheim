---
id: agentic-workflow-014
title: Group Kanban board columns by bounded context (collapsible)
status: todo
type: feature
context: agentic-workflow
created: 2026-06-08
completed:
commit:
depends_on: [design-system-001]
blocks: []
tags: [dashboard, board, view-state, captured]
related_adrs: [0009]
related_research: []
prior_art: [agentic-workflow-006, agentic-workflow-012]
---

## Why
The board is **flat by design** (ADR-0009): every BC's tasks pool into the four
lifecycle columns, each card carrying its BC only as a `context` chip. That reads fine
with a handful of cards, but as more bounded contexts land, a column becomes an
undifferentiated pile — you can't see, at a glance, *how much of `done` is
infrastructure vs design-system*, or scan one BC's work in isolation. Grouping by
bounded context restores that per-BC legibility **without** abandoning the flat board:
it's an optional, per-column **view lens** over the same read model, exactly as
column-sort (agentic-workflow-012) is. The board stays a pure projection of disk; only
the presentation reshapes.

## What
Next to each column's existing sort `<select>` (agentic-workflow-012), add a per-column
**group-by-BC toggle**. When a column is grouped:

- Its tickets are partitioned by `context` (BC) into labeled, **collapsible** sections —
  each section header shows the BC name and a card count.
- Cards **within** a section still obey that column's current sort (the pipeline becomes
  project → sort → group; grouping never re-sorts).
- Sections are ordered by BC name ascending (stable, legible); a BC with zero cards in
  that column shows no section (no empty headers).

The toggle is **per-column** (group `done` by BC while leaving `todo` flat is legal),
mirroring the per-column independence of sort.

**Persistence (reverses ADR-0009's "no localStorage" clause):** the grouped/flat choice,
each column's sort choice, and each `(column, BC)` collapse state survive a reload via a
single versioned `localStorage` view-state store. This applies to the **existing column
sort too** — flipping it from in-session-only to persisted is in scope. On every SSE
`tree-changed` re-projection (and on reconnect), the stored view-state is re-applied, not
reset — same guarantee sort already gives in-session. A brand-new BC, or a column with no
stored state, defaults to **flat + sort-default + all-expanded**.

This is **board-side view-state only** — a new pure, unit-tested grouping transform
(`dashboard/app/board-group.js`, sibling to `board-sort.js`, run *after* sort) plus the
persistence store. It never mutates the read model, the tree projection, or disk. No new
server endpoint; `applyTaskMove` and the read API are untouched.

## Acceptance criteria
- [ ] Each board column renders a group-by-BC toggle as a sibling of its sort control
      (consuming the styleguide `ColumnHeader`/`kanban.js` unmodified, per ADR-0003 — the
      `DragColumn`/board-`<select>` precedent).
- [ ] Toggling group **on** for a column partitions its cards into per-BC sections, each
      with a header showing BC name + card count; toggling **off** restores the flat,
      sorted list with no visual residue.
- [ ] Each BC section is independently collapsible; collapsing hides its cards and the
      header shows the collapsed state + retains the count.
- [ ] Cards within a section honor the column's current sort order; changing the sort
      while grouped re-sorts within every section without ungrouping.
- [ ] Sections are ordered by BC name ascending; a BC with zero cards in that column
      renders no section.
- [ ] The toggle is per-column and independent: grouping one column does not group the
      others.
- [ ] Grouped/flat choice, sort choice, and per-`(column, BC)` collapse state persist
      across a full page reload via a single versioned `localStorage` store; the existing
      column-sort choice now persists too (previously in-session-only).
- [ ] On an SSE `tree-changed` re-projection and on EventSource reconnect, the persisted
      view-state is re-applied (group/sort/collapse all preserved), never reset.
- [ ] A new BC appearing in the tree, or a column with no stored state, defaults to flat +
      default sort + all sections expanded — never `NaN`, never a throw.
- [ ] `dashboard/app/board-group.js` is a pure function of (sorted tickets, grouping-on,
      collapse-state), unit-tested under `node --test`, run after `board-sort.js`; it does
      not mutate `treeToColumns` output, the read model, or disk.
- [ ] The collapsible section header reuses the styleguide's existing collapsible
      primitive (the one `TreeGroup` uses for the library) if it fits; only if it
      genuinely does not, a board-local section matching styleguide tokens is acceptable
      (sort-`<select>` precedent) **and** a `design-system` capture is filed for the
      missing shared component.
- [ ] An ADR-0009 addendum records the view-state-persistence reversal (grouping + sort +
      collapse now `localStorage`-backed; board remains a projection of disk).
- [ ] Full dashboard test suite stays green.

## Notes
- **Decided in refinement (2026-06-09, Interrogator):** per-column toggle; collapsible BC
  sections (not contiguous runs); persist across reloads — and persist the existing
  column-sort too.
- **ADR amendment, not a silent flip.** ADR-0009 says "in-session view-state only — no
  localStorage, so every load resets to the default." This task deliberately reverses that
  for sort + grouping + collapse. Worker writes the addendum (cf. infrastructure-010's
  ADR-0002 addendum pattern). The board stays a *projection of disk*; persistence is
  view-state only, never a second source of lifecycle truth.
- **Amends agentic-workflow-012.** The sort feature's "in-session view-state only, no
  `localStorage`" behavior is intentionally changed here. aw-012 is `done` and not
  reopened; this task supersedes that one clause of its behavior and the README's
  "Column sort" entry should be updated to match.
- **Styleguide gate / open component question.** Whether the collapsible section header
  warrants a *new shared styleguide component* is left to the worker to settle during TDD
  against the design-system. Preferred: reuse the `TreeGroup` collapsible primitive.
  Fallback: board-local, token-matched, plus a `design-system` capture. The board-`<select>`
  sort precedent makes a board-local control defensible.
- **Render pipeline order:** project (`treeToColumns`) → sort (`board-sort.js`) → group
  (`board-group.js`). Grouping consumes already-sorted output; it never re-orders cards
  beyond partitioning, so sort semantics (name/mod-date, id tie-break, null-mtime-oldest)
  are preserved inside each section.
- **Possible split (not taken):** the sort-persistence flip could be its own task, but it
  shares the single `localStorage` view-state store this task introduces, so splitting
  would create an artificial store-first dependency. Kept as one coherent commit:
  "persisted per-column view-state, with collapsible BC grouping." Revisit if the worker
  finds the store substantial enough to land first.
