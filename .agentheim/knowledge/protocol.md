# Protocol

Chronological log of everything that happens in this project.
Newest entries on top.

---

## 2026-06-05 -- Task verified and completed: infrastructure-001 - Decide the dashboard runtime

**Type:** Work / Task completion
**Task:** infrastructure-001 - Decide the dashboard runtime — Node static+JSON transport, launch/stop, project discovery
**Summary:** Recorded ADR-0002 — Node-stdlib (no deps/install), `127.0.0.1`-only HTTP transport; single detached `launch.mjs` on an ephemeral port recorded in `.agentheim/.dashboard/runtime.json`; explicit stop (kill-by-pid + clear runfile, Windows `taskkill` fallback); project discovery by walking up for `.agentheim/` with absolute-root path validation; write endpoint delegates to `applyTaskMove` (transport-only, never decides legality).
**Verification:** PASS (iteration 1)
**Commit:** <pending>
**Files changed:** 2 (ADR-0002, infrastructure README)
**Tests added:** 0 (decision task)
**ADRs written:** ADR-0002 (0002-dashboard-runtime-transport.md)
**Scope:** decision-only this run (builder decision); implementation + its acceptance criteria deferred to agentic-workflow-001.

---

## 2026-06-05 -- Batch started: [infrastructure-001]

**Type:** Work / Batch start
**Tasks:** infrastructure-001 - Decide the dashboard runtime — Node static+JSON transport, launch/stop, project discovery
**Parallel:** no (1 worker)
**Scope note:** Builder set scope to **decision-only** this run — deliver ADR-0002 + infra README. The implementation acceptance criteria (running server, write endpoint delegating to `applyTaskMove`) defer to agentic-workflow-001, since agentic-workflow-003 (`applyTaskMove`) and the pre-bundled assets are not yet built.

---

## 2026-06-05 -- Task verified and completed: agentic-workflow-002 - Decide dashboard write-semantics

**Type:** Work / Task completion
**Task:** agentic-workflow-002 - Decide dashboard write-semantics — legal Task moves, shared move logic, concurrency
**Summary:** Recorded ADR-0001 — v1 UI card moves are Promote-only (`backlog→todo`) honoring the styleguide/`depends_on` frontend gate; all other transitions rejected with domain reasons; a single shared `applyTaskMove` is mandated as the sole lifecycle writer; optimistic concurrency via `from`+mtime precondition with refetch-on-reject.
**Verification:** PASS (iteration 1)
**Commit:** 526aa12
**Files changed:** 2 (ADR-0001, agentic-workflow README)
**Tests added:** 0 (decision task)
**ADRs written:** ADR-0001 (0001-dashboard-write-semantics.md)

---

## 2026-06-05 -- Batch started: [agentic-workflow-002]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-002 - Decide dashboard write-semantics — legal Task moves, shared move logic, concurrency
**Parallel:** no (1 worker) — sequenced ahead of infrastructure-001 to avoid first-ADR collision in an empty decisions/ dir

---

## 2026-06-05 -- Modeling / Refined: dependency edge infrastructure-002 → agentic-workflow-001

**Type:** Modeling / Refine
**BC:** infrastructure, agentic-workflow
**Status after:** backlog (both)
**Summary:** Builder decision: `infrastructure-002` (pre-bundle the dashboard assets)
**blocks** the dashboard. The dashboard ships pre-bundled from day one — the in-browser-Babel
canvas is not an acceptable v1. Recorded both ways: `infrastructure-002.blocks =
[agentic-workflow-001]`; `agentic-workflow-001.depends_on` gains `infrastructure-002` (now
five deps: infrastructure-001, agentic-workflow-002, agentic-workflow-003, design-system-001
[done], infrastructure-002).
**ADRs written:** none

---

## 2026-06-05 -- Modeling / Captured: infrastructure-002 - Pre-bundle the dashboard's frontend assets

