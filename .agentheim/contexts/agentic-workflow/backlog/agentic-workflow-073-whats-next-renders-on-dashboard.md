---
id: agentic-workflow-073
title: What's next renders its recommendation as structured HTML above the dashboard prompt (not just terminal text)
status: backlog
type: feature
context: agentic-workflow
created: 2026-06-17
completed:
depends_on: [design-system-001]
blocks: []
tags: [dashboard, frontend, whats-next, ui, captured]
related_adrs: [0017, 0021, 0009, 0003]
related_research: [work-session-presence-lock-2026-06-15, work-terminal-completion-signal-2026-06-15]
prior_art: [agentic-workflow-069, agentic-workflow-064, agentic-workflow-043, agentic-workflow-065]
---

## Why
Today the `whats-next` skill answers only in the terminal where it ran. The recommendation
evaporates with that session — you can't glance at it later, and it isn't visible on the
dashboard where the builder actually decides what to do next. The builder wants the
recommendation to **surface on the dashboard, above the prompt bar**, so that it serves two
moments:

- **End of a session** — a persisted overview of where things stand and what to do next.
- **Start of the next session** — open the dashboard and immediately see the recommended
  next steps, without re-running anything.

This makes the topbar **What's next** button (aw-069) pay off visually: press it, and a few
moments later the recommendation appears *in* the dashboard rather than only in whatever
terminal the bridge spawned.

## What
When the `whats-next` skill runs, in addition to (or instead of) its terminal prose, it
emits a **structured recommendation** that the dashboard renders as a panel **above the
board prompt bar**. The panel shows the latest "what's next" recommendation — where things
stand, the recommended next move(s) and why, and the concrete next action — and persists so
it's still there when the dashboard is reopened in a later session.

The shape spans two halves that need to meet:
1. **`whats-next` skill** writes its recommendation to a known location under `.agentheim/`
   (e.g. a single latest-recommendation artifact) when it runs.
2. **Dashboard** reads that artifact and renders it as a structured panel above the prompt
   bar on the board view, refreshing live (via the existing SSE consumer) when a new
   recommendation lands.

## Acceptance criteria
- [ ] To be defined during refinement. (Behaviour the builder asked for, to be sharpened:)
- [ ] Running the `whats-next` skill produces a persisted, structured recommendation the
      dashboard can render — not only terminal prose.
- [ ] The dashboard renders the latest recommendation as a panel **above the board prompt
      bar**, styleguide-consumed (unforked, ADR-0003), light/dark aware.
- [ ] The panel survives a dashboard reload / new session (persisted, not ephemeral) and
      updates live when a newer recommendation is written.

## Notes
Captured via `/agentheim:modeling` on 2026-06-17 — raw on the *how*, clear on the *what*.
Needs a `modeling` **refine** pass (likely an `architect` round) before it can be promoted.
The open design forks the refine pass must resolve:

- **Read-only tension (the keystone).** The `whats-next` skill is currently *strictly
  read-only* — `SKILL.md` states it "never moves a task, never promotes, never commits,
  never edits the protocol." This feature requires it to **write** a recommendation artifact.
  And the dashboard is read-only over `.agentheim/` (ADR-0017). Decide how to reconcile:
  is the recommendation an allowed *advisory write* (not a lifecycle/disk-truth write, so the
  read-only-over-*lifecycle* contract is intact), where does it live, and does it get its own
  ADR? This is the decision that gates the whole task.
- **HTML vs structured data.** The builder said "structured HTML." Decide whether the skill
  emits **raw HTML** (rendered through `marked` like the frontmatter-folding precedent does,
  aw-043 — `marked` passes raw HTML through, ADR-0003) or **structured data** (markdown / JSON)
  that the dashboard renders into its own styleguide components. The latter is safer and keeps
  rendering owned by the dashboard; the former is closer to what was asked. Architect's call.
- **Persistence & staleness.** It must survive into the next session, so it's a persisted
  single-latest artifact (overwritten each run), not a log. Consider a timestamp + staleness
  cue so a recommendation written before a big board change reads as possibly-outdated — the
  `work-session-presence-lock` / `work-terminal-completion-signal` research already worked
  through the "skill writes an on-disk signal, dashboard reasons about its freshness" pattern.
- **Where it renders.** "Above the prompt" = above the board prompt bar (aw-023/038/054/065),
  which only shows on the **board** view. Confirm scope (board view only) and how it composes
  with the `Prompt` title and the three launch cards.
- **How the dashboard learns of it.** The SSE live-update consumer (aw-009) already re-fetches
  on any `.agentheim/` change — a new recommendation file would trigger it for free, needing a
  read endpoint (or folding into the tree/doc projection) rather than new transport.
- **Dismissable?** Decide whether the builder can dismiss/collapse the panel (it could become
  noise once read) — possibly a follow-up.

Frontend task → depends on the approved styleguide (`design-system-001`); styleguide consumed
unforked (ADR-0003). Prior art: aw-069 (button fires the skill), aw-064 (button created),
aw-043 (structured-HTML-through-`marked` precedent), aw-065 (prompt-bar layout it sits above).
