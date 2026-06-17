---
id: ADR-0027
title: Advisory writes are distinct from lifecycle writes — the whats-next recommendation is an advisory write
scope: agentic-workflow
status: proposed
date: 2026-06-17
related_tasks: [agentic-workflow-076, agentic-workflow-073]
related_adrs: [0017, 0021, 0023, 0006, 0003]
---

# ADR-0027: Advisory writes are distinct from lifecycle writes — the `whats-next` recommendation is an advisory write

## Context

ADR-0017 made the boundary clean: **the dashboard is read-only, and skills
(`modeling` / `work`) are the sole owners of task-lifecycle transitions.** A
lifecycle write moves a task between folders, rewrites its `status`, updates the
BC `INDEX.md`, appends to `protocol.md`, and reconciles ADR backlinks — the full,
consistent operation that constitutes *disk truth* about where the project stands.
The `whats-next` skill (aw-069) was deliberately built **outside** that set: its
`SKILL.md` states it "never moves a task, never promotes, never commits, never
edits the protocol." It reads `.agentheim/` and recommends; the recommendation is
its entire output, and keeping it advisory is what makes it safe to press at any
moment.

agentic-workflow-073 wants that recommendation to **survive the terminal it ran
in** and **surface on the dashboard above the board prompt bar**, so it serves two
moments: the end of a session (a persisted overview of where things stand) and the
start of the next one (open the dashboard, see the recommended next steps without
re-running anything). For the recommendation to outlive the session it must be
written somewhere; for the dashboard to show it, the dashboard must read it.

This collides with two contracts at once: `whats-next` is "strictly read-only,"
and the dashboard "never writes `.agentheim/`." Neither contract should be
re-opened — both are load-bearing. The collision is only apparent: both contracts
are really about **lifecycle truth**. ADR-0017 forbids the *dashboard* from owning
lifecycle; the `whats-next` read-only stance forbids the *skill* from mutating
lifecycle. A persisted recommendation is neither — it is an opinion *about* the
state, not a change *to* it. What is missing is a name for that second, narrower
category of write, and the guard rails that keep it from becoming a backdoor.

The prior research on `work-session-presence-lock` and `work-terminal-completion-signal`
already worked this exact pattern: a skill writes a small on-disk **signal**, the
dashboard **reads it and reasons about its freshness**, and disk truth is untouched.
This ADR names that pattern for the `whats-next` case.

## Decision

**Introduce a second, narrower write category — an *advisory write* — that sits
beside lifecycle writes, and classify the `whats-next` recommendation as one. The
dashboard stays read-only; skills still own lifecycle. The only new thing is that a
skill may write a single, overwritten, advisory recommendation artifact that the
dashboard reads (and never writes).**

### 1. Two write categories, named

- **Lifecycle write** (ADR-0017, ADR-0007) — a change to *disk truth* about the
  project: a task move + `status` rewrite, with its `INDEX.md` / `protocol.md` /
  backlink side-effects. Owned **only** by `modeling` / `work`. The dashboard
  performs **none**.
- **Advisory write** (this ADR) — a skill persisting an *opinion about* the state,
  not a *change to* it. It records no transition, drives no projection of the
  board, and nothing in the lifecycle depends on it. `whats-next` gains exactly one.

`whats-next` stays read-only **over lifecycle**: it still never moves, promotes,
commits, or edits the protocol. It gains only the single advisory recommendation
write below. The dashboard stays read-only **over everything**, advisory artifact
included — it reads the recommendation, it never writes it.

### 2. The one advisory artifact

`whats-next` writes its recommendation to **one** file:
`.agentheim/state/whats-next.md`. It is:

- **Single-latest, overwritten not appended** — one recommendation, the most
  recent, replacing the prior one each run. It is not a log; history lives in
  `git`, not in a growing file.
- **Self-timestamped** — it carries a `generated` timestamp in its frontmatter so
  the dashboard can show a staleness cue (a recommendation written before a big
  board change reads as possibly-outdated).
- **Located under a new `state/` sibling of `knowledge/`** — deliberately **not**
  under `knowledge/` (which is curated, committed, citable truth — ADRs, research,
  indexes) and **not** under `contexts/` (lifecycle folders). `state/` is the home
  for advisory, machine-written, overwritten signals — the category the
  session-presence / terminal-completion research already pointed at. It is inside
  `.agentheim/`, so the existing recursive watcher (ADR-0006) covers it for free.

### 3. The dashboard reads it through the existing `/api/doc` carrier

The recommendation is a document *body* — `/api/tree` carries **pointers and
metadata only, never bodies** (ADR-0002/0023), so the recommendation does **not**
go into the tree projection. The dashboard fetches it via the existing
`GET /api/doc?path=.agentheim/state/whats-next.md` raw-markdown carrier, validated
by the same `startsWith(root)` in-root guard every read uses, and renders it
client-side — exactly as the main-pane reader and slide-over already render fetched
markdown (ADR-0021). No new endpoint, no new transport. The existing SSE consumer
(ADR-0006) fires on any `.agentheim/` mutation; a new/overwritten
`state/whats-next.md` triggers it, and the panel re-fetches.