**Type:** Modeling / Capture
**BC:** infrastructure
**Filed to:** backlog
**Summary:** Captured the reconciliation surfaced while delivering the styleguide as its own
task. Turn the dashboard's frontend (React/JSX + `marked`, currently CDN + in-browser Babel)
into committed, pre-bundled static assets — production React build, no runtime CDN fetch, no
in-browser compile, still no install step to run. The production-build counterpart to
`infrastructure-001`'s "committed build output is the asset set" policy. Build mechanism left
as the one open choice (vendor+precompile vs real bundler). depends_on infrastructure-001 +
design-system-001; deliberately not added to agentic-workflow-001's depends_on yet (avoid
over-gating — that edge gets settled when the dashboard is refined).

---

## 2026-06-05 -- Modeling / Completed: design-system-001 - Dashboard styleguide (builder-approved)

**Type:** Modeling / Refine (gate closed)
**BC:** design-system
**Status after:** done (backlog → done)
**Summary:** Builder reviewed and **approved** the delivered styleguide artifact
(`contexts/design-system/styleguide/`). The styleguide gate is now **open** — frontend tasks
in any BC may be promoted (each still subject to its own other dependencies). Final
acceptance criterion (builder review) ticked; task moved to `done/`, INDEX counts and README
updated (gate open). No git commit recorded here — files were added in this session and will
be committed with the rest of the working tree.

---

## 2026-06-05 -- Modeling / Refined: design-system-001 - Dashboard styleguide (artifact delivered)

**Type:** Modeling / Refine
**BC:** design-system
**Status after:** backlog (delivered, pending builder review — the styleguide gate)
**Summary:** The four open design axes (aesthetic, density, light/dark, framework) were
resolved on the design side via Claude Design and handed off as a bundle. Direction locked:
content-first dev tool ("Linear precision, Notion calm, Vercel restraint"), **dark-first +
light toggle**, comfortable density, **React** components, JetBrains Mono IDs (`AGH-128` /
`ADR-0007`), inline-SVG icons, color used only for ticket status + content type — derived
from the Ledger design system. Implemented the styleguide artifact into
`contexts/design-system/styleguide/`: `index.html` canvas + `styles/colors_and_type.css` &
`styles/agentheim.css` (token source of truth) + `app/*.jsx` reference components (kanban,
slide-over drawer, markdown reading surface, file-tree nav, foundations docs). Ticked all
ACs except the **builder-review gate**, which is the human approval that opens frontend
work. Reconciled with infrastructure-001: ships as plain static assets (no `node_modules` /
no install) ✓, but the canvas loads React+Babel-standalone+marked from unpkg and compiles
JSX in-browser — flagged that the dashboard (agentic-workflow-001) should vendor/pre-bundle
the committed build output rather than ship in-browser Babel.
**Split into:** none
**ADRs written:** none

---

## 2026-06-05 -- Modeling / Promoted: infrastructure-001 + agentic-workflow-002

**Type:** Modeling / Promote
**BC:** infrastructure, agentic-workflow
**From → To:** backlog → todo
**Summary:** Promoted the two dashboard decision tasks once refined — `infrastructure-001`
(runtime/transport) and `agentic-workflow-002` (write-semantics). Both carry full ADR
drafts, concrete acceptance criteria, and no unmet dependencies; neither is frontend, so
the styleguide gate doesn't apply. `agentic-workflow-003` (applyTaskMove extraction) stays
in backlog until 002 is worked; `agentic-workflow-001` (dashboard) and `design-system-001`
(styleguide) remain in backlog behind their gates.

---

## 2026-06-05 -- Brainstorm (extension): added the infrastructure bounded context

**Type:** Brainstorm
**Outcome:** vision extended
**BCs identified:** infrastructure (new)
**Summary:** Stood up `contexts/infrastructure/` the doctrinal way (brainstorm, not a
model-spawned BC), triggered by the dashboard runtime decision (agentic-workflow-002)
surfacing Agentheim's first real runtime. Scoped **tightly to the dashboard
web-server runtime/transport** at the builder's request — other cross-cutting tech
(plugin packaging, eval harness, shared tooling) folds in only if/when it appears, not
pre-emptively. README records the **transport-vs-meaning** boundary with agentic-workflow:
infrastructure supplies the transport (server, launch, static serving, project discovery,
raw write endpoints) as supplier; agentic-workflow owns what a write *means* (Task
lifecycle transitions + invariants + concurrency), with infrastructure conformist to
those rules. Classification: supporting (generic-leaning). No architect run, no
decision/spike/styleguide tasks emitted here — those belong to the 002 relocation back in
`modeling`. Top-level index bc-list updated.
**ADRs written:** none (the transport ADR comes via the relocated 002 decision task)
**Foundation tasks emitted:** none — narrow extension; the runtime decision task already
exists (agentic-workflow-002) and relocates to infrastructure/ next, in `modeling`.

