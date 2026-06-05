---
id: agentic-workflow-003
title: Extract applyTaskMove — one shared Task-lifecycle mover for skills and the dashboard
status: backlog
type: refactor
context: agentic-workflow
created: 2026-06-05
completed:
commit:
depends_on: [agentic-workflow-002]
blocks: [agentic-workflow-001]
tags: [task-lifecycle, invariants, refactor, shared-logic, dashboard]
related_adrs: []
related_research: []
prior_art: []
---

## Why

The dashboard write path (infrastructure-001's `POST /api/task/move`) and the skills
(`modeling` promote, `work` claim/complete) both move tasks between lifecycle folders. If
each implements its own move, the UI and the skills will drift on what a valid move is the
moment either side changes. agentic-workflow-002 decided there must be **one shared
operation**; this task extracts it. Until it exists, the dashboard cannot safely write —
so it is a prerequisite for agentic-workflow-001, not an optional cleanup.

This is a `refactor`: the move logic already happens (the skills do it in prose today); the
work is to make it a single callable unit that enforces the Task aggregate's invariants in
exactly one place.

## What

Extract a single operation — `applyTaskMove(rootDir, id, from, to)` — that is the **only**
writer of task-lifecycle state, called by both the skills' worker and the dashboard write
endpoint. Per agentic-workflow-002 it must:

1. **Validate the transition** against the legal-move policy (v1 UI: `backlog→todo` only;
   skills may use the fuller set), including `depends_on` guards (e.g. the frontend /
   styleguide gate — a frontend task may not promote ahead of its dependencies).
2. **Enforce *status matches folder*** — a move is the folder rename **and** the frontmatter
   `status` rewrite, performed together; never one without the other.
3. **Perform the move** atomically (rename within the same filesystem).
4. **Return** success with the new state, or a **structured rejection** carrying a domain
   reason string (so the transport can translate it to a 4xx, and skills can surface it).

It must also accept an **optimistic precondition** (expected `from` folder + the file's
mtime) and reject — without mutating anything — if disk disagrees, so the concurrency story
in agentic-workflow-002 has one enforcement point.

## Acceptance criteria

- [ ] A single `applyTaskMove(rootDir, id, from, to)` operation exists as a callable unit
      (not inline skill prose) and is the only code path that moves a task between lifecycle
      folders.
- [ ] It updates folder **and** frontmatter `status` atomically; a partial move (folder
      moved but status stale, or vice versa) is impossible.
- [ ] It rejects illegal transitions per agentic-workflow-002's policy with a structured
      domain reason, and enforces `depends_on` guards (a frontend task cannot promote ahead
      of the styleguide).
- [ ] It honors an optimistic precondition (expected `from` + mtime) and makes no
      filesystem change when the precondition fails.
- [ ] Both call sites use it: the skills' task-move path and infrastructure-001's
      `POST /api/task/move` (the latter wired when that task is built).
- [ ] Tests cover: a legal `backlog→todo` promote, a rejected illegal move, a blocked
      promote (unmet `depends_on`), and a stale-precondition rejection.

## Notes

- Depends on agentic-workflow-002 because that decision defines the legal-move policy and
  invariants this operation enforces. Do not start until 002's ADR is settled.
- Keep it pure-ish: take `rootDir` explicitly (no ambient cwd), so both the skill context
  and the dashboard runtime (which discovers its own root) can call it identically.
- This is where the index/protocol side effects of a move are decided too: a promote that
  the dashboard performs should leave the same INDEX/count updates a skill-driven promote
  does, or explicitly defer index maintenance to the skills — settle this with the worker
  and record it (it may warrant a line in the ADR).
