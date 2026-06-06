---
id: ADR-0007
title: applyTaskMove owns only the move; INDEX/protocol side-effects stay with skills
scope: agentic-workflow
status: proposed
date: 2026-06-06
related_tasks: [agentic-workflow-003, agentic-workflow-009]
related_adrs: [ADR-0001]
---

# ADR-0007: `applyTaskMove` owns only the move; INDEX/protocol side-effects stay with skills

## Context

ADR-0001 mandates one shared mover — `applyTaskMove(rootDir, id, from, to)` — as the
sole writer of task-lifecycle state, called by both the skills' worker and the dashboard's
`POST /api/task/move` (agentic-workflow-009). agentic-workflow-003 extracts that operation.

A skill-driven promote today is not only a file move: the `modeling`/`work` skills also
maintain the per-BC `INDEX.md` catalog and append a line to `knowledge/protocol.md` (the
chronological diary). agentic-workflow-003's Notes raise the open question: when the
**dashboard** performs a promote, should `applyTaskMove` reproduce those INDEX/protocol
side-effects, or should they stay with the skills/orchestrator?

This matters because both call sites share the one operation. If `applyTaskMove` did the
index/protocol writes, every caller would inherit them — including the dashboard, which is
dumb transport that must not own catalog semantics.

## Decision

**`applyTaskMove` owns ONLY the task-file move + frontmatter `status` rewrite + optimistic
precondition. It performs no INDEX and no protocol writes.** Those remain the
responsibility of the skills / orchestrator that drive a move.

- The operation is the single enforcer of the legal-move policy, the `depends_on` guards,
  *status matches folder*, and the optimistic concurrency precondition (ADR-0001). That is
  the whole of its contract.
- A **skill-driven** move keeps doing its INDEX maintenance and protocol logging exactly as
  before, layered *around* its call to `applyTaskMove` — the skill calls the mover, then
  updates the catalog and appends to the protocol, in the same way it owns the one-commit
  step.
- A **dashboard-driven** promote (agentic-workflow-009) performs the move via the same
  operation and does **not** trigger INDEX/protocol updates in v1. The board is a projection
  rebuildable from disk (ADR-0001); a UI promote that leaves the catalog slightly behind is
  acceptable for a single-user tool and is reconciled on the next skill pass. Dashboard-owned
  index maintenance is explicitly **out of scope for v1**.

## Consequences

**Positive**
- The shared operation has one crisp responsibility (move + invariants), so both call sites
  get identical, well-tested move semantics with no surprise side-effects.
- The dashboard stays dumb transport: it cannot accidentally rewrite catalogs or the diary.
- Skills keep full control of their own bookkeeping (index, protocol, commit), which they
  already couple tightly to their workflow.

**Negative**
- After a UI promote, the per-BC `INDEX.md` may transiently lag the on-disk folder state
  until a skill run reconciles it. Acceptable for v1 (disk is the source of truth; the index
  only points).
- If a future requirement demands the dashboard keep the index live, that is a new task
  (a dashboard-side reconciler), not a change to `applyTaskMove`.

**Neutral**
- Disk remains the single source of truth; the index is a derivable projection.

## Alternatives considered

- **`applyTaskMove` also writes INDEX + protocol.** Rejected: it would force the dashboard
  (dumb transport) to own catalog and diary semantics, couple the pure mover to two extra
  aggregates, and make the operation far harder to test and reason about. The mover would no
  longer be "pure-ish".
- **Dashboard maintains the index itself after calling the mover.** Deferred, not adopted
  for v1: the board rebuilds from disk on every fetch, so a lagging index is harmless until a
  skill reconciles it. Revisit only if a live-index requirement appears.
