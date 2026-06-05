# Protocol

Chronological log of everything that happens in this project.
Newest entries on top.

---

## 2026-06-06 -- Work session ended

**Type:** Work / Session end
**Completed:** 4 (first-try PASS: 3, re-dispatched: 1, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 4 (9b09b3e aw-004, 58fafcf ds-002, 2378b0b aw-003, 1e192ba infra-003)
**ADRs written:** ADR-0004 (server cwd), ADR-0005 (styleguide htm), ADR-0006 (SSE live-update; supersedes-in-part ADR-0002), ADR-0007 (task-move side-effect boundary) — all BC-scoped, none global.
**Open items for the builder:**
- **design-system-002 styleguide gate is CLOSED pending visual re-approval** — open styleguide/index.html, check sections 05–10 + the live kanban→drawer demo (open/close, Esc, theme toggle), then re-approve. The migration is committed but the gate stays closed until sign-off.
- **aw-004 POSIX leg** — run `node dashboard/launch.mjs` + stop once on a POSIX OS (verified on Windows only).
**Note:** Two batches. ADR numbering: infra-003's earmarked "ADR-0004" was renumbered to ADR-0006 (0004/0005 taken by batch-1 workers). todo/ and doing/ now empty across all BCs; the dashboard cluster's four foundations (server, applyTaskMove, SSE transport, styleguide ESM source) are landed — aw-005/006/007/008/009 + infrastructure-002 remain in backlog.

---

## 2026-06-06 -- Task verified and completed: infrastructure-003 - Dashboard live-update transport

**Type:** Work / Task completion
**Task:** infrastructure-003 - Dashboard live-update transport (SSE endpoint + .agentheim file-watcher)
**Summary:** Added GET /api/events (SSE) on the existing stdlib server, backed by an .agentheim/ file-watcher (recursive fs.watch + debounced poll fallback) that pushes debounced, path-validated {type:"tree-changed", path} pointers. ADR-0006 records the decision and supersedes-in-part ADR-0002's request/response-only clause.
**Verification:** PASS (iteration 1) — full dashboard suite 37/37 green (no regression to aw-004's tests)
**Commit:** 1e192ba
**Files changed:** 10 (watcher.mjs, events.mjs, server.mjs, 2 tests, dashboard README, ADR-0006, ADR-0002 banner, infra README)
**Tests added:** 9 (SSE + watcher)
**ADRs written:** ADR-0006 (0006-dashboard-live-update-sse.md)

---

## 2026-06-06 -- Task verified and completed: agentic-workflow-003 - Extract applyTaskMove

**Type:** Work / Task completion
**Task:** agentic-workflow-003 - Extract applyTaskMove (one shared Task-lifecycle mover)
**Summary:** Extracted applyTaskMove into lib/task-lifecycle.mjs — the single mover enforcing the legal-move policy, the depends_on frontend gate, status-matches-folder, and the optimistic precondition, returning structured rejections. ADR-0007 settles the side-effect boundary: the mover owns only the move; INDEX/protocol side-effects stay with the skills.
**Verification:** PASS (iteration 1) — 11/11 tests green
**Commit:** 2378b0b
**Files changed:** 4 (lib/task-lifecycle.mjs + test, ADR-0007, agentic-workflow README)
**Tests added:** 11 (legal promote, illegal move, blocked depends_on, stale precondition, +more)
**ADRs written:** ADR-0007 (0007-task-move-side-effect-boundary.md)

---

## 2026-06-06 -- Batch started: [agentic-workflow-003, infrastructure-003]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-003 - Extract applyTaskMove (one shared Task-lifecycle mover); infrastructure-003 - Dashboard live-update transport (SSE endpoint + .agentheim file-watcher → ADR-0006)
**Parallel:** yes (2 workers)
**Note:** Batch 2 of the session. infra-003's decision output renumbered ADR-0004 → ADR-0006 (0004/0005 were taken by aw-004 and ds-002 in batch 1). aw-003 builds the shared mover but does NOT wire the dashboard's POST /api/task/move (that is aw-009); infra-003 adds the SSE route to aw-004's committed server — disjoint files, no conflict.

---

## 2026-06-06 -- Task verified and completed: design-system-002 - Migrate the styleguide to ES modules

**Type:** Work / Task completion
**Task:** design-system-002 - Migrate the styleguide to ES modules (buildless htm + import-map canvas, single source)
**Summary:** Migrated the 11 global-script JSX files to native ES modules (explicit import/export, no window globals, no in-browser Babel); views authored with htm tagged templates so no JSX ships to the browser; canvas rewired to load buildlessly via import map. Tokens untouched. ADR-0005 records the htm view-factory choice.
**Verification:** PASS (iteration 2 — iteration 1 failed on two wrong-ADR in-source citations; fixed)
**Commit:** 58fafcf
**Files changed:** ~24 (11 .jsx → 12 .js incl. new html.js, index.html, BC README, ADR-0005)
**Tests added:** 0 (visual artifact — verified via module-graph + render sanity check)
**ADRs written:** ADR-0005 (0005-styleguide-htm-buildless-viewfactory.md)
**Open gate:** criterion 8 (builder visual re-approval of the migrated canvas) remains a HUMAN gate — styleguide gate stays CLOSED pending the builder opening styleguide/index.html and signing off. Unblocks infrastructure-002.

---

## 2026-06-06 -- Verification failed: design-system-002 - Migrate the styleguide to ES modules

**Type:** Work / Verification failure
**Task:** design-system-002 - Migrate the styleguide to ES modules
**Iteration:** 1 of 3
**Reasons:** Two in-source comments (styleguide/index.html, app/html.js) cited the wrong ADR — "ADR-0004" (agentic-workflow's unrelated cwd decision) instead of ADR-0005 (the htm/import-map decision). Criteria 1–7 otherwise passed.
**Iteration hint:** likely-fixable
**Next:** re-dispatched worker (fixed both citations; passed on iteration 2)

---

## 2026-06-06 -- Task verified and completed: agentic-workflow-004 - Dashboard server bootstrap

**Type:** Work / Task completion
**Task:** agentic-workflow-004 - Dashboard server bootstrap (stdlib HTTP, detached launch/stop, project discovery)
**Summary:** Built the dashboard runtime skeleton per ADR-0002 — Node-stdlib-only HTTP server (static + health check, no deps/install) that launches detached on 127.0.0.1 with an ephemeral port, writes a gitignored runfile, stops by pid with reuse-or-replace, and discovers the project root by walking up for .agentheim/ while validating every served path.
**Verification:** PASS (iteration 1)
**Commit:** 9b09b3e
**Files changed:** 14 (dashboard/ runtime + 28 tests, .gitignore, ADR-0004)
**Tests added:** 28 (all passing)
**ADRs written:** ADR-0004 (0004-dashboard-detached-process-cwd.md — neutral cwd for the detached process)
**Residual:** acceptance criterion 5's POSIX launch/stop leg is verified on Windows only — builder to run launch+stop once on a POSIX OS to close it.

---

## 2026-06-06 -- Batch started: [agentic-workflow-004, design-system-002]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-004 - Dashboard server bootstrap (stdlib HTTP, detached launch/stop, project discovery); design-system-002 - Migrate the styleguide to ES modules (buildless canvas, single source) + re-approval
**Parallel:** yes (2 workers)
**Note:** aw-003 held to next batch (shares the agentic-workflow README with aw-004); infrastructure-003 held to next batch (its SSE endpoint plugs into the server aw-004 builds).

---

## 2026-06-06 -- Modeling / Promoted: agentic-workflow-004 + infrastructure-003

**Type:** Modeling / Promote (batch)
**BC:** agentic-workflow, infrastructure
**From → To:** backlog → todo (both)
**Summary:** Promoted the two unblocked roots of the new dashboard DAG. **agentic-workflow-004**
(server bootstrap — stdlib HTTP, detached launch/stop, project discovery) and **infrastructure-003**
(SSE endpoint + `.agentheim/` file-watcher → ADR-0004). Both depend only on infrastructure-001
(done) and carry concrete, testable acceptance criteria. The other four aw children + the epic
stay in backlog (blocked on aw-004/005/006, ds-002, infra-002). todo/ now holds 3 tasks
(aw-003, aw-004, infrastructure-003).

---

## 2026-06-06 -- Modeling / Refined: agentic-workflow-001 - Dashboard (decomposed into an epic + 6 children)

**Type:** Modeling / Refine
**BC:** agentic-workflow (+ infrastructure)
**Status after:** backlog (all)
**Summary:** Cornered the two open questions on the dashboard umbrella feature and decomposed it.
Two builder decisions locked: (1) **live-update, not refresh-only** — the board reflects
skill-driven file moves in near-real-time; the push channel is a *new infrastructure concern*
(SSE + `.agentheim/` file-watcher on the existing stdlib server), so a new **infrastructure-003**
owns it and records **ADR-0004** superseding ADR-0002's request/response-only clause. (2)
**Multiple BCs on the board** — first chosen as swimlanes, then **reversed to a flat board with
the BC shown on each card** (the approved `KanbanBoard` used as-is; a proposed `design-system-003`
swimlane-pattern task was dropped, no styleguide re-approval needed). agentic-workflow-001 rewritten
as a thin **epic/integration gate** depending on its six children; leaf deps pushed down onto the
child that consumes each. `blocks` re-wired on aw-003, ds-002, infra-001, infra-002.
**Split into:** agentic-workflow-004 (server bootstrap), -005 (read API), -006 (flat board view),
-007 (slide-over + renderer), -008 (navigation), -009 (SSE live-update + Promote); infrastructure-003
(SSE + file-watcher transport). agentic-workflow-001 retained as the epic.
**ADRs written:** none yet — ADR-0004 is the output of infrastructure-003 when worked (decision task).

---

## 2026-06-05 -- Modeling / Promoted: design-system-002 + agentic-workflow-003

**Type:** Modeling / Promote (batch)
**BC:** design-system, agentic-workflow
**From → To:** backlog → todo (both)
**Summary:** Promoted the two ready leaves after the infrastructure-002 refinement.
**design-system-002** (styleguide ESM migration + buildless canvas + re-approval) — only dep
`design-system-001` is done/approved, so the styleguide gate is satisfied. **agentic-workflow-003**
(extract `applyTaskMove`) — only dep `agentic-workflow-002` is done. Both carry concrete, testable
acceptance criteria. `infrastructure-002` stays in backlog (now blocked on design-system-002);
`agentic-workflow-001` stays in backlog (still multi-dep + unsplit). todo/ now holds 2 tasks.

---

## 2026-06-05 -- Modeling / Refined: infrastructure-002 - Pre-bundle the dashboard's frontend assets

**Type:** Modeling / Refine
**BC:** infrastructure, design-system
**Status after:** backlog (both tasks)
**Summary:** Settled infrastructure-002's one open choice — the build mechanism. Two builder
decisions locked: (1) **real bundler** (esbuild, chosen by the architect over Vite/Rollup for a
single ~1,800-line page, 3 deps, committed-`dist`, no dev-server need); (2) **single source of
truth = migrate the styleguide itself to ES modules** (the current 11 global-script JSX files
couple via implicit globals). Because the ESM migration reopens the *done/approved*
`design-system-001` artifact and changes the styleguide gate (canvas must re-pass review), the
work **split across BCs**: a new `design-system-002` owns the ESM migration + buildless
import-map canvas + re-approval; `infrastructure-002` narrows to "bundle the ESM source →
committed dist (esbuild)" and now `depends_on` design-system-002. ADR-0003 records the
single-source / two-consumer architecture (scope: design-system).
**Split into:** design-system-002 (new); infrastructure-002 retitled + narrowed
**ADRs written:** ADR-0003 (0003-styleguide-esm-single-source.md, scope design-system, proposed)

---

## 2026-06-05 -- Work session ended

**Type:** Work / Session end
**Completed:** 2 (first-try PASS: 2, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 2 (526aa12 agentic-workflow-002, fd486c7 infrastructure-001)
**Note:** The two dashboard decision tasks were run sequentially (not parallel) to avoid a first-ADR collision in an empty `decisions/` dir. infrastructure-001 was scoped decision-only by builder choice — its implementation acceptance criteria defer to agentic-workflow-001. todo/ is now empty across all BCs.

---

## 2026-06-05 -- Task verified and completed: infrastructure-001 - Decide the dashboard runtime

**Type:** Work / Task completion
**Task:** infrastructure-001 - Decide the dashboard runtime — Node static+JSON transport, launch/stop, project discovery
**Summary:** Recorded ADR-0002 — Node-stdlib (no deps/install), `127.0.0.1`-only HTTP transport; single detached `launch.mjs` on an ephemeral port recorded in `.agentheim/.dashboard/runtime.json`; explicit stop (kill-by-pid + clear runfile, Windows `taskkill` fallback); project discovery by walking up for `.agentheim/` with absolute-root path validation; write endpoint delegates to `applyTaskMove` (transport-only, never decides legality).
**Verification:** PASS (iteration 1)
**Commit:** fd486c7
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
