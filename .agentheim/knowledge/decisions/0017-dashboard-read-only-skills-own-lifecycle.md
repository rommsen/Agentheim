---
id: ADR-0017
title: Dashboard is read-only; skills are the sole owners of task lifecycle
scope: agentic-workflow
status: accepted
date: 2026-06-14
supersedes: [ADR-0001]
related_tasks: [agentic-workflow-009, agentic-workflow-003]
related_adrs: [0001, 0007, 0006, 0012]
---

# ADR-0017: Dashboard is read-only; skills are the sole owners of task lifecycle

## Context

ADR-0001 gave the dashboard one write path — drag a card `backlog→todo` to Promote, served
by `POST /api/task/move`, which delegated to the shared `applyTaskMove`. The intent was that
UI and skills could never drift, because both called the one mover.

In practice the write path bought little and cost clarity:

- **No skill actually calls `applyTaskMove`.** Workers and `modeling` move task files by hand
  (Bash `mv` + a frontmatter `status` rewrite) and own the surrounding side-effects (INDEX,
  protocol, backlinks). So the "one shared mover" had exactly one production caller — the
  dashboard. The drift it was meant to prevent could not arise from a missing dashboard.
- **The dashboard move skips the side-effects skills own (ADR-0007).** A drag-Promote moves
  the file but does NOT update the BC `INDEX.md` or append to `protocol.md` — those stay with
  the skills. So a UI Promote left the index stale and the history silent, the largest routine
  source of derived-view drift in the system.
- **Two owners of one transition is inherently less clear** than one. The lifecycle is a
  modeling concern (readiness checks, `depends_on`/gate reasoning, backlinks, protocol logging)
  that belongs in the `modeling`/`work` dialogue, not a drag gesture that can only do the
  mechanical half.

The board is otherwise already a pure projection of disk (ADR-0009): it fetches `/api/tree`
and re-projects on every SSE `tree-changed` frame (ADR-0006). Removing the one write path makes
that projection total.

## Decision

**The dashboard is read-only. Skills (`modeling` / `work`) are the sole owners of task-lifecycle
transitions.** Concretely:

1. **Remove drag-and-drop from the board.** Cards are no longer drag sources; columns are no
   longer drop targets. The board renders the four lifecycle columns as an inert projection.
2. **Remove the write path entirely.** `POST /api/task/move` is unmounted and `dashboard/move-api.mjs`
   and `dashboard/app/promote.js` are deleted. The dashboard HTTP server now exposes only reads
   (`/api/tree`, `/api/doc`), the SSE stream (`/api/events`), static assets, and `/healthz`.
3. **`applyTaskMove` stays** as the canonical lifecycle mover in `lib/task-lifecycle.mjs`, owned
   by agentic-workflow and available to the skills. It is no longer called by the dashboard. Its
   `ui` (Promote-only) policy is retained as a generic restricted move set but is wired to no
   caller.
4. **Lifecycle changes happen through the skills**, where the move is done together with its
   readiness check, `depends_on`/styleguide-gate guard, INDEX update, and protocol entry — the
   full, consistent operation, in one owner.

## Consequences

**Positive**

- One owner of the lifecycle — no two-writer ambiguity, no half-moves that update the file but
  not the index/log. "Who can change a task's status" has a single, clear answer: a skill.
- The board is now a *total* projection of disk: nothing it shows can be out of sync with a write
  it performed, because it performs none. Every change arrives via the SSE re-projection.
- Less code and less surface: the write endpoint, its client, the optimistic-precondition wiring,
  and the drag UI are gone, along with their tests.
- The INDEX-drift failure mode from ADR-0007/ADR-0001 (a UI Promote leaving `INDEX.md` stale)
  cannot occur, because the UI no longer promotes.

**Negative**

- Promoting a task now requires invoking `modeling` (e.g. `/agentheim:modeling <id>`), not a
  drag. The board's backlog cards already carry a "copy the modeling command" affordance (aw-016),
  which becomes the intended path.
- `applyTaskMove` now has no production caller (tested, but unused until a skill adopts it).

**Neutral**

- Disk remains the single source of truth; the runtime stays stateless beyond per-request reads.
- `applyTaskMove` and its tests are unchanged in behavior, kept for the skills.

## Alternatives considered

- **Keep drag-Promote but also have it update INDEX/protocol.** Reverses ADR-0007's scope
  boundary and pushes modeling concerns (readiness, gate reasoning, backlinks) into a transport
  endpoint. Rejected — the lifecycle belongs in the skill dialogue, not a drag.
- **Hide the drag affordance but keep the endpoint.** Leaves a latent write path and a server that
  still claims to be writable — the opposite of "skills stay owners, everything is clear."
  Rejected.
- **Delete `applyTaskMove` too.** Over-reach: it is the documented canonical mover the skills are
  meant to converge on. Kept, just unwired from the dashboard.

This decision **supersedes ADR-0001** (dashboard write-semantics), which was `proposed` and is now
moot: there is no UI write to give semantics to.
