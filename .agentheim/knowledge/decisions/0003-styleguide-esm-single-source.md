---
id: ADR-0003
title: Styleguide as ES-module single source — buildless canvas, esbuild-bundled dashboard
scope: design-system
status: proposed
date: 2026-06-05
related_tasks: [design-system-002, infrastructure-002, agentic-workflow-001]
---

# ADR-0003: Styleguide as ES-module single source — buildless canvas, esbuild-bundled dashboard

## Context

The approved styleguide (`design-system-001`, done) is the reviewed visual language all
Agentheim UI conforms to. Today it is **11 global-script JSX files** (~1,800 lines under
`styleguide/app/`) loaded via `<script type="text/babel" src=...>`, with
React / ReactDOM / `@babel/standalone` / `marked` pulled from the unpkg CDN and JSX
**compiled in-browser**. The files have no module boundaries: each declares top-level
`const`/`function` symbols (`TICKETS`, `LIBRARY`, `Icon`, `Markdown`, `ThemeCtx`,
`describeItem`, …) that other files reference by bare name, plus a few explicit
`window.X = …` / `Object.assign(window, {…})` exports and `window.marked` at the leaves.

The dashboard (`agentic-workflow-001`), served by the infrastructure runtime
(ADR-0002), must ship this same UI as **committed, pre-bundled static assets**: no
network at view time, React's *production* build, no in-browser Babel compile on first
paint. ADR-0002 already fixed the serving contract: *"the UI's committed build output
**is** the asset set,"* with no runtime bundler.

That leaves two coupled, still-open questions:

1. **How does the styleguide canvas itself load** once we stop using in-browser Babel?
   It must stay **buildless and reviewable** — a builder can open `index.html` and read
   the source, with no toolchain between them — because it is a *gated* artifact
   (the styleguide gate: the canvas is reviewed and approved before any BC builds UI).
2. **How is the dashboard bundle produced** from that source, so there is exactly **one
   source of truth** for tokens and component patterns rather than a styleguide copy and
   a separately-maintained dashboard copy that can drift?

The builder has **locked** two answers that this ADR records the architecture for:
the build mechanism is a **real bundler** (not vendor+precompile), and the **single
source of truth is the styleguide migrated to ES modules** — so the canvas and the
dashboard bundle are produced from the same files.

The governing constraints (inherited): **no install step to *run*** the dashboard
(ADR-0002), and **the canvas stays reviewable** (the styleguide gate). A build-time
toolchain is acceptable; a run-time install is not.

## Decision

### One source: the styleguide migrated to native ES modules

Refactor the 11 `styleguide/app/*.jsx` files from global scripts into **ES modules** with
explicit `import` / `export`. Every cross-file symbol becomes a named export and an
explicit import; the `window.X = …` / `Object.assign(window, …)` exports and the
implicit-global references are removed. `const { useState } = React` becomes a real
import of React; `window.marked` becomes an imported `marked`. This is the **single
source of truth** — both consumers below are produced from these same files.

### Consumer 1 — the canvas stays buildless (native ESM + import map, no Babel)

The styleguide canvas (`styleguide/index.html`) loads the ES-module source **directly in
the browser** via `<script type="module">`, with an **import map** resolving the bare
specifiers (`react`, `react-dom/client`, `marked`) to URLs. JSX is **not** used in the
shipped-to-browser canvas path — it is either authored without JSX or transformed by the
canvas's own buildless means; the binding constraint is **no `@babel/standalone` at
runtime and no required toolchain to open the canvas**. The canvas remains something a
reviewer opens and reads; this is what keeps the styleguide *gate* meaningful.

> Re-approval is required. Changing the canvas's load mechanism and refactoring all 11
> source files **reopens the approved `design-system-001` artifact**. The migrated canvas
> must re-pass the **styleguide gate** — builder review and explicit approval — before the
> gate is considered open against the new source. This is owned by **design-system-002**.

### Consumer 2 — the dashboard bundle, via esbuild, committed to dist

