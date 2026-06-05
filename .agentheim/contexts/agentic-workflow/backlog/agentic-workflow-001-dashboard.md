---
id: agentic-workflow-001
title: Dashboard — local web UI over the project's .agentheim folder
status: backlog
type: feature
context: agentic-workflow
created: 2026-06-05
completed:
commit:
depends_on: [infrastructure-001, agentic-workflow-002, agentic-workflow-003, design-system-001, infrastructure-002]
blocks: []
tags: [dashboard, ui, frontend, web, kanban]
related_adrs: []
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

This is the first UI in Agentheim. It depends on: the styleguide (design-system-001, **done**),
the runtime/transport decision (infrastructure-001), the write-semantics decision
(agentic-workflow-002), the shared `applyTaskMove` mover that the write path calls
(agentic-workflow-003), and the pre-bundled static asset set it ships (infrastructure-002).

## Acceptance criteria

- [ ] A `dashboard` skill/command exists and is documented as a Key command of this BC.
- [ ] Invoking it starts a local web server in the current terminal, scoped to the
      `.agentheim/` folder of the current project.
- [ ] The UI renders a Kanban board with columns for `backlog`, `todo`, `doing`, `done`,
      showing tasks across all bounded contexts.
- [ ] Clicking a task card opens a slide-over panel from the right that renders the task's
      markdown.
- [ ] BC READMEs, the vision, the context map, research reports, and ADRs are all
      discoverable through the navigation.
- [ ] Clicking any of those markdown artifacts opens it rendered in the same right-hand
      slide-over panel.
- [ ] The UI reflects the current on-disk state of `.agentheim/`.
- [ ] Dragging a task card from `backlog` to `todo` performs a legal Promote per
      agentic-workflow-002 (via the shared `applyTaskMove`, agentic-workflow-003); illegal
      moves are non-drop in the UI and refused with the domain's reason.
- [ ] Look-and-feel conforms to the approved styleguide (design-system-001).

## Notes

- **Likely splits during refinement** into: server bootstrap / launch, Kanban board view,
  the slide-over + markdown renderer, and navigation/discovery. Decompose via the
  orchestrator when refining.
- **Resolved during refinement (2026-06-05):**
  - *Read-only vs. interactive* → **interactive, Promote-only**: cards drag `backlog→todo`
    (a Task Promote); all other moves stay skill-driven. See agentic-workflow-002.
  - *Host/port and stop* → settled in infrastructure-001 (localhost-only, ephemeral port +
    runfile, explicit `dashboard stop`, not Ctrl+C).
- **Still open for refinement:**
  - Live reload when files change on disk vs. refresh-to-update (v1 leans
    refresh-on-action + refresh-on-reject; live file-watch deferred).
  - Per-BC grouping/filtering on the board, and how to handle multiple BCs cleanly.
- **Depends on:** infrastructure-001 (runtime/transport), agentic-workflow-002
  (write-semantics), agentic-workflow-003 (shared `applyTaskMove`), infrastructure-002
  (pre-bundled static assets — the dashboard ships pre-bundled from day one, builder decision
  2026-06-05), and design-system-001 (styleguide — **done, approved 2026-06-05**). All must
  land before this can be promoted to `todo`.
