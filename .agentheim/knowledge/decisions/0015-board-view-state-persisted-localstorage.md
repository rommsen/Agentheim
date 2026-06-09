---
id: ADR-0015
title: Board per-column view-state (group + sort + collapse) persists in versioned localStorage
scope: agentic-workflow
status: proposed
date: 2026-06-09
related_tasks: [agentic-workflow-014, agentic-workflow-012, agentic-workflow-006]
related_adrs: [ADR-0009, ADR-0001, ADR-0002]
---

# ADR-0015: Board per-column view-state persists in versioned `localStorage`

> An ADDENDUM to ADR-0009. It REVERSES one clause of ADR-0009 — "in-session
> view-state only — no localStorage, so every load resets to the default" — and
> supersedes the matching "in-session view-state only, no `localStorage`" clause of
> agentic-workflow-012 (column sort). It does NOT reopen aw-012 (done, frozen) and
> changes no other clause of ADR-0009 (the app still lives in `dashboard/app/`,
> still consumes the styleguide unmodified, ADR-0003).

## Context
agentic-workflow-014 adds a per-column **group-by-bounded-context** lens to the
board, with independently **collapsible** per-BC sections. Grouping is only useful
if it survives a reload — a lens you must re-apply on every page load is noise, not
a tool. The same is true of the column **sort** (aw-012), which until now reset to
the default on every load. ADR-0009 deliberately chose in-session-only view-state
for the original board; that choice predates any board control rich enough to be
worth keeping.

The risk a persistence reversal raises: a stored client preference becoming a
SECOND source of truth about the board's content, competing with disk (ADR-0001:
disk is the source of truth, the board is a projection rebuilt from it).

## Decision
- The board's **per-column view lens** — `{ grouped, sort, collapsed[] }` per
  lifecycle column — is persisted in a **single versioned `localStorage` store**
  (`dashboard/app/board-view-state.js`, key `agentheim.board.viewState`,
  `VIEW_STATE_VERSION`). One store covers grouping, sort, AND each `(column, BC)`
  collapse state; the sort flip rides the same store rather than spawning an
  artificial store-first dependency.
- The reversal is **bounded to PRESENTATION view-state**. The store records only how
  you LOOK at the board (grouped/flat, ordering, which sections are collapsed). It
  NEVER records lifecycle truth — which task is in which column remains a pure
  projection of `/api/tree`, re-fetched on every SSE `tree-changed` frame and on
  reconnect (ADR-0001/0002). Persisting a lens is not a second source of truth about
  content.
- **Re-applied, never reset, on re-projection.** Because grouping/sort are DERIVED
  at render from React view-state (not baked into the fetched data), every live
  re-projection re-applies the current lens. The persisted state seeds that React
  view-state on mount.
- **Defensive defaults.** A column with no stored state — including a brand-new
  bounded context appearing in the tree — defaults to **flat + default sort +
  all-expanded**. A stale-version, malformed, or absent blob degrades to "every
  column defaults" rather than throwing: a corrupt preference must never blank the
  board (mirrors board-data's malformed-status guard).
- **Pipeline order unchanged:** project (`treeToColumns`) → sort (`board-sort.js`)
  → group (`board-group.js`). Grouping consumes the already-sorted list and only
  partitions it, so sort semantics (name/mod-date, id tie-break, null-mtime-oldest)
  are preserved inside every section.

## Consequences
- A builder's chosen lens (e.g. "group `done` by BC, sort by name") survives reloads
  and live updates, restoring per-BC legibility without abandoning the flat board.
- The store and both transforms (`board-group.js`, `board-view-state.js`) are pure
  and unit-tested under `node --test` with no DOM, keeping the React shell thin.
- A version bump silently discards old preferences (safe reset), so the persisted
  shape can evolve without migration code.
- The collapsible **section header** is board-local, token-matched (the sort-`<select>`
  precedent), because the styleguide `TreeGroup` primitive is coupled to `TreeItem`
  rows and owns its own open state — it does not fit a board section rendering
  draggable `TicketCard`s with externally-persisted collapse state. A design-system
  capture is filed for the shared collapsible primitive this reveals.