---

## 2026-06-05 -- Modeling / Refined: agentic-workflow-002 - Dashboard runtime decision (split)

**Type:** Modeling / Refine
**BC:** agentic-workflow (+ infrastructure)
**Status after:** backlog (all three decision/refactor tasks; ready to promote)
**Summary:** Refined the dashboard runtime decision via the orchestrator (architect +
tactical-modeler lenses). Locked inputs: Node assumed present → Node-stdlib static+JSON
server, no deps/no install; v1 is interactive but capped at the **smallest write surface
— a single legal UI move, `backlog→todo` (Promote)**; all other moves stay skill-driven
(`doing→done` rejected to protect *one task = one commit*). The decision split along the
transport-vs-meaning seam: transport relocated to the new infrastructure BC; write-meaning
stayed here. Reconciled 001 (dropped its "read-only for v1" framing; now interactive
Promote-only) and fixed design-system-001's stale stack reference (→ infrastructure-001).
**Split into:**
- `infrastructure-001` (decision) — runtime/transport: server, cross-platform launch/stop,
  `.agentheim/` discovery, dumb `POST /api/task/move`. ADR draft in Notes.
- `agentic-workflow-002` (decision, retitled) — write-semantics: legal-move policy,
  shared mover, optimistic concurrency. ADR draft in Notes.
- `agentic-workflow-003` (refactor, NEW) — extract `applyTaskMove`, the single shared
  Task-lifecycle mover both skills and the dashboard call. depends_on: 002.
**Dependency rewiring:** agentic-workflow-001.depends_on = [infrastructure-001,
agentic-workflow-002, agentic-workflow-003, design-system-001].
**ADRs written:** none committed (two ADR drafts sit in task Notes; `work` commits them
when the decision tasks are executed).

---

## 2026-06-05 -- Modeling / Captured: dashboard feature + styleguide gate + runtime decision

**Type:** Modeling / Capture
**BC:** agentic-workflow (+ new design-system BC)
**Filed to:** backlog
**Summary:** Captured a new `dashboard` skill/command — a local web server serving a UI
over the project's `.agentheim/` folder: a Kanban board of tasks across lifecycle columns,
a Notion-style right-hand slide-over as the universal markdown detail view (tasks, READMEs,
vision, context map, research, ADRs), and discoverable navigation. Three tasks created:
agentic-workflow-001 (dashboard feature) depending on agentic-workflow-002 (type:decision —
web-server stack & launch mechanism, ADR output) and design-system-001 (styleguide). This is
Agentheim's first UI-bearing feature, so a new supporting `design-system` BC was created to
hold the styleguide gate, and the agentic-workflow README records the frontend gate +
relationship. The dashboard also introduces the first runtime into a previously
markdown-only plugin, which the decision task makes explicit.

---

## 2026-06-05 -- Brainstorm: vision for Agentheim itself

**Type:** Brainstorm
**Outcome:** vision created
**BCs identified:** none yet (context map deferred — see Summary)
**Summary:** Socratic session documenting the existing Agentheim plugin as a vision.
Established that Agentheim is now a building tool only (teaching/workshop use dropped;
the six modes survive as model-quality instruments). Acute pain named: an agreeable
agent that produces shallow domain work at speed. Confirmed five non-goals. Surfaced
the recurring "adversarial fresh-context gate" motif (verifier + research-reviewer) as
deliberate design. Logged three open questions: brainstorm-on-existing-code (next
iteration, build via skill-creator), the research-review branch/registry merge gap, and
the stale "workshop use" framing in references/modes.md.
**ADRs written:** none
**Foundation tasks emitted:** skipped — mature existing project, no greenfield
foundation pass (no running app, no frontend). Context-map + BC modeling offered to
user as the next step rather than auto-generated.

---
