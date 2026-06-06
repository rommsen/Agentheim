---
id: ADR-0012
title: applyTaskMove resolves slugged task filenames from a bare id; the SSE consumer re-fetches, never interprets
scope: agentic-workflow
status: proposed
date: 2026-06-06
related_tasks: [agentic-workflow-009, agentic-workflow-003]
related_adrs: [ADR-0001, ADR-0006, ADR-0007]
---

# ADR-0012: `applyTaskMove` resolves slugged filenames from a bare id; the SSE consumer re-fetches, never interprets

## Context

Wiring the dashboard's two interactivity concerns (agentic-workflow-009) surfaced two
decisions that the prior ADRs left implicit.

1. **id → file resolution.** `applyTaskMove` (agentic-workflow-003, ADR-0001 §2) is addressed
   by a task's **bare id** (`agentic-workflow-009`) — that is what the read projection
   (`/api/tree`), the board ticket, and the skills all carry. But on disk a task file is named
   `<id>-<slug>.md` (`agentic-workflow-009-dashboard-live-update-and-promote.md`). The mover as
   first written reconstructed the path as `<id>.md`, which never matches a real slugged file —
   so a Promote from the live board would always 404. (The mover's own unit tests had hidden
   this by using `<id>.md` filenames where id == basename.)

2. **What the live-update consumer does with an SSE frame.** ADR-0006 defines the transport: a
   debounced `tree-changed` pointer pushed on any `.agentheim/` mutation, explicitly "a raw
   pointer, never an interpreted Task transition." aw-009 owns that interpretation. The question
   was whether the consumer should diff the pointer's path to patch the board in place, or do
   something simpler.

## Decision

### 1. The mover resolves a task file from its bare id, tolerating the `-<slug>` suffix

`applyTaskMove` maps id → file by scanning the lifecycle folder for a file named either exactly
`<id>.md` **or** `<id>-<slug>.md`. The match is **anchored** on `<id>-` so a bare `alpha-001`
never collides with a longer-numbered sibling `alpha-0010`. The exact `<id>.md` wins if present;
otherwise the first sorted slugged match is used (deterministic). The **on-disk filename
(slug included) is preserved across the move** — only the folder changes; the id is stable and
never renumbered (an ADR-0001 invariant), and the slug rides along.

This keeps the mover's id-keyed signature — skills and the dashboard both address a task by its
bare id — while matching the real `<id>-<slug>.md` files. The change lives entirely in the
mover (agentic-workflow's, per ADR-0007's scope note); callers are unaffected.

### 2. The SSE consumer RE-FETCHES; it never interprets the pointer

On every `tree-changed` frame — and on every (re)connect (`hello`) — the consumer does exactly
one thing: re-fetch `/api/tree` and re-project the whole board. It never reads the pointer's
path to patch a single card. This is the direct corollary of ADR-0001's "disk is the source of
truth, the board is a projection rebuilt from it":

- **Idempotent by construction.** Re-fetching N times yields the same board. A burst of frames,
  or the echo of the board's **own** Promote, collapses into re-fetches with no double-apply —
  satisfying aw-009's "the move's own SSE echo is handled idempotently."
- **Reconnect-safe.** EventSource auto-reconnects and re-fires `hello`; re-syncing on every
  `hello` means a reconnect after a dropped connection catches up on whatever changed while
  disconnected, with no missed-event bookkeeping.
- **No interpretation seam to drift.** The watcher stays transport-only (ADR-0006); the consumer
  adds zero transition logic. The ONLY writer of lifecycle state remains the server's
  `applyTaskMove` (ADR-0001) — the live-update path is read-only.

## Consequences

**Positive**
- Promote works against real slugged task files; the mover is now correct for the actual on-disk
  naming, not just its test fixtures.
- The live board is trivially correct and idempotent — no event-diffing, no patch-in-place bugs,
  no double-apply on the self-echo.
- Reconnect needs no sequence numbers or replay; re-sync-on-hello suffices.

**Negative**
- Each change re-fetches the whole tree, not a delta. For a single-user local tool with a small
  tree this is negligible; if the tree ever grows large enough to matter, a delta endpoint can be
  added without changing the consumer's contract.
- Resolving id → file is an O(folder) scan when the exact `<id>.md` is absent. Lifecycle folders
  are small; acceptable.

**Neutral**
- Disk remains the sole source of truth; the runtime holds no authoritative state beyond
  per-request reads.

## Alternatives considered
- **Pass the full file path from the UI to the mover** instead of resolving from id. Rejected: it
  would change the mover's id-keyed contract that the skills also rely on, and push path
  knowledge into every caller.
- **Patch the board in place from the pointer's path.** Rejected: re-introduces transition
  interpretation the watcher deliberately omits, and is strictly more bug-prone than a re-fetch
  for no real gain at this scale.
