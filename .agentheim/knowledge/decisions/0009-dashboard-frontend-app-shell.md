---
id: ADR-0009
title: Dashboard frontend app lives in dashboard/app/, consumes the styleguide; build retargets to it
scope: agentic-workflow
status: proposed
date: 2026-06-06
related_tasks: [agentic-workflow-006, agentic-workflow-007, agentic-workflow-008, infrastructure-002]
related_adrs: [ADR-0002, ADR-0003]
---

# ADR-0009: Dashboard frontend app lives in `dashboard/app/`, consumes the styleguide; the build retargets to it

## Context

`agentic-workflow-006` (the board view) is the **first dashboard UI task**, and it
exposed a gap the earlier infrastructure/design-system work deliberately left open:

- ADR-0003 made the **design-system styleguide** the single source of UI truth and
  defined two consumers — a buildless **canvas** and an esbuild-bundled **dashboard
  dist**. But the "dashboard" consumer it described was, in practice, the styleguide
  **canvas entry** itself: `infrastructure-002`'s `dashboard/build.mjs` set
  `ENTRY = styleguide/app/app.js`, so the committed `dist/` shipped the **design-system
  showcase with SAMPLE data** (`TICKETS`/`LIBRARY` constants), not a live dashboard.
- There was **no dashboard frontend application** — nothing that fetches `/api/tree`
  (the aw-005 read projection, ADR-0002) and renders real project data through the
  styleguide components.

aw-006 cannot render a live board without first answering two coupled questions the
modeling/refinement left implicit:

1. **Where does the dashboard frontend app live**, given ADR-0003's single-source rule
   (the styleguide must stay the one source; the dashboard must not fork components)?
2. **How is the esbuild build retargeted** so `dist/` serves the live dashboard instead
   of the styleguide canvas — noting that `dashboard/build.mjs` is **infrastructure's**
   file, so this is a real cross-BC seam, not a trivial edit?

The three UI tasks (aw-006 board, aw-007 slide-over, aw-008 navigation) compose into
**one** dashboard application; aw-006 lays its shell.

## Decision

### The dashboard frontend app lives in `dashboard/app/` and CONSUMES the styleguide

A new `dashboard/app/` directory holds the **dashboard frontend application** — the app
shell, the board view, and the small framework-free data transform that bridges
`/api/tree` to the styleguide's Kanban components. It **imports the approved styleguide
components across the BC boundary** by relative path
(`../../.agentheim/contexts/design-system/styleguide/app/*.js`) and uses them **as-is**:
`Column`, `TicketCard`, `ColumnHeader`, `EmptyColumn`, `html`, `ThemeCtx`. Nothing is
copied or forked. This honors ADR-0003's invariant precisely — **the styleguide is the
source; the dashboard is a consumer**, exactly the seam ADR-0003 anticipated ("the
dashboard bundle is a derived artifact, never a hand-maintained copy").

Ownership: `dashboard/app/` is **agentic-workflow's** application code (the dashboard is
this BC's feature, ADR-0002). It depends on (consumes) design-system's source; it does
not own it.

### The esbuild build retargets `ENTRY` to the dashboard app

`dashboard/build.mjs`'s `ENTRY` moves from `styleguide/app/app.js` (the canvas) to
`dashboard/app/app.js` (the live app). esbuild follows the app's relative imports into
the styleguide source and bundles them in; the existing `nodePaths` already resolves the
bare framework specifiers (`react`, `react-dom/client`, `marked`, `htm`) from
`dashboard/node_modules`. **Everything else in the pipeline is unchanged**: token CSS and
vendored webfonts are still copied verbatim from the styleguide `styles/` source, React's
production build is still selected, no CDN, no import map, no in-browser Babel. The
committed `dist/` is rebuilt and re-committed so the static handler (ADR-0002) serves the
real board.

### The seam: `build.mjs` stays infrastructure's, only its ENTRY moved

`build.mjs` remains **infrastructure's pipeline file** (ADR-0003). aw-006 makes the
single sanctioned edit — repointing `ENTRY` at the agentic-workflow app entry — and
records it here. The pipeline mechanism (esbuild config, dist contract) is untouched;
infrastructure still owns *how* the bundle is produced. agentic-workflow owns *what* is
bundled (its app). This keeps the build-retarget honest: a one-line target change against
a documented decision, not a takeover of another BC's tooling.

## Consequences

**Positive**

- The dashboard renders **live** project data over `/api/tree` while reusing the approved
  styleguide components unchanged — single-source intact, no re-approval needed.
- A clear, composable shell exists for aw-007 (slide-over) and aw-008 (navigation) to slot
  into; aw-006 builds only the board + the click-emits-open-intent hook.
- The framework-free data transform (`board-data.js`) is unit-testable under `node --test`
  with no DOM, keeping the React shell thin and the board logic verifiable.

**Negative**

- The dashboard now imports across the BC boundary by relative path. That coupling is
  intentional (single source) but means moving the styleguide source breaks the dashboard
  build — acceptable, and caught immediately by the build + dist tests.
- The styleguide canvas is no longer what `dist/` ships. The canvas remains the gated,
  buildless review surface (ADR-0003); the dashboard is a separate consumer of the same
  source. Two entrypoints from one source must stay honest — the dist tests assert the
  board (`/api/tree`), not the canvas hero, ships.

**Neutral**

- `dashboard/app/` is application code with no runtime install (it is bundled). esbuild
  stays a build-time-only dependency (ADR-0002/0003).

## Alternatives considered

- **Render the board from inside the styleguide canvas** (add a live board to
  `styleguide/app/`). Rejected: the canvas is a **gated design-system artifact**; wiring it
  to the live `/api/tree` runtime would blur the gate and put agentic-workflow application
  logic inside design-system's source. The styleguide ships *patterns*, not the live app.
- **Fork the Kanban components into `dashboard/app/`** and feed them live data. Rejected
  outright — it is the exact drift ADR-0003's single-source rule exists to prevent.
- **A second esbuild bundle** (keep the canvas entry, add a dashboard entry). Rejected as
  premature: the canvas is served buildlessly from its own `index.html` (ADR-0003); the
  committed `dist/` has one job — serve the dashboard. One entry, retargeted, is simplest.
- **Leave `dist/` on the canvas and overlay live data at runtime.** Rejected: there is no
  app to overlay, and runtime data-injection into a showcase is a worse seam than a real
  app that consumes the components.

## Scope note

This ADR records the **decision and the seam**. The board view, the `board-data` transform,
and the app shell are built by **agentic-workflow-006**; the build-retarget is the single
sanctioned edit to infrastructure's `build.mjs`. The slide-over (aw-007) and navigation
(aw-008) extend this shell and are out of aw-006's scope.
