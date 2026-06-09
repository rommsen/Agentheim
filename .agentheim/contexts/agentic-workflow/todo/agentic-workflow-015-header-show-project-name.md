---
id: agentic-workflow-015
title: Show the project name next to "Agentheim" in the dashboard header
status: todo
type: feature
context: agentic-workflow
created: 2026-06-08
completed:
commit:
depends_on: [design-system-001]
blocks: []
tags: [dashboard, frontend, projection]
related_adrs: [0002]
related_research: []
prior_art: [agentic-workflow-005, agentic-workflow-013]
---

## Why
Agentheim is a plugin installed once and used across many projects. When the builder
launches `/dashboard` inside a consumer repo, nothing on screen says *which* project's
`.agentheim/` is being viewed — the header reads "Agentheim" identically everywhere.
Showing the current project's name disambiguates at a glance which project you're in.

## What
In the dashboard header (`ShellRail` in `dashboard/app/board.js`), render the current
project's name next to the "Agentheim" wordmark, as `Agentheim · <project>` — the
project name in muted, slightly smaller text on the same baseline (separator-dot
treatment, design-system tokens, no new styleguide pattern).

The project name is the text of the `# Vision: <name>` heading in the project's
`.agentheim/vision.md`. It reaches the frontend by **extending the `/api/tree`
projection** (`dashboard/tree.mjs`) with a small `project: { name }` metadata field,
parsed server-side. This keeps it on the one fetch the dashboard already makes and lets
it ride the existing SSE re-projection. It follows the precedent set by `mtimeMs`
(aw-013): a single derived value, not a document body — the projection's
"pointers + metadata only, never document bodies" contract (ADR-0002) still holds. The
nuance worth naming: this is the first projection field extracted from a markdown
**body** (a heading) rather than frontmatter, so the worker must keep it to exactly one
trimmed string and not start shipping body content through the projection.

## Acceptance criteria

**Projection (`dashboard/tree.mjs`)**
- [ ] `/api/tree` includes a `project: { name }` field where `name` is the trimmed text
      following `# Vision:` in the project's `vision.md`.
- [ ] When `vision.md` is missing, or present but has no `# Vision: <name>` heading,
      `project.name` is `null` — the tree walk never aborts (loss-tolerant, same ethos
      as malformed-frontmatter handling).
- [ ] No document body is added to the projection — only the single extracted name
      string (the body-free contract from ADR-0002 still holds).

**Header (`dashboard/app/board.js` → `ShellRail`)**
- [ ] When `project.name` is present, the header renders `Agentheim · <name>` with the
      name in muted, slightly smaller text on the same baseline, using existing
      design-system tokens (e.g. `--fg-3`/`--fg-4`) — no new styleguide component.
- [ ] When `project.name` is `null`/absent, the header shows only "Agentheim" exactly as
      today — no separator dot, no trailing gap.

**Tests**
- [ ] Unit coverage for the vision-name parse: heading present, heading absent,
      `vision.md` missing, and a heading with surrounding whitespace / trailing content.
- [ ] The existing tree-projection tests still pass; a case asserts `project.name` is
      populated and `null` as specified.

## Notes
- **Where the shell sources the name (small implementation choice for the worker):**
  today only `DashboardBoard` fetches `/api/tree`; the shell (`DashboardApp` →
  `ShellRail`) renders without data. The worker decides how `ShellRail` gets
  `project.name` — e.g. a minimal read in `DashboardApp` (a small `useProjectName`-style
  fetch of `/api/tree`) passed down to `ShellRail`. Live-refresh on SSE is acceptable but
  not required: the vision name is effectively static within a session, so a one-time
  read on mount is fine.
- **Prior art / contract:** aw-005 created the tree projection (`/api/tree`,
  `dashboard/tree.mjs`); aw-013 added `mtimeMs` to it — the direct precedent for adding a
  derived metadata field. ADR-0002 holds the projection's transport-vs-body contract.
- **Styleguide gate:** frontend task → `depends_on: [design-system-001]` (approved/done,
  so the gate is satisfied).
</content>
</invoke>
