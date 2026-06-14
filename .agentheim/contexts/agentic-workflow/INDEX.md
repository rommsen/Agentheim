# Agentic Workflow — Index

Catalog of everything in this bounded context: tasks by status, ADRs scoped to this BC,
research touching this BC, and concept synthesis pages.

> Updated by: `modeling` (tasks), `work` (BC-scoped ADRs, concept page links), `research` (BC-scoped reports).

---

## Tasks by status

<!-- task-counts:start -->
- **Backlog:** 1
- **Todo:** 1
- **Doing:** 0
- **Done:** 18
<!-- task-counts:end -->

### Todo
<!-- todo-list:start -->
- **agentic-workflow-019** — Rename the `capture` skill to `quick-capture` — `todo/agentic-workflow-019-rename-capture-skill-quick-capture.md`
<!-- todo-list:end -->

### Doing
<!-- doing-list:start -->
<!-- doing-list:end -->

### Done (most recent first; older entries kept for prior-art search)
<!-- done-list:start -->
- **agentic-workflow-018** — Remove the non-functional "Add ticket" affordances from non-backlog columns — `done/agentic-workflow-018-remove-dead-add-ticket-affordances.md`
- **agentic-workflow-017** — Wire the styleguide light/dark theme toggle into the dashboard — `done/agentic-workflow-017-dashboard-theme-toggle.md`
- **agentic-workflow-016** — Backlog cards & the add-ticket button copy the matching /modeling command to the clipboard — `done/agentic-workflow-016-backlog-copy-modeling-command.md`
- **agentic-workflow-015** — Show the project name next to "Agentheim" in the dashboard header — `done/agentic-workflow-015-header-show-project-name.md`
- **agentic-workflow-014** — Group Kanban board columns by bounded context (collapsible) — `done/agentic-workflow-014-board-group-by-bounded-context.md`
- **agentic-workflow-012** — Add sorting options to Kanban board columns — `done/agentic-workflow-012-board-column-sorting.md`
- **agentic-workflow-013** — Carry task file modification time (mtimeMs) in the /api/tree projection — `done/agentic-workflow-013-tree-projection-mtime.md`
- **agentic-workflow-010** — Dashboard cross-OS verification: POSIX leg (spike) — `done/agentic-workflow-010-dashboard-posix-cross-os-verification.md`
- **agentic-workflow-011** — /dashboard command — launch, stop, status, auto-open (feature) — `done/agentic-workflow-011-dashboard-slash-command.md`
- **agentic-workflow-001** — Dashboard — local web UI over the project's .agentheim folder (epic / integration gate; Windows v1) — `done/agentic-workflow-001-dashboard.md`
- **agentic-workflow-009** — Dashboard interactivity: SSE live-update consumer + Promote → applyTaskMove (feature) — `done/agentic-workflow-009-dashboard-live-update-and-promote.md`
- **agentic-workflow-008** — Dashboard navigation: discover and browse all .agentheim artifacts (feature) — `done/agentic-workflow-008-dashboard-navigation.md`
- **agentic-workflow-007** — Dashboard slide-over: universal detail panel + client-side markdown renderer (feature) — `done/agentic-workflow-007-dashboard-slide-over-renderer.md`
- **agentic-workflow-006** — Dashboard board view: flat Kanban (lifecycle columns, BC on the card) (feature) — `done/agentic-workflow-006-dashboard-board-view.md`
- **agentic-workflow-005** — Dashboard read API: /api/tree projection + /api/doc carrier (feature) — `done/agentic-workflow-005-dashboard-read-api.md`
- **agentic-workflow-003** — Extract applyTaskMove: one shared Task-lifecycle mover for skills and the dashboard (refactor) — `done/agentic-workflow-003-extract-apply-task-move.md`
- **agentic-workflow-004** — Dashboard server bootstrap: stdlib HTTP, detached launch/stop, project discovery (feature) — `done/agentic-workflow-004-dashboard-server-bootstrap.md`
- **agentic-workflow-002** — Decide dashboard write-semantics: legal Task moves, shared mover, concurrency (decision) — `done/agentic-workflow-002-dashboard-write-semantics.md`
<!-- done-list:end -->

### Backlog
<!-- backlog-list:start -->
- **agentic-workflow-020** — Backlog "Add ticket" becomes two launch buttons — Quick Capture & Modeling — that start a seeded Claude session — `backlog/agentic-workflow-020-backlog-two-launch-buttons.md`
<!-- backlog-list:end -->

## ADRs scoped to this BC

<!-- adr-local:start -->
- **ADR-0001** — Dashboard write-semantics — Promote-only UI moves, one shared mover, optimistic concurrency (proposed) — `../../knowledge/decisions/0001-dashboard-write-semantics.md`
- **ADR-0004** — Detached dashboard server uses a neutral cwd and AGENTHEIM_ROOT, not the project dir (proposed) — `../../knowledge/decisions/0004-dashboard-detached-process-cwd.md`
- **ADR-0007** — applyTaskMove owns only the move; INDEX/protocol side-effects stay with skills (proposed) — `../../knowledge/decisions/0007-task-move-side-effect-boundary.md`
- **ADR-0009** — Dashboard frontend app lives in `dashboard/app/`, consumes the styleguide; build retargets to it (proposed) — `../../knowledge/decisions/0009-dashboard-frontend-app-shell.md`
- **ADR-0010** — The dashboard slide-over feeds the styleguide Drawer a doc-shaped item (accepted) — `../../knowledge/decisions/0010-slide-over-doc-shaped-item.md`
- **ADR-0011** — The dashboard library/navigation surface is the non-task half of the tree projection, grouped client-side (accepted) — `../../knowledge/decisions/0011-dashboard-library-groups-from-tree-locations.md`
- **ADR-0012** — applyTaskMove resolves slugged task filenames from a bare id; the SSE consumer re-fetches, never interprets (proposed) — `../../knowledge/decisions/0012-applytaskmove-resolves-slugged-filenames-by-bare-id.md`
- **ADR-0015** — Board per-column view-state (group + sort + collapse) persists in versioned `localStorage` (proposed) — `../../knowledge/decisions/0015-board-view-state-persisted-localstorage.md`
<!-- adr-local:end -->

## Research touching this BC

<!-- research-local:start -->
<!-- research-local:end -->

## Concepts (opt-in synthesis pages)

<!-- concepts:start -->
<!-- concepts:end -->

## Pointers

- BC README (ubiquitous language, invariants): `README.md`
