---
id: infrastructure-002
title: Pre-bundle the dashboard's frontend assets (committed build output, drop in-browser Babel)
status: backlog
type: chore
context: infrastructure
created: 2026-06-05
completed:
commit:
depends_on: [infrastructure-001, design-system-001]
blocks: [agentic-workflow-001]
tags: [dashboard, build, bundling, static-assets, frontend, runtime]
related_adrs: []
related_research: []
prior_art: []
---

## Why

The approved styleguide (`design-system-001`) ships as a self-contained canvas that loads
React + ReactDOM + Babel-standalone + `marked` from the unpkg CDN and compiles its JSX
**in-browser**. That was right for a reviewable styleguide, but it is the wrong shape for the
dashboard the transport actually serves: it needs the network at view time, ships React's
*development* build, and pays an in-browser Babel compile on every load (slow first paint).

`infrastructure-001` already set the policy this resolves against: assets are served as plain
static files with **no `node_modules` / no install step**, and *"if the UI needs a build,
that build's committed output is the asset set."* This task is the production-build
counterpart — turn the styleguide's source into a committed, fast, offline-capable static
asset set the infrastructure static handler serves.

## What

Produce the dashboard's frontend as **committed, pre-bundled static assets** — no in-browser
Babel, no runtime CDN fetch of the framework — while keeping the styleguide's tokens and
component patterns byte-for-byte faithful. The bundle is what `infrastructure-001`'s static
handler serves from the plugin-relative asset root.

The build mechanism is the one open choice (see Notes). Whatever is chosen, its **committed
output** is the asset set; the build itself must not become a required install step to *run*
the dashboard.

## Acceptance criteria

- [ ] The dashboard's JS is pre-compiled (no `<script type="text/babel">` / no
      Babel-standalone at runtime); JSX is transformed at build time.
- [ ] React/ReactDOM (and `marked`) are vendored or bundled into the committed asset set —
      the dashboard loads and renders with **no network access** at view time.
- [ ] React's production build is used (not `react.development.js`).
- [ ] Launching the dashboard still requires **no install step** to run: the committed build
      output is served directly by `infrastructure-001`'s static handler.
- [ ] The rendered UI is visually identical to the approved styleguide — same tokens
      (`styleguide/styles/*.css`) and component patterns; the styleguide canvas remains the
      source of truth.
- [ ] First paint is materially faster than the in-browser-Babel canvas (no compile step on
      load).

## Notes

- **Open choice — the build mechanism.** Candidates, cheapest-first:
  1. **Vendor + precompile, no bundler** — commit React/ReactDOM/`marked` as local static
     files and pre-transform the JSX to plain JS (a one-shot transform), keeping the
     "no toolchain" spirit closest.
  2. **Real bundler** (esbuild / Vite / Rollup) with the built `dist/` committed — best
     ergonomics for the dashboard's component count; adds a dev-time toolchain (build-time
     only, not a run-time install).
  3. Hybrid. Settle this when the task is worked; it may extend `infrastructure-001`'s ADR
     or get a short ADR of its own rather than re-deciding the runtime.
- **Relationship to the dashboard (`agentic-workflow-001`).** This is the production asset
  pipeline for that feature, and it **blocks** it (builder decision, 2026-06-05): the
  dashboard ships pre-bundled from day one — the in-browser-Babel canvas is not an
  acceptable v1. The edge is recorded both ways (`blocks: [agentic-workflow-001]` here;
  `infrastructure-002` added to the dashboard's `depends_on`).
- **Depends on:** `infrastructure-001` (fixes where assets live and how they're served) and
  `design-system-001` (the source tokens/components to bundle — done, approved 2026-06-05).
- Surfaced as the reconciliation note while delivering `design-system-001`; captured here so
  it doesn't live only in a task note.
