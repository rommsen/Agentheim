---
id: design-system-011
title: Stale add-affordance test — styleguide suite asserts against dashboard board.js that has dropped onAdd
status: backlog
type: bug
context: design-system
created: 2026-06-15
completed:
commit:
depends_on: []
blocks: []
tags: [styleguide, test, dashboard, tech-debt]
related_adrs: [0003]
related_research: []
prior_art: [agentic-workflow-018]
---

## Why

`styleguide/test/add-affordance.test.mjs` (added by `agentic-workflow-018`) reaches
ACROSS the BC boundary and reads the dashboard source
(`dashboard/app/board.js`) to assert the board hands `EmptyColumn` an `onAdd`
only for the backlog column. The dashboard board has since been refactored
(the board no longer references `onAdd` / `EmptyColumn`'s add slot at all —
likely folded away by the aw-027 main-pane / aw-026 shell relayout work), so the
test now fails:

> ✖ the board supplies onAdd to EmptyColumn ONLY for backlog
> AssertionError: the board must pass onAdd into EmptyColumn (so backlog keeps its affordance)

The failure is **pre-existing** (present on `main` before `design-system-009`) and
unrelated to the Drawer-header change; it surfaced while running the styleguide
suite for ds-009. One stale assertion fails; the other 37 styleguide tests pass.

## What

Decide and fix the drift:

1. Confirm whether the dashboard *intends* to keep a backlog "add ticket"
   affordance. If the board genuinely dropped `onAdd` on purpose, the
   board-asserting tests in `add-affordance.test.mjs` are obsolete and should be
   removed (the EmptyColumn / ColumnHeader source guards — the styleguide-owned
   contract — stay).
2. If the affordance should still exist, restore the board wiring (an
   agentic-workflow task) and keep the test.

Note the architectural smell: a **design-system** test reading **dashboard**
(agentic-workflow) source couples the styleguide suite to a consumer's internals,
contrary to ADR-0003's unforked-consumer direction. Prefer the styleguide suite to
assert only on styleguide source; consumer-wiring assertions belong in the
dashboard suite.

## Acceptance criteria

- [ ] `node --test` under `styleguide/` is green (no stale board assertion).
- [ ] The styleguide-owned contract (EmptyColumn/ColumnHeader render the add
      affordance only behind an `onAdd` guard) is still covered.
- [ ] If a backlog add affordance is still wanted, its consumer-wiring assertion
      lives in the dashboard suite, not the styleguide suite.

## Notes

- Surfaced by `design-system-009` (worker note): the failure is independent of the
  Drawer-header change. Filed as a backlog bug for the user to refine — it crosses
  into agentic-workflow's board wiring, so the fix's home BC is a refinement call.
