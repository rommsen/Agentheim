---
id: agentic-workflow-001
title: Dashboard — local web UI over the project's .agentheim folder
status: todo
type: feature
context: agentic-workflow
created: 2026-06-05
completed:
commit:
depends_on: [agentic-workflow-004, agentic-workflow-005, agentic-workflow-006, agentic-workflow-007, agentic-workflow-008, agentic-workflow-009]
blocks: []
tags: [dashboard, ui, frontend, web, kanban, epic]
related_adrs: [ADR-0001, ADR-0002, ADR-0004]
related_research: []
prior_art: []
---

## Why

The builder works the agentic workflow through markdown files scattered across
`.agentheim/` — tasks in four lifecycle folders per BC, plus the vision, context map, BC
READMEs, research reports, and ADRs. There is no at-a-glance view of project state and no
easy way to browse or discover this knowledge. A dashboard turns the file tree into a
navigable, discoverable overview without the builder having to open files by hand.

## What

A new `dashboard` skill/command. When invoked, it starts a local web server **in that
terminal**, serving a UI over the `.agentheim/` folder of whichever project the plugin is
being used in. The UI provides:

- A **Kanban board** of tasks across the lifecycle columns (`backlog` / `todo` / `doing` /
  `done`), drawn from every BC.
- A **right-hand slide-over panel** (Notion-style, animated in from the right) that is the
  universal detail view: clicking a task card opens that task's rendered markdown in the
  panel.
- The same slide-over for **every other markdown artifact** — BC READMEs, the vision, the
  context map, research reports, and ADRs — so clicking any of them opens its rendered
  markdown in the panel.
- **Navigation** that makes all of these artifacts discoverable and easy to browse.

**v1 is interactive (write-back), scoped to a single move.** Dragging a task card from the
`backlog` column to `todo` performs a **Promote** — the only UI-initiated Task move in v1
(per agentic-workflow-002). All other transitions (claim, complete, backward moves) stay
skill-driven and are non-drop in the UI. Everything else the UI shows is read-rendered.

This is the first UI in Agentheim, and **this task is the integration epic** — the
buildable units are its children (agentic-workflow-004…009). It closes only when all of them
are `done` and the end-to-end flow works: launch → board → slide-over → live-update → Promote.

## Acceptance criteria (integration / end-to-end only)

- [ ] All child tasks land `done`: aw-004 (server bootstrap), aw-005 (read API), aw-006
      (flat board), aw-007 (slide-over + renderer), aw-008 (navigation), aw-009 (live-update +
      Promote).
- [ ] Invoking `dashboard` launches the server, opens the board, and a builder can: browse every
      BC artifact, open any as rendered markdown in the slide-over, see the board live-update when
      a skill moves a file on disk, and drag `backlog→todo` to Promote.
- [ ] The end-to-end flow works on the builder's Windows box and at least one POSIX OS.
- [ ] `dashboard` is documented as a Key command of this BC.

## Notes

- **Decomposed during refinement (2026-06-06)** into six children — see them in `backlog/`:
  aw-004 server bootstrap · aw-005 read API · aw-006 flat board view · aw-007 slide-over +
  renderer · aw-008 navigation · aw-009 SSE live-update + Promote. This file is now the thin
  epic / integration gate; all leaf dependencies moved down onto the child that consumes them.
- **Resolved during refinement:**
  - *Read-only vs. interactive* → **interactive, Promote-only** (`backlog→todo` only); all other
    moves stay skill-driven. See agentic-workflow-002 / ADR-0001. (Built in aw-009.)
  - *Host/port and stop* → infrastructure-001 / ADR-0002 (localhost-only, ephemeral port +
    runfile, explicit `dashboard stop`). (Built in aw-004.)
  - *Live updates* → **live-update, not refresh-only** (2026-06-06): the server pushes disk
    changes via SSE so the board reflects skill-driven moves in near-real-time. Transport is a
    new infrastructure concern — infrastructure-003 / ADR-0004 (supersedes ADR-0002's
    request/response-only clause). Consumed in aw-009.
  - *Multiple BCs on the board* → **flat board, BC shown on the card** (2026-06-06). The earlier
    swimlane proposal was reversed; the approved flat `KanbanBoard` is used as-is, no styleguide
    re-approval. Built in aw-006. (A BC filter can be captured later if the board gets crowded.)
- **Depends on:** its six children (aw-004…009). The children carry the leaf deps —
  infrastructure-001/002/003, agentic-workflow-002/003, design-system-001/002. This epic is
  promotable only once all children are done.