### 4. Guard rails that keep "advisory" from becoming a lifecycle backdoor

The advisory category is narrow **by construction**, and these constraints are the
boundary:

1. **One file only.** Advisory writes are not a license to scatter state; this ADR
   sanctions exactly `state/whats-next.md`. A second advisory artifact needs its
   own decision.
2. **Overwritten, never appended.** No advisory artifact accumulates; the latest
   wins. (A log would drift toward being a second protocol — forbidden.)
3. **No lifecycle dependency on its content.** No task's readiness, no `INDEX.md`
   count, no gate, no `depends_on` resolution, no board projection may read it.
   The board is still a total projection of `/api/tree` (disk truth); the
   recommendation panel is a *separate, dismissible* surface that adds nothing to
   the board's lifecycle picture.
4. **Frontmatter is descriptive, not load-bearing.** Its `generated` timestamp is a
   staleness cue for rendering only; nothing keys behavior off it.
5. **The dashboard is read-only over it too.** The dashboard reads and renders it;
   it never writes, edits, or deletes it. Only `whats-next` writes it.
6. **`whats-next` writes nothing else.** Its lifecycle read-only stance is
   otherwise unchanged: no move, no promote, no commit, no protocol edit.

### 5. Commit

The artifact is machine-written and overwritten each run; under the commit doctrine
(ADR-0026) `whats-next` may scope-commit just `state/whats-next.md` at end-of-run if
the skill is made to commit, but because it is transient advisory state — not
curated knowledge — it is acceptable for it to be **git-ignored** instead, so it
never clutters history. This ADR's preference is to **git-ignore `state/`**: it is
a working signal, not a versioned artifact, and a single-latest overwritten file
gains nothing from version history. (The skill therefore writes the file and does
**not** commit it — keeping `whats-next` free of any `git` action, consistent with
its read-only stance.)

## Consequences

**Positive**

- The `whats-next` recommendation survives its session and surfaces on the
  dashboard, satisfying aw-073, without re-opening ADR-0017 or the skill's
  read-only stance — both stay intact because neither lifecycle truth nor the
  dashboard's read-only-over-lifecycle contract is touched.
- A clear, named vocabulary — **advisory write** vs **lifecycle write** — that
  future skills can reuse (the research signals fit the same category) without
  each one re-litigating "is the dashboard still read-only?"
- The dashboard reads the artifact through the **existing** `/api/doc` + SSE
  machinery; no new endpoint, no new transport, near-zero new surface.
- The board stays a *total* projection of disk: the recommendation is a separate,
  dismissible panel, not a lifecycle input, so it cannot drift the board.

**Negative**

- `.agentheim/` grows a second top-level write location (`state/`) beyond
  `knowledge/` and `contexts/`. Mitigated by it being single-file, overwritten,
  git-ignored, and gated behind this ADR for any expansion.
- A reader could mistake "advisory" for "anything a skill wants to persist." The
  guard rails in §4 are the defense; the category is explicitly one file until a
  future ADR widens it.

**Neutral**

- Disk remains the single source of truth for lifecycle; the recommendation is
  truth only about *what the skill last advised*, timestamped so its age is legible.
- The skill stays terminal-first: it still prints its prose answer; the advisory
  write is an *additional* persisted copy, not a replacement for the conversation.

## Alternatives considered

- **Write the recommendation under `knowledge/`** (e.g. `knowledge/whats-next.md`).
  Rejected: `knowledge/` is curated, committed, citable truth (ADRs, research,
  indexes) that the index *points* at; a machine-overwritten advisory note is none
  of those and would muddy the knowledge base's "everything here is reviewed truth"
  meaning.
- **Append to a recommendation log instead of overwriting.** Rejected: a growing
  log drifts toward being a second `protocol.md`, and the feature wants the
  *latest* recommendation, not a history. Git already holds history if ever needed.
- **Fold the recommendation into the `/api/tree` projection** (so the board gets it
  with the data it already fetches). Rejected: the tree is pointers + metadata
  only, never bodies (ADR-0002/0023); the recommendation is a body, and bloating
  the always-fetched projection with content only one panel needs forks the tree
  contract. `/api/doc` already carries bodies.
- **Let the dashboard write the recommendation** (e.g. the What's-next button
  POSTs it). Rejected outright: that is exactly the dashboard write path ADR-0017
  removed. The skill writes; the dashboard reads.
- **Emit raw HTML from the skill** for the dashboard to inject. Rejected (decided in
  refinement): the skill emits structured data; the dashboard renders it into its
  own styleguide-consumed components (ADR-0003), so it is light/dark aware for free
  and rendering stays owned by the dashboard.
- **A new `GET /api/whats-next` endpoint.** Rejected as unnecessary: `/api/doc`
  already carries any in-root body with the in-root guard; a bespoke endpoint adds
  surface for nothing the existing carrier can't do.
