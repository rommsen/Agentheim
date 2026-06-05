---
id: ADR-0005
title: Styleguide buildless view factory — htm tagged templates + import map (no JSX shipped)
scope: design-system
status: accepted
date: 2026-06-06
related_tasks: [design-system-002, infrastructure-002]
supersedes: []
related_adrs: [ADR-0003]
---

# ADR-0005: Styleguide buildless view factory — htm tagged templates + import map

## Context

ADR-0003 locked the architecture: one ES-module source of truth for the styleguide,
two consumers — a **buildless reviewable canvas** (native `<script type="module">` +
import map, **no `@babel/standalone` at runtime**) and an **esbuild-bundled dashboard
dist** (infrastructure-002). It explicitly left one implementation choice open for
design-system-002 to settle:

> JSX must NOT be shipped to the browser via a runtime Babel compile — either author
> the browser-loaded modules without JSX (e.g. `React.createElement` / `htm`) or
> transform JSX by the canvas's own buildless means.

The styleguide is ~1,800 lines of view code across 11 modules. Two questions had to be
answered concretely: (1) how are views authored without runtime JSX, and (2) how do the
bare specifiers (`react`, `react-dom/client`, `marked`) resolve in the buildless canvas.

## Decision

### Views are authored with `htm` tagged templates, not JSX, not raw `createElement`

Every module imports a shared `html` tag (`app/html.js`, which is
`htm.bind(React.createElement)`) and writes views as
`` html`<${Component} prop=${x}>...<//>` ``. htm parses the template **at runtime in the
browser with no compile step** (no Babel) and is equally consumable by esbuild as a plain
function call, so **the exact same source** feeds both consumers — the single-source
invariant ADR-0003 protects.

- Rejected **raw `React.createElement`**: a faithful, readable 1,800-line rewrite into
  nested `createElement(...)` calls is error-prone and far less reviewable than the
  JSX-shaped htm templates — and the canvas's whole purpose is to stay *reviewable*.
- Rejected **keeping JSX + any in-browser transform**: that is precisely the
  `@babel/standalone` runtime compile ADR-0003 forbids.

### Bare specifiers resolve via an import map to pinned esm.sh URLs

The canvas (`styleguide/index.html`) carries an `<script type="importmap">` mapping
`react`, `react-dom/client`, `marked`, and `htm` to pinned **esm.sh** module URLs
(`react@18.3.1`, `marked@12.0.2`, `htm@3.1.1`). esm.sh serves real ESM and resolves
React's transitive deps against the same map. This keeps the canvas openable with no
toolchain (same network-at-view-time posture design-system-001 already had with unpkg),
while the bundler consumer (infrastructure-002) resolves the identical bare specifiers
from its own `node_modules` at build time.

### One entry module mounts the app for both consumers

`app/app.js` exports `App` and ends with a `document`-guarded
`createRoot(#root).render(html\`<${App}/>\`)` bootstrap. The canvas loads it directly
(`<script type="module" src="app/app.js">`); esbuild uses the same file as its entrypoint.
The guard keeps the module import-safe under SSR/bundler tooling that has no DOM.

## Consequences

**Positive**
- No JSX and no Babel are shipped to the browser; the canvas opens with zero toolchain.
- One source feeds canvas and bundle — no drift, honoring ADR-0003's single-source rule.
- Views stay JSX-shaped and reviewable (htm reads close to JSX).

**Negative**
- htm has small syntax differences from JSX that are easy to get wrong and do **not**
  fail `node --check` (they fail only at render): fragments must be
  `` html`<${Fragment}>…<//>` `` (bare `<>…</>` throws "Invalid tag"); closing tags use
  the universal `<//>`. A render-time smoke test is the guard, not the parser.
- Version pins now live in two places (the canvas import map and infrastructure-002's
  bundle inputs) and must track the same versions to stay faithful (already noted in
  ADR-0003).

**Neutral**
- esm.sh is the chosen CDN for the canvas import map; swapping CDNs is a one-line change
  per specifier and does not affect the source modules.

## Verification

design-system-002 validated the migration without a human by rendering the full `App`
tree server-side (`react-dom/server.renderToString`) against the real `app/*.js` modules:
194 KB of HTML, all sections 01–10 present, kanban tickets, status chips, the library
tree, and the `marked`-rendered ADR (tables, code blocks, blockquotes) all produced with
no thrown errors. The builder's visual re-approval (the styleguide gate) remains a
separate, human step owned by the gate — see design-system-002 Outcome.
