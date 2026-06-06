---
id: ADR-0001
title: Dashboard write-semantics — Promote-only UI moves, one shared mover, optimistic concurrency
scope: agentic-workflow
status: proposed
date: 2026-06-05
related_tasks: [agentic-workflow-001, agentic-workflow-002, agentic-workflow-003, infrastructure-001]
---

# ADR-0001: Dashboard write-semantics — Promote-only UI moves, one shared mover, optimistic concurrency

## Context

The dashboard v1 lets the builder drag task cards between lifecycle columns, moving task
`.md` files between the `backlog/` → `todo/` → `doing/` → `done/` folders. infrastructure-001
carries that write as dumb transport (`POST /api/task/move`); the *meaning* of the move is
ours to define.

A card move is not a file operation. It is a **Task lifecycle transition** bound by the Task
aggregate's invariants:

- *status always matches its folder*,
- *one task = one commit*,
- *IDs (`<bc>-NNN`) are stable and never renumbered*.

The UI can edit the same `.agentheim/` files that the `modeling` and `work` skills edit, with
disk as the single source of truth throughout. Completion (`→done`) is normally produced by
`work` as part of one-commit-per-task, after the verifier gate fills the `commit`/`completed`
frontmatter — a bare UI file move cannot reproduce that.

This decision settles three coupled questions: which moves are legal from the UI, what shared
operation enforces them, and how concurrent UI/skill writes are reconciled.

## Decision

### 1. Legal UI move set (v1: Promote-only)

The four board columns are the four lifecycle folders; a drag is a command on the **Task**
aggregate. v1 is capped at the smallest write surface: exactly one legal UI move.

- **`backlog → todo` = Promote** → emits *Task promoted*. **The only move legal from the UI in
  v1**, and subject to the existing promotion guards — in particular the **frontend gate**: a
  UI/frontend task may not be promoted ahead of its `depends_on` (e.g. the styleguide). The
  policy consults `depends_on`, not mere column adjacency.
- **`todo → doing` = Claim** → emits *Task claimed*. **Not a UI move in v1** — stays a skill
  action (`work` claims tasks). Deferred to keep the write surface minimal.
- **`doing → done` = Complete** → **not legal from the UI**, now or likely ever as a bare move.
  Completion is bound to *one task = one commit*: the transition to `done` rides the commit
  `work` makes, with `commit`/`completed` frontmatter filled, after the verifier gate. A bare
  file move to `done` would create a `done` task with no commit, no verification, no audit
  trail.
- **Backward moves** (`doing→todo`, `todo→backlog`) and **skips** (`backlog→doing`, etc.):
  **not legal from the UI in v1.** Backward un-claim/un-promote has real meaning but touches
  `depends_on`/`blocks` reasoning better done in a `modeling` dialogue than a drag.

So the **v1 legal UI move set = `backlog→todo` only.** Every other transition is a non-drop
target in the UI and is rejected by the write path with a structured domain reason.

### 2. One shared mover — `applyTaskMove` (extracted as agentic-workflow-003)

The dashboard write path **must call the same task-move operation the skills use**, never a
second implementation. That logic lives today inside `modeling`/`work` prose; this decision
mandates extracting it into one callable primitive — `applyTaskMove(rootDir, id, from, to)` —
delivered by **agentic-workflow-003**. It must:

1. validate `from→to` against the legal-move policy above (including the `depends_on` guards),
2. enforce *status matches folder* — a move is folder rename **and** frontmatter `status`
   rewrite together, never one without the other,
3. perform the move,
4. return success with the new state, or a structured rejection carrying a reason.

Both the skills' worker and infrastructure-001's `POST /api/task/move` call this one
operation. It is the **only** writer of task lifecycle state. A parallel UI-only writer is
rejected: it would drift from the skills' rules the moment either side changes.

### 3. Optimistic concurrency (disk is source of truth)

The UI and the skills can edit `.agentheim/` files concurrently. Named failure modes:

1. **Lost update / stale board** — the UI shows a task in `backlog` while a skill has already
   moved it; a naive UI move from `backlog` acts on a stale view.
2. **Double transition** — the UI promotes while `modeling` also promotes; two writers, one
   file.
3. **Mid-edit clobber** — a skill rewrites a task body while the UI moves the file.

v1 mitigation (the simplest that holds):

- **Optimistic precondition on every UI write.** The move carries `from` (the column the UI
  believed the card was in). `applyTaskMove` verifies the file is actually in `from` before
  moving; if not, it **rejects** (409-style) "task already moved" and the UI re-fetches the
  tree (`/api/tree`). This kills lost-update and double-transition cheaply.
- **mtime guard for body edits.** The move reads the file's mtime as part of the precondition;
  a change between read and write aborts the move and the UI refetches. Single-user,
  single-machine means contention is rare, so guard + refetch suffices — no lock files.
- **No long-held locks, no DB.** Disk stays the single source of truth; the runtime holds no
  authoritative state beyond per-request reads. The board is a projection rebuildable from
  disk, refreshed on any rejected write.

## Consequences

**Positive**

- Invariants are enforced in exactly one place shared by UI and skills — no drift.
- The riskiest transition (completion) stays with `work`, where the commit lives.
- Optimistic precondition + refetch is cheap and correct for a single-user tool.
- The minimal one-move surface is trivial to reason about and to test.

**Negative**

- The board is not live: it reflects the last fetch/action, and a rejected move costs a
  refetch round-trip.
- The one-move v1 may feel restrictive — no drag-to-claim, no drag-to-done.
- The write path depends on the `applyTaskMove` extraction (agentic-workflow-003) before it
  can exist.

**Neutral**

- Disk remains the sole source of truth.
- The runtime is stateless beyond per-request reads.

## Alternatives considered

- **Allow `doing→done` from the UI** — breaks *one task = one commit*, bypasses the verifier
  gate, and yields `done` tasks with no commit and no audit trail. Rejected.
- **Also allow `todo→doing` (Claim) in v1** — viable, but the builder chose the smallest write
  surface; Claim stays a skill action for now.
- **Parallel UI-only write path** — forks the rules; UI and skills disagree the moment either
  side changes. Rejected.
- **Pessimistic locking / lockfiles** — overkill for a single-user, single-machine tool; adds
  stale-lock failure modes worse than the contention they prevent. Rejected.
- **Live file-watch board** — orthogonal and deferrable; refresh-on-action plus
  refresh-on-reject suffices for v1. Deferred.