The dashboard's asset set is produced from the same ES-module source by **esbuild**:
a single build invocation that resolves the imports, transforms JSX at build time,
**bundles React / ReactDOM / `marked` in** (so there is no runtime CDN fetch), selects
React's **production** build, minifies, and writes a committed `dist/`. That committed
output is exactly what ADR-0002's static handler serves — **no install step to run**.
Owned by **infrastructure-002**.

**Why esbuild, not Vite/Rollup.** This is a single page, ~1,800 lines, three runtime
dependencies, no dev-server / no HMR requirement, and the deliverable is a committed
static `dist/`. Vite's value (dev server, HMR, plugin ecosystem, framework integrations)
is unused here, and it pulls a larger build-time dependency tree. esbuild is a single,
fast tool that does JSX-transform + bundle + minify in one step and emits precisely the
committed artifact ADR-0002 asks for — the **smallest legible build-time toolchain** that
honors the zero-install-to-*run* spirit. (Rollup alone needs a JSX plugin chain; Vite is
Rollup-plus-more. Both are heavier than the job.) esbuild is a **build-time** dependency
only — it never ships and is never installed to *run* the dashboard.

### The seam

- **design-system** owns the **source** (the ES-module styleguide) and the **buildless
  reviewable canvas**, and the **gate** (re-approval). If the dashboard never existed,
  this migration would still be a coherent design-system improvement — so it lives here.
- **infrastructure** owns the **build pipeline** (esbuild config) and the **committed
  dist** that its static handler serves. It consumes the design-system source; it does
  not own it.
- The single-source rule is the invariant both sides protect: **tokens and component
  patterns exist once**, in the styleguide source; the dashboard bundle is a derived
  artifact, never a hand-maintained copy.

## Consequences

**Positive**

- One source of truth — the dashboard cannot drift from the approved styleguide, because
  it is *built from* it, not copied.
- The canvas stays buildless and reviewable, so the styleguide gate stays meaningful.
- The dashboard loads offline, fast (no in-browser Babel), on React's production build.
- esbuild is a single small build-time tool; nothing is installed to *run* the dashboard.

**Negative**

- The approved `design-system-001` artifact is **reopened**: all 11 files are refactored
  and the canvas must be **re-reviewed and re-approved** through the styleguide gate.
- A build-time toolchain (esbuild) now exists where there was none; its committed `dist/`
  must be rebuilt and re-committed whenever the source changes (a build-discipline cost,
  paid by infrastructure-002's pipeline, not by the runtime).
- Two load paths from one source (buildless canvas + bundled dist) must be kept honest —
  the canvas and the dashboard must render the same components from the same files.

**Neutral**

- React/ReactDOM/`marked` version pins move from CDN URLs (canvas import map) and bundle
  inputs (dist) — both must track the same versions to stay faithful.

## Alternatives considered

- **Vendor + precompile, no bundler** (commit React/ReactDOM/`marked` locally + one-shot
  JSX transform). Closest to "no toolchain," but **rejected by the builder** in favor of a
  real bundler for the dashboard's component count and ergonomics.
- **Vite.** Viable, but its dev-server/HMR/plugin value is unused for a single committed
  page, at the cost of a heavier build-time dependency tree. Rejected as over-tooled.
- **Rollup (bare).** Needs a JSX/plugin chain to match esbuild's one-step transform; more
  config for no benefit here. Rejected.
- **Keep two copies** (styleguide canvas as-is + a separate hand-maintained dashboard
  bundle). Rejected: guarantees drift between the approved styleguide and the shipped UI —
  the exact failure the single-source rule exists to prevent.
- **Bundle the canvas too** (drop the buildless canvas). Rejected: would put a toolchain
  between a reviewer and the styleguide, hollowing out the gate.

## Scope note

This ADR records the **decision and the seam only**. The ESM migration of the source and
the buildless-canvas re-approval are executed by **design-system-002**; the esbuild
pipeline and committed `dist/` are executed by **infrastructure-002**, which depends on
design-system-002. The dashboard (`agentic-workflow-001`) consumes the committed dist.
