# Protocol

Chronological log of everything that happens in this project.
Newest entries on top.

---

## 2026-06-09 -- Modeling / Refined: design-system-004 - Animated "actively working" treatment for doing-column tickets

**Type:** Modeling / Refine
**BC:** design-system
**Status after:** todo
**Summary:** Interrogator pass on the raw capture. Cornered three forks against the styleguide's "quiet by default, color only signals status" law: (1) Intensity → **calm ambient pulse** (low-amplitude breathing on the ochre rail), not the capture's literal rotating/glowing background — extends the law rather than breaking it; loud option explicitly declined. (2) Scope → **all doing-status cards** (status-driven, keyed off `ticket.status === "doing"`, not the `agent` field) — the `/api/tree` disk projection can't truthfully know a worker is live, so "in `doing/`" is the honest proxy. (3) Reduced-motion → **plain card** (ordinary ochre rail, no static-glow fallback); pulse is pure progressive enhancement. Settled placement as a finding, not a fork: lives in the styleguide `TicketCard` (`styleguide/app/kanban.js`); dashboard inherits via the unforked import (`board.js:37`, ADR-0003) with zero dashboard-side change. Wrote Why + What + 8 testable AC; added a `--duration-ambient` motion-token requirement (first loop token; styleguide has no `@keyframes` today). Left exact pulse mechanism / token value / keyframes-vs-transition to the worker as TDD-time implementation. Added `depends_on: [design-system-001]` (styleguide gate, OPEN). Promoted backlog → todo.
**Split into:** none
**ADRs written:** none yet — a short ADR (ambient-motion-as-status-signal principle + `--duration-ambient` token + reduced-motion-strips-to-plain contract) specified as a worker deliverable, bidirectionally linked back to ds-004.

---

## 2026-06-09 -- Modeling / Refined: agentic-workflow-015 - Show the project name next to "Agentheim" in the dashboard header

**Type:** Modeling / Refine
**BC:** agentic-workflow
**Status after:** todo
**Summary:** Cornered three ambiguities in Interrogator mode. (1) Display: `Agentheim · <project>` — project name muted/smaller, separator-dot treatment, no new styleguide pattern. (2) Data path: extend the `/api/tree` projection (`dashboard/tree.mjs`) with a `project: { name }` field parsed server-side from `vision.md`'s `# Vision:` heading — one fetch, rides SSE, follows the aw-013 `mtimeMs` precedent; flagged it as the first projection field drawn from a markdown *body* (one trimmed string, body-free contract from ADR-0002 holds). (3) Fallback: missing/headingless vision → show "Agentheim" only (loss-tolerant). Sharpened to 7 testable AC across projection / header / tests. Noted the shell-sources-the-name implementation choice (only `DashboardBoard` fetches `/api/tree` today). Added `depends_on: [design-system-001]` (frontend gate, met). Promoted backlog → todo.
**Split into:** none
**ADRs written:** none (projection-field extension consistent with existing precedent; no standalone ADR warranted)

---

## 2026-06-09 -- Modeling / Promoted: agentic-workflow-014 - Group Kanban board columns by bounded context (collapsible)

**Type:** Modeling / Promote
**BC:** agentic-workflow
**From → To:** backlog → todo

---

## 2026-06-09 -- Modeling / Refined: agentic-workflow-014 - Group Kanban board columns by bounded context (collapsible)

**Type:** Modeling / Refine
**BC:** agentic-workflow
**Status after:** backlog
**Summary:** Interrogator pass on the raw capture. Cornered three forks: per-column toggle (not board-wide); collapsible BC sections (not contiguous runs); persist view-state across reloads — and the builder extended that to the existing column-sort too. Surfaced the flat-board tension (ADR-0009) and reframed grouping as an optional per-column *view lens* over the same read model. The persistence ask **reverses** ADR-0009's "in-session view-state only, no localStorage" clause and amends agentic-workflow-012's sort behavior — specified as a worker-written ADR-0009 addendum (infrastructure-010 precedent). Wrote Why + What + 13 testable acceptance criteria, a new pure `board-group.js` transform (project→sort→group), styleguide-gate `depends_on: [design-system-001]`, prior_art [aw-006, aw-012], related_adrs [0009]. Flagged the open styleguide-component question (reuse `TreeGroup` collapsible vs board-local + design-system capture) for the worker to settle during TDD. Considered splitting the sort-persistence flip into its own task; kept as one commit (shared localStorage store). Left in backlog pending promote decision.
**Split into:** none
**ADRs written:** none yet (ADR-0009 addendum specified as worker deliverable)

---

## 2026-06-08 14:40 -- Release shipped: v0.8.4

**Type:** Release
**Version:** 0.8.3 → 0.8.4 (patch — infrastructure-010: env-independent `/dashboard` launcher resolver, fixing the empty-`$CLAUDE_PLUGIN_ROOT` field failure that made the dashboard unlaunchable from consumer projects)
**Manifest:** `.claude-plugin/plugin.json` bumped, committed `9b8d783` (`chore(release): v0.8.4`)
**Pushed to main:** yes (`99179c6..9b8d783` on `origin/main`)
**Tag:** `v0.8.4` (annotated) → `9b8d783`, pushed to origin
**GitHub Release:** deferred (gh unavailable — `gh release create` line handed to builder)

---

## 2026-06-08 14:36 -- Work session ended

**Type:** Work / Session end
**Completed:** 1 (first-try PASS: 1, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 1 (f74cd97 infrastructure-010)
**Note:** Only ready task was infrastructure-010. Three backlog items remain unrefined (agentic-workflow-014, agentic-workflow-015, design-system-004) — not ready work; need `modeling` to refine/promote.

---

## 2026-06-08 14:35 -- Task verified and completed: infrastructure-010 - $CLAUDE_PLUGIN_ROOT empty at /dashboard runtime

**Type:** Work / Task completion
**Task:** infrastructure-010 - $CLAUDE_PLUGIN_ROOT is empty at /dashboard runtime — 008's fix collapses to the broken project path
**Summary:** Replaced the empty-`$CLAUDE_PLUGIN_ROOT` `/dashboard` launcher locator with an env-var-independent resolver (`dashboard/resolve-launcher.mjs`) that derives the plugin cache from `os.homedir()`, picks newest version by **semver** (not lexical), fails loud, and spawns `launch.mjs` cwd-inherited so foreign-project discovery still resolves. Card now uses a minimal env-free `node -e` bootstrap delegating to the resolver.
**Verification:** PASS (iteration 1)
**Commit:** f74cd97
**Files changed:** 9
**Tests added:** resolve-launcher.test.mjs (semver-max incl. 0.8.10>0.8.9 trap, homedir→cache on win32+POSIX, fail-loud, repo-local short-circuit); foreign-launch.test.mjs amended to DELETE the env var from the child; command-card guard updated. Full dashboard suite 150/150 green.
**ADRs written:** 0002-dashboard-runtime-transport.md (addendum — env-independent locator contract)
**Caveat:** Installed-plugin end-to-end run + cross-shell `node -e` quoting confirmable only by the maintainer post-release (repo-bound worker cannot observe a real Claude Code `/dashboard` invocation). Flagged, not falsely claimed verified.

---

## 2026-06-08 14:20 -- Batch started: [infrastructure-010]

**Type:** Work / Batch start
**Tasks:** infrastructure-010 - $CLAUDE_PLUGIN_ROOT empty at /dashboard runtime — env-independent Node resolver
**Parallel:** no (1 worker — sole ready task)

---

## 2026-06-08 14:10 -- Modeling / Refined: infrastructure-010 - $CLAUDE_PLUGIN_ROOT empty at /dashboard runtime

**Type:** Modeling / Refine
**BC:** infrastructure
**Status after:** todo
**Summary:** Routed to claude-code-guide (platform ground truth) + orchestrator/architect (mechanism). Confirmed `$CLAUDE_PLUGIN_ROOT` is doc-gapped for command-card Bash calls and empirically empty on Windows; decided fix is a stdlib Node resolver (`dashboard/resolve-launcher.mjs`) that derives the cache path from `os.homedir()`, picks newest version by SEMVER (not lexical), fails loudly, and spawns the real launcher with cwd inherited (script-in-cache + cwd-in-project preserved). Sharpened to 11 testable acceptance criteria; infrastructure-009 test seam to be amended to delete the env var from the child. Flagged one worker-settles-empirically open question (the `node -e` bootstrap that locates the resolver itself has the same chicken-and-egg) and a verification-realism caveat: a repo-bound worker can build + simulate but only the maintainer can confirm end-to-end as an installed plugin post-release (the exact gap that let 008 ship broken). ADR-0002 addendum to be written by the worker. Promoted backlog → todo.
**Split into:** none
**ADRs written:** none yet (ADR-0002 addendum specified as worker deliverable)

---

## 2026-06-08 14:00 -- Modeling / Captured: infrastructure-010 - $CLAUDE_PLUGIN_ROOT empty at /dashboard runtime

**Type:** Modeling / Capture
**BC:** infrastructure
**Filed to:** backlog
**Summary:** Real v0.8.3 run from a foreign project (jump_n_rogue/dorc) proves infrastructure-008's central assumption false: `$CLAUDE_PLUGIN_ROOT` comes through **empty** in the /dashboard command's Bash context, so the `${VAR:-.}` fallback collapses to the project path and reproduces the exact module-not-found error 008 set out to fix. Captured as a distinct follow-up bug (008 is done, not re-openable). Mechanism — resolve the launcher without relying on the env var — left to refinement.

---

## 2026-06-08 13:35 -- Release shipped: v0.8.3

**Type:** Release
**Version:** 0.8.2 → 0.8.3 (patch — infrastructure-009 test seam, no new user-facing capability)
**Manifest:** `.claude-plugin/plugin.json` bumped, committed `635cca5` (`chore(release): v0.8.3`)
**Pushed to main:** yes (`dc48448..635cca5` on `origin/main`) — this is what moves marketplace users off "already at latest"
**Tag:** `v0.8.3` (annotated) → `635cca5`, pushed to origin
**Note:** origin still points at the old lowercase URL (`heimeshoff/agentheim`); GitHub redirected to `heimeshoff/Agentheim` and both push + tag-push succeeded. Worth updating the remote URL at some point.

---

## 2026-06-08 13:30 -- Capture / Captured: agentic-workflow-015 - Show the project name next to "Agentheim" in the dashboard header

**Type:** Capture
**BC:** agentic-workflow
**Filed to:** backlog
**Summary:** Dashboard header should show the current project's name (from vision.md) next to the word "Agentheim".

---

## 2026-06-08 13:05 -- Work session ended

**Type:** Work / Session end
**Completed:** 1 (first-try PASS: 1, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 1 (ac9ae4d infrastructure-009)
**Note:** A parallel capture session ran concurrently — new backlog items agentic-workflow-014 and design-system-004 were filed mid-run (backlog only, not ready work).

---

## 2026-06-08 13:04 -- Task verified and completed: infrastructure-009 - Command-card invocation test seam

**Type:** Work / Task completion
**Task:** infrastructure-009 - Add a test seam for slash-command card invocation (catch project-relative launcher paths)
**Summary:** Added a committed stdlib-only test seam guarding the /dashboard launcher invocation against the project-relative-path regression class — a static guard over commands/dashboard.md (three verbs plugin-rooted, no cd, no bare printed hint, with Red-proof meta-tests) plus a foreign-project integration test that runs the literal card command form launch→status→stop in a temp .agentheim/-only project, asserts the runfile lands under the consumer project, and tears down in finally. The infrastructure-008 hand-run simulation is now permanent.
**Verification:** PASS (iteration 1)
**Commit:** ac9ae4d
**Files changed:** 4 (command-card.test.mjs, foreign-launch.test.mjs, test/helpers/card.mjs, infrastructure BC README)
**Tests added:** new command-card + foreign-launch suites; full dashboard suite 132/132 green
**ADRs written:** none (makes the existing ADR-0002 contract testable; no new decision)

---

## 2026-06-08 12:00 -- Capture / Captured: agentic-workflow-014 - Group Kanban board columns by bounded context (collapsible)

**Type:** Capture
**BC:** agentic-workflow
**Filed to:** backlog
**Summary:** Add a group-by/ungroup-by-bounded-context button next to the board's sort combo box; grouped sections are collapsible.

---

## 2026-06-08 13:00 -- Capture / Captured: design-system-004 - Animated "actively working" treatment for doing-column tickets

**Type:** Capture
**BC:** design-system
**Filed to:** backlog
**Summary:** Doing-column tickets should have an animated/glowing/rotating background so it's visually obvious work is actively happening; exact visual idea still open.

---

## 2026-06-08 13:00 -- Batch started: [infrastructure-009]

**Type:** Work / Batch start
**Tasks:** infrastructure-009 - Add a test seam for slash-command card invocation (catch project-relative launcher paths)
**Parallel:** no (1 worker — sole ready task)

---

## 2026-06-08 12:48 -- Modeling / Refined: infrastructure-009 - Command-card invocation test seam

**Type:** Modeling / Refine
**BC:** infrastructure
**Status after:** todo
**Summary:** Refined the infrastructure-008 TDD-skip follow-up. Cornered the one open decision — the "and/or" test scope — and committed to **both** approaches: a stdlib-only static guard (parse `commands/dashboard.md`, assert plugin-rooted prefix on all three verbs + no `cd`) **and** a foreign-project integration test (temp project with only `.agentheim/`, run the real launch→status→stop via `${CLAUDE_PLUGIN_ROOT}`, assert the runfile lands under it, clean up in `finally`). Also extended the static guard to the launcher's printed hint strings (the `/dashboard stop` correction 008 made). Acceptance criteria split to 5 concrete bullets; teardown/cross-platform risk noted for the worker. Promoted backlog → todo — ready to work.
**Split into:** none
**ADRs written:** none (makes an existing ADR-0002 contract testable; no new decision)

---

## 2026-06-08 12:42 -- Work session ended

**Type:** Work / Session end
**Completed:** 1 (first-try PASS: 1, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 1 (a702143 infrastructure-008)

---

## 2026-06-08 12:42 -- Task verified and completed: infrastructure-008 - Dashboard command launcher path

**Type:** Work / Task completion
**Task:** infrastructure-008 - Dashboard command must invoke the launcher by plugin path, not project-relative
**Summary:** `/dashboard` now invokes the launcher by its plugin-rooted path (`node "${CLAUDE_PLUGIN_ROOT:-.}/dashboard/launch.mjs"`) for all three verbs while keeping the consumer project as cwd, so launch/stop/status work in a foreign project with no module-not-found error and no manual plugin-cache spelunking. The `:-.` fallback covers a run from the Agentheim repo itself.
**Verification:** PASS (iteration 1)
**Commit:** a702143
**Files changed:** 4 (commands/dashboard.md, dashboard/launch.mjs, dashboard/README.md, infrastructure BC README) + new backlog item infrastructure-009
**Tests added:** 0 (command-card change; no command-card test infra — backlog item infrastructure-009 filed to add it; behavior exercised via end-to-end simulation, existing dashboard suite 124/124 green)
**ADRs written:** none (natural consequence of ADR-0002's walk-up-from-cwd discovery clause; documented in both READMEs, sibling to infrastructure-004)

---

## 2026-06-08 12:36 -- Batch started: [infrastructure-008]

**Type:** Work / Batch start
**Tasks:** infrastructure-008 - Dashboard command must invoke the launcher by plugin path, not project-relative
**Parallel:** no (1 worker — sole ready task)

---

## 2026-06-08 -- Modeling / Captured: infrastructure-008 - Dashboard command launcher path

**Type:** Modeling / Capture
**BC:** infrastructure
**Filed to:** todo
**Summary:** Captured from a real foreign-project session: `/agentheim:dashboard` ran the command card's `node dashboard/launch.mjs` from the consumer project root and hit `Cannot find module '...\dorc\dashboard\launch.mjs'` — the launcher ships with the plugin, not the project, forcing manual plugin-cache spelunking and version-guessing. The command-invocation sibling of infrastructure-004 (which fixed the launcher's *internal* module-relative asset resolution): the project-root assumption survives one layer up at the slash-command → launcher seam. Fix direction: invoke the launcher by plugin path (likely `${CLAUDE_PLUGIN_ROOT}`), keeping cwd in the consumer project so `.agentheim/` discovery still works; worker to verify command-body interpolation. Prior art: infrastructure-004, infrastructure-001; governing ADR-0002.

---

## 2026-06-08 -- Work session ended (resumed)

**Type:** Work / Session end
**Completed:** 1 (infrastructure-007 — first-try PASS) — this resumed leg, after the builder authorized the full release
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 1 (6e69b80 infrastructure-007) — landed on `main` via fast-forward merge of feature branch `Marketplace-update-not-working`.
**Release:** **SHIPPED** (builder authorized the merge-to-main path). The work was found on feature branch `Marketplace-update-not-working` (5 ahead of local `main`; local `main` was 11 ahead of `origin/main`); fast-forwarded the branch into `main` and pushed (`c0f835a..8020832`, 16 commits). Cut annotated tag **`v0.8.2`** at the bump commit `6e69b80` and pushed it — remote `refs/tags/v0.8.2` → `6e69b80`. Manifest now 0.8.2 > 0.8.0, so `/plugin` offers the update (off "already at latest"). Published `v0.8.1` tag left untouched.
**Notes:** all todo/ and doing/ are empty across every BC. Feature branch `Marketplace-update-not-working` is fully merged into `main` (safe to delete).

---

## 2026-06-08 -- Task verified and completed: infrastructure-007 - Bump plugin version to 0.8.2

**Type:** Work / Task completion
**Task:** infrastructure-007 - Bump plugin version to 0.8.2 + cut v0.8.2 tag to unblock marketplace updates
**Summary:** Bumped the sole version source `.claude-plugin/plugin.json` 0.8.0 → 0.8.2, correcting the bump skipped when `v0.8.1` was tagged. Repo-wide check confirmed no other version reference must agree (`marketplace.json` has none; no CHANGELOG/badge).
**Verification:** PASS (iteration 1) — manifest reads 0.8.2, no other field changed, no second version source; worker-satisfiable core only (tag/push are the orchestrator release act).
**Commit:** 6e69b80 (merged to `main`; pushed)
**Release tag:** v0.8.2 — annotated, at `6e69b80`, pushed to origin (`refs/tags/v0.8.2` → `6e69b80`). Manifest 0.8.2 now live on `origin/main`.
**Files changed:** 1 (`.claude-plugin/plugin.json`)
**Tests added:** 0 (manifest bump)
**ADRs written:** none (mechanics per ADR-0013 / RELEASE.md)

---

## 2026-06-08 -- Batch started: [infrastructure-007]

**Type:** Work / Batch start
**Tasks:** infrastructure-007 - Bump plugin version to 0.8.2 + cut v0.8.2 tag to unblock marketplace updates
**Parallel:** no (1 worker — picked up after the builder authorized the full release, incl. the tag-cut + push the task flagged as a builder act)

---

## 2026-06-08 -- Work session ended

**Type:** Work / Session end
**Completed:** 2 (first-try PASS: 2, re-dispatched: 0, skipped: 0) — agentic-workflow-013 then agentic-workflow-012
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 2 (9a0db2d aw-013, 19e5870 aw-012) on `main`
**Notes:**
- Ran the DAG in two sequential waves: aw-013 (read-model mtime) had to land before aw-012 (board sort), which depended on it. Both verified PASS first try.
- A parallel `modeling`/`capture` session created **infrastructure-007** (bump plugin version 0.8.2 + cut v0.8.2 tag) mid-run; it prepended its own protocol/INDEX changes. Left untouched by this work run and **surfaced to the builder** — it is a release task whose tag-cut + push to `main` is a builder git act (per its own notes), not auto-dispatched.
- Uncommitted at session end (intentionally not swept into the task commits): `infrastructure/INDEX.md` + `infrastructure/todo/infrastructure-007-*.md` (the parallel modeling session's, awaiting the builder's release decision).

---

## 2026-06-08 -- Modeling / Captured: infrastructure-007 - Bump plugin version to 0.8.2 + cut v0.8.2 tag

**Type:** Modeling / Capture
**BC:** infrastructure
**Filed to:** todo
**Summary:** Tester reported `/plugin` stuck on *"already at latest"*. Verified: tag `v0.8.1` (main HEAD `6252320`) ships the `capture` skill + POSIX dashboard fixes, but `.claude-plugin/plugin.json` at that tag and on `main` still reads `0.8.0` — the manifest bump was skipped when v0.8.1 was tagged, so the marketplace never offers the update. Second occurrence of the drift `infrastructure-005` fixed, on the first release after ADR-0013 codified the discipline. Captured the immediate unblock only (builder-chosen shape: bump manifest `0.8.0 → 0.8.2` + cut a fresh `v0.8.2` tag, leaving the published `v0.8.1` untouched; mechanics per ADR-0013 / RELEASE.md). The reopen-the-checklist-vs-CI-guard decision was deliberately *not* captured. Tester's literal claim (main at 0.7.0, v0.8.1 not on main) was stale — corrected to 0.8.0 / v0.8.1-is-HEAD.

---

## 2026-06-08 -- Task verified and completed: agentic-workflow-012 - Add sorting options to Kanban board columns

**Type:** Work / Task completion
**Task:** agentic-workflow-012 - Add sorting options to Kanban board columns
**Summary:** Each board column gained an independent sort control (Name asc/desc, Modification-date desc/asc; default mod-date descending) rendered board-side as a sibling of the styleguide `ColumnHeader` (DragColumn precedent, no fork). Reordering is a pure, DOM-free `board-sort.js` comparator run after `treeToColumns`, derived at render so every live re-projection re-applies the choice; in-session view-state only (no localStorage); null `mtimeMs` sorts as oldest, ties break by id.
**Verification:** PASS (iteration 1) — all eight acceptance criteria mapped to tests/structural code; full dashboard suite 124 pass / 0 fail; styleguide `kanban.js` confirmed unforked.
**Commit:** 19e5870
**Files changed:** 7 (`board-sort.js` + test, `board.js`, `board-data.js` + test, `dist/app.js` rebuilt, BC README)
**Tests added:** 14 (12 comparator + 2 mtime pass-through)
**ADRs written:** none (mtime within ADR-0002; board-side affordance within ADR-0003/0009)

---

## 2026-06-08 -- Batch started: [agentic-workflow-012]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-012 - Add sorting options to Kanban board columns
**Parallel:** no (1 worker — sole ready task; unblocked now that aw-013 + design-system-001-styleguide are both done)

---

## 2026-06-08 -- Task verified and completed: agentic-workflow-013 - Carry task file modification time (mtimeMs) in the /api/tree projection

**Type:** Work / Task completion
**Task:** agentic-workflow-013 - Carry task file modification time (mtimeMs) in the /api/tree projection
**Summary:** `/api/tree` projection (`projectTask` in `dashboard/tree.mjs`) now carries each task file's `mtimeMs` as additive per-task metadata; a stat failure degrades to `mtimeMs: null` without aborting the walk — unblocking aw-012's mod-date-descending board sort.
**Verification:** PASS (iteration 1) — all five acceptance criteria covered; full dashboard suite 110 pass / 0 fail.
**Commit:** 9a0db2d
**Files changed:** 2 (`dashboard/tree.mjs`, `dashboard/test/tree.test.mjs`)
**Tests added:** 2 (numeric mtimeMs present; unstattable file → mtimeMs null)
**ADRs written:** none (mtime is metadata within ADR-0002's pointers+metadata contract)

---

## 2026-06-08 -- Batch started: [agentic-workflow-013]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-013 - Carry task file modification time (mtimeMs) in the /api/tree projection
**Parallel:** no (1 worker — sole ready task; aw-012 blocked on aw-013)

---

## 2026-06-08 -- Modeling / Promoted: agentic-workflow-013 + agentic-workflow-012

**Type:** Modeling / Promote
**BC:** agentic-workflow
**From → To:** backlog → todo (both)
**Note:** aw-013 (tree-projection mtime) is unblocked — its only dep, aw-005, is done. aw-012 (board column sorting) is ready but blocked by aw-013; `work` resolves the DAG, so aw-012 won't be claimed until aw-013 lands.

---

## 2026-06-08 -- Modeling / Refined: agentic-workflow-012 - Add sorting options to Kanban board columns

**Type:** Modeling / Refine
**BC:** agentic-workflow
**Status after:** backlog (both tasks; ready to promote)
**Summary:** Interrogated the raw capture. Builder's answers: Why = surface recently-touched work (validates the mod-date-desc default); Scope = per-column independent sort; Persistence = reset to default each load, no localStorage. Two scouted findings drove the shape — (A) the `/api/tree` projection carries no file mtime, so the default sort is impossible from the current read model; (B) the styleguide `ColumnHeader` has no sort slot and ADR-0003 forbids forking it. Orchestrator (tactical-modeler + architect) resolved: split the mtime read-model change into its own task (shared contract, own commit), and render the sort control board-side as a sibling of `ColumnHeader` (the `DragColumn` precedent — no fork, no design-system task). Rewrote aw-012 with concrete acceptance criteria (per-column independent, reset-to-default, live-update re-apply, deterministic tie-breaks, pure comparator module) as a frontend-only task depending on aw-013 + design-system-001-styleguide.
**Split into:** agentic-workflow-013 (Carry task file modification time (mtimeMs) in the /api/tree projection — type: refactor, depends_on aw-005, blocks aw-012)
**ADRs written:** none (mtime is metadata within ADR-0002's pointers+metadata contract; board-side affordance governed by existing ADR-0003 — no new ADR warranted)

---

## 2026-06-08 -- Capture / Captured: agentic-workflow-012 - Add sorting options to Kanban board columns

**Type:** Capture
**BC:** agentic-workflow
**Filed to:** backlog
**Summary:** Board columns should be sortable by name (asc/desc) and last file modification date; default = modification date descending.

---

## 2026-06-08 -- Work session ended

**Type:** Work / Session end
**Completed:** 1 (first-try PASS: 1, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 1 (e6ded37 infrastructure-006) — on branch `POSIX-dashboard-fixes`
**Notes:**
- infrastructure-006 (plugin release discipline) landed: ADR-0013 + top-level `RELEASE.md` + infrastructure README pointer. Verified PASS iteration 1.
- Orchestrator stripped stray tool-call markup (`</content>`/`</invoke>`) the worker accidentally wrote into the tail of both the ADR and `RELEASE.md` before commit — cosmetic, no criterion impact, flagged by the verifier.
- **All todo/ and doing/ are now empty across every BC.** Nothing left ready.
- Untouched pre-existing working-tree state (not part of this run): `skills/capture/` and `skills/capture-workspace/` (untracked) — surfaced to the builder for a separate decision.

---

## 2026-06-08 -- Task verified and completed: infrastructure-006 - Plugin release discipline

**Type:** Work / Task completion
**Task:** infrastructure-006 - Plugin release discipline — stop the manifest version from silently drifting
**Summary:** Recorded the release policy as ADR-0013 — a release is the deliberate act of cutting a `vX.Y.Z` git tag matching the sole version source (`plugin.json` `version`), enforced by a documented checklist (CI guard and commit-derived versioning weighed and rejected). Shipped the discoverable top-level `RELEASE.md` (bump → commit → push to `main` → tag, with push-to-`main` named as the step that actually moves marketplace users off "already at latest") and pointed the infrastructure BC README at it.
**Verification:** PASS (iteration 1) — all six acceptance criteria covered; orchestrator stripped stray tool-markup the worker leaked into the tail of the ADR and RELEASE.md before commit.
**Commit:** e6ded37
**Files changed:** 3 (ADR-0013, RELEASE.md, infrastructure README)
**Tests added:** 0 (doc-only decision task)
**ADRs written:** 0013-plugin-release-discipline.md

---

## 2026-06-08 -- Batch started: [infrastructure-006]

**Type:** Work / Batch start
**Tasks:** infrastructure-006 - Plugin release discipline — stop the manifest version from silently drifting
**Parallel:** no (1 worker — sole ready task)

---

## 2026-06-08 -- Modeling / Refined: infrastructure-006 - Plugin release discipline

**Type:** Modeling / Refine
**BC:** infrastructure
**Status after:** todo (promoted backlog → todo)
**Summary:** Cornered the decision direction with the builder. Chosen: a **documented
release checklist** (CI guard and commit-derived versioning weighed and rejected), bump
triggered at **deliberate releases** = cutting a `vX.Y.Z` git tag (manifest may lag `main`
between releases), checklist bound to the tag act so the bump can't be skipped. Recon
recorded: only `plugin.json` carries a version (`marketplace.json` has none); no CI/hooks
today but a GitHub remote exists. Rewrote acceptance criteria — output is ADR + a
discoverable `RELEASE.md` checklist + BC README pointer; no follow-up tooling task
(enforcement is doc-only). Promoted to todo.
**Split into:** none
**ADRs written:** none (the ADR is this task's deliverable, written when worked)

---

## 2026-06-08 -- Work session ended (resumed)

**Type:** Work / Session end
**Completed:** 1 (agentic-workflow-010 — verification skipped: human-verified spike) — this resumed leg
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 1 (06f0ac0 agentic-workflow-010) — on branch `POSIX-dashboard-fixes`
**Notes:**
- Resumed after the builder confirmed the POSIX contributor re-ran the infrastructure-004 fix and the foreign-project asset path now serves on POSIX. That closed agentic-workflow-010's last (environmental) criterion, so the spike moved backlog/todo → done.
- **All todo/ and doing/ are now empty across every BC.** Session total across both legs: 3 tasks completed (infrastructure-004, infrastructure-005, agentic-workflow-010), 0 bounced, 0 failed, 0 escalated.
- Open follow-up still in backlog: **infrastructure-006** (plugin release discipline) — needs a refine pass before it is workable. Not part of this run.

---

## 2026-06-08 -- Task completed (verification skipped): agentic-workflow-010 - Dashboard cross-OS verification (POSIX leg)

**Type:** Work / Task completion
**Task:** agentic-workflow-010 - Dashboard cross-OS verification — POSIX leg
**Summary:** Closed the spike. Windows + POSIX parity confirmed: the macOS leg passed clean except the one divergence it existed to catch (`defaultAssetRoot` 404 on a foreign project), which was carved to infrastructure-004, fixed module-relative (716c7f0), and re-verified on POSIX by the contributor with the fix in place. No ADR addendum — infra-004 restored the ADR-0002/0004 contract rather than shifting it. BC README left unchanged (verification status belongs in the task Outcome + protocol, not the domain-model README).
**Verification:** SKIPPED — spike completion; the substantive verification was performed by a human POSIX contributor, and the only change is the task file's own outcome bookkeeping (no code / ADR diff to audit).
**Commit:** 06f0ac0
**Files changed:** 1 (the task file)

---

## 2026-06-08 -- Batch started: [agentic-workflow-010]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-010 - Dashboard cross-OS verification (POSIX leg)
**Parallel:** no (1 worker — closing the spike now that its infra-004 blocker is fixed and the POSIX contributor confirmed the foreign-project re-check)

---

## 2026-06-08 -- Work session ended

**Type:** Work / Session end
**Completed:** 2 (first-try PASS: 2, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 2 (716c7f0 infrastructure-004, 41fabcb infrastructure-005) — on branch `POSIX-dashboard-fixes`
**Notes:**
- infrastructure-004 (assetRoot module-relative) and infrastructure-005 (version bump 0.8.0) both landed, each verified PASS on iteration 1. infrastructure todo/ + doing/ are now empty.
- **agentic-workflow-010 NOT dispatched.** Its blocker (infrastructure-004) is now fixed, so it is dependency-unblocked, but its sole remaining acceptance criterion — installed-plugin-against-a-foreign-project asset serving re-checked **on a POSIX box** — is environmental and cannot be satisfied from this Windows session. Left in todo for coordination with a POSIX contributor. Dispatching a Windows worker would only bounce.
- **Pre-existing uncommitted modeling state left untouched** (predates this session, belongs to the aw-010 refine / infra-004-005-006 capture): `.agentheim/contexts/agentic-workflow/INDEX.md` (M), the aw-010 backlog→todo move (`backlog/` deletion + new `todo/`), and the infrastructure-006 backlog task. Not part of this work run — surfaced to the builder for a separate commit decision.

---

## 2026-06-08 -- Task verified and completed: infrastructure-005 - Bump plugin version to 0.8.0

**Type:** Work / Task completion
**Task:** infrastructure-005 - Bump plugin version to 0.8.0 to unblock marketplace updates
**Summary:** Bumped `.claude-plugin/plugin.json` version 0.7.0 → 0.8.0 so `/plugin` stops reporting marketplace users as already-latest and ships the ~30 commits of accumulated dashboard/design-system/infrastructure work. No other manifest field changed; no other version reference in the repo to reconcile.
**Verification:** PASS (iteration 1) — manifest reads 0.8.0, sole field changed, valid JSON; criterion 3 (other version references) N/A.
**Commit:** 41fabcb
**Files changed:** 1
**Tests added:** 0
**ADRs written:** none

---

## 2026-06-08 -- Batch started: [infrastructure-005]

**Type:** Work / Batch start
**Tasks:** infrastructure-005 - Bump plugin version to 0.8.0 to unblock marketplace updates
**Parallel:** no (1 worker)

---

## 2026-06-08 -- Task verified and completed: infrastructure-004 - Resolve dashboard assetRoot relative to the module

**Type:** Work / Task completion
**Task:** infrastructure-004 - Resolve dashboard assetRoot relative to the module, not the project root
**Summary:** `defaultAssetRoot` now resolves dist/ module-relative (via import.meta.url) instead of against the discovered project root, so an installed plugin against a foreign project serves its committed assets (no false "dist absent" 404). Added a foreign-root regression test + AGENTHEIM_DASHBOARD_DIST dev override.
**Verification:** PASS (iteration 1) — dashboard suite 108/108, lib 13/13 green; all in-suite acceptance criteria met. POSIX foreign-project box re-check deferred to aw-010 (environmental).
**Commit:** 716c7f0
**Files changed:** 4
**Tests added:** 2
**ADRs written:** none

---

## 2026-06-08 -- Batch started: [infrastructure-004]

**Type:** Work / Batch start
**Tasks:** infrastructure-004 - Resolve dashboard assetRoot relative to the module, not the project root
**Parallel:** no (1 worker — infra-005 held to next wave to avoid a same-BC-README conflict)

---

## 2026-06-08 -- Modeling / Refined: agentic-workflow-010 - Dashboard POSIX cross-OS verification

**Type:** Modeling / Refine
**BC:** agentic-workflow
**Status after:** todo (promoted from backlog)
**Summary:** Reconciled the spike with reality — its "keep in backlog until a POSIX box is
available" premise was stale. A macOS contributor (protocol 2026-06-08) had already run the leg
to an effectively clean full pass; builder confirmed all six criteria were exercised. Rewrote the
task to re-state the macOS pass as confirmed (criteria checked) and narrow the residual to the one
divergence the leg surfaced: the `defaultAssetRoot` bug (now **infrastructure-004**). Added
`infrastructure-004` to `depends_on` (alongside aw-001) — aw-010 is not done until that fix lands
and the installed-plugin-against-foreign-project asset path is re-checked on POSIX. The final
re-check remains environmental (needs a POSIX box).
**Split into:** none (infra-004 / infra-005 were carved out in the prior capture, not this refine)
**ADRs written:** none

---

## 2026-06-08 -- Modeling / Captured: infrastructure-006 - Plugin release discipline

**Type:** Modeling / Capture
**BC:** infrastructure
**Filed to:** backlog
**Summary:** Spun out infrastructure-005's open process question into a `decision` task:
decide and ADR-record how plugin version bumps are governed (bump-on-feature policy /
release checklist / CI guard / combination) so the manifest stops drifting behind `main`.
Backlog — needs a refine pass (possibly `architect` on the CI-guard option) before todo.

---

## 2026-06-08 -- Modeling / Captured: infrastructure-004 + infrastructure-005 (from macOS POSIX-verification feedback)

**Type:** Modeling / Capture
**BC:** infrastructure
**Filed to:** todo (both)
**Summary:** A macOS contributor verifying agentic-workflow-010 (POSIX cross-OS leg)
reported two issues outside that spike's scope, captured here:
- **infrastructure-004** (bug) — `defaultAssetRoot` resolves `dist/` against the discovered
  project root, so the installed plugin can't find its built assets against a foreign
  project (404 "dist absent"). Fix: resolve module-relative (`import.meta.url`), like the
  sibling `launch.mjs`/`build.mjs`. Routed to infrastructure as a runtime/transport concern
  (sibling to infra-001/002, governed by ADR-0004), not agentic-workflow.
- **infrastructure-005** (chore) — `.claude-plugin/plugin.json` still on 0.7.0 while `main`
  is ~30 commits ahead; `/plugin` reports "already at latest" and marketplace users can't
  pull updates. Bump to 0.8.0. Left an open process question (release discipline) for a
  possible follow-up.
The same feedback confirms agentic-workflow-010's POSIX leg ran clean (detached launch,
runfile, SSE, /api/tree) — pending PR merge before that task is moved to done.

---

## 2026-06-07 -- Work session ended

**Type:** Work / Session end
**Completed:** 1 (first-try PASS: 1, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 1 (ca3a150 — aw-011 /dashboard slash command)
**Notes:**
- Single ready task (aw-011) → one worker, verified PASS on the first iteration. todo/ and
  doing/ are now empty across all BCs; backlog holds only aw-010 (POSIX cross-OS leg,
  `depends_on: [agentic-workflow-001]`).
- **Pre-existing uncommitted changes left untouched** (predate this session): `.agentheim/vision.md`
  and `references/modes.md` (the "stale framing" resolution from a prior session). Not part of
  aw-011 — deliberately not staged. Surfaced to the builder for a separate commit decision.
- **EOL-only noise:** `dashboard/dist/app.js` + `dashboard/dist/index.html` show as modified but
  the diff is LF→CRLF only (no content change); not attributed to aw-011, not committed.

---

## 2026-06-07 -- Task verified and completed: agentic-workflow-011 - /dashboard command

**Type:** Work / Task completion
**Task:** agentic-workflow-011 - /dashboard command — launch, stop, status, auto-open
**Summary:** Added the `/dashboard` slash command — the single documented exception to the
"phrasing, not slash commands" principle — as a thin `commands/dashboard.md` trigger over the
existing launcher (aw-004), extending `dashboard/launch.mjs` with a read-only `status` verb and
a cross-OS browser auto-open step (`start`/`open`/`xdg-open`), both confined to the launcher per
ADR-0002.
**Verification:** PASS (iteration 1) — verifier ran both suites green (dashboard 106/106 incl. 6
new tests, lib 13/13) and confirmed all six acceptance criteria, scope, and the BC-README
slash-command-exception documentation.
**Commit:** ca3a150
**Files changed:** 5 (launch.mjs, commands/dashboard.md, status-open.test.mjs, dashboard/README.md, BC README)
**Tests added:** 6
**ADRs written:** none

---

## 2026-06-07 -- Batch started: [agentic-workflow-011]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-011 - /dashboard command — launch, stop, status, auto-open
**Parallel:** no (1 worker)

---

## 2026-06-07 -- Modeling / Captured: agentic-workflow-011 - /dashboard command

**Type:** Modeling / Capture
**BC:** agentic-workflow
**Filed to:** todo
**Summary:** Captured a `/dashboard` command that drives the existing `dashboard/launch.mjs`
launcher (aw-004): launch (+ auto-open browser), stop, and a new status verb. Today the launcher
only runs via `node dashboard/launch.mjs`; this supplies the missing trigger. Filed straight to
todo (decisions settled, no UI authored → no styleguide gate). One ubiquitous-language change
required: document `/dashboard` as a deliberate slash-command exception to the "phrasing, not
slash commands" principle (builder decision 2026-06-07).

---

## 2026-06-06 -- Work session ended

**Type:** Work / Session end
**Completed:** 1 (first-try PASS: 1, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 3 (b1cf113 model: narrow aw-001 to Windows + carve aw-010; 8af5748 feature: close aw-001 epic; + SHA-backfill chore)
**Notes:**
- **aw-001 (the dashboard integration epic) is now done** — the dashboard cluster is fully
  closed. todo/ and doing/ are empty across all BCs.
- One mid-run modeling refinement: the epic's v1 acceptance bar was narrowed to Windows-only at
  the builder's decision (the integration pass ran from a Windows-only box); the POSIX cross-OS
  leg was carved into **agentic-workflow-010** (backlog, depends_on aw-001). Routed through a
  `model(...)` commit before dispatching the worker — `work` does not relax AC silently.
- **Pre-existing uncommitted changes left untouched** (predate this session, not mine): deleted
  backlog files aw-003 + infrastructure-002, modified infrastructure-001 (done), and untracked
  ADR-0003 (`0003-styleguide-esm-single-source.md`). Surfaced to the builder — they look like an
  earlier session's incomplete commit and need a human decision.

---

## 2026-06-06 -- Task verified and completed: agentic-workflow-001 - Dashboard (integration epic)

**Type:** Work / Task completion
**Task:** agentic-workflow-001 - Dashboard — local web UI over the project's .agentheim folder
**Summary:** Closed the dashboard integration epic on the Windows leg — all six children
(aw-004…009) confirmed done; verified end-to-end on Windows by running both suites green
(lib 13/13, dashboard 100/100) and live-launching the detached server against a throwaway temp
`.agentheim/` fixture, exercising `/api/tree` (200), `/api/doc` (200 + 403 traversal guard),
`/api/events` (200 SSE hello), `POST /api/task/move` backlog→todo (200, file moved) and an
illegal todo→done refused (422), then stopping cleanly. `dashboard` documented as a Key command.
**Verification:** PASS (iteration 1) — verifier independently re-ran both suites green, confirmed
the six children in done/, the README Key-command doc, and scope (README + task move only).
**Commit:** 8af5748
**Files changed:** 1 (BC README — Dashboard Key command)
**Tests added:** 0 (integration/verification epic; no runtime code changed)
**ADRs written:** none
**Note:** v1 bar was Windows-only by builder decision; the POSIX cross-OS leg is tracked in
agentic-workflow-010 (backlog, depends_on aw-001). No integration defect found.

---

## 2026-06-06 -- Batch started: [agentic-workflow-001]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-001 - Dashboard (local web UI over .agentheim — integration epic / gate)
**Parallel:** no (1 worker)
**Note:** Epic-closing integration pass. All six children (aw-004…009) are done; v1 bar was
narrowed to Windows-only this session (POSIX carved to aw-010). The worker runs the end-to-end
flow on Windows (launch → board → slide-over → live-update → Promote), documents `dashboard` as
a Key command of the BC, and closes the epic. Cross-OS/POSIX is explicitly out of scope here.

---

## 2026-06-06 -- Modeling / Refined: agentic-workflow-001 - Dashboard (integration epic)

**Type:** Modeling / Refine
**BC:** agentic-workflow
**Status after:** todo
**Summary:** Narrowed the epic's v1 acceptance bar to the builder's Windows box (settled builder
decision) because the integration pass runs from a Windows-only environment. The "and at least
one POSIX OS" cross-OS criterion was carved out into a new follow-up task; aw-001 stays in todo,
ready for `work`.
**Split into:** agentic-workflow-010 (Dashboard cross-OS verification — POSIX leg; backlog,
`depends_on: [agentic-workflow-001]`)
**ADRs written:** none

---

## 2026-06-06 -- Modeling / Promoted: agentic-workflow-001 - Dashboard (integration epic)

**Type:** Modeling / Promote
**BC:** agentic-workflow
**From → To:** backlog → todo
**Summary:** Promoted on builder request — the last remaining backlog ticket. Readiness confirmed:
its sole precondition ("all six children done": aw-004 server, aw-005 reads, aw-006 board,
aw-007 slide-over, aw-008 navigation, aw-009 live-update + Promote) is now met, and it carries
concrete integration/end-to-end acceptance criteria (launch → board → slide-over → live-update →
Promote, on Windows + one POSIX, `dashboard` documented as a Key command). Now ready for `work`
to run the end-to-end integration pass. **Note for the worker:** the POSIX leg of the end-to-end
flow (and aw-004's launch/stop) is so far verified on Windows only — the cross-OS criterion is
the substantive remaining work; may need the builder's hand on a POSIX box.

---

## 2026-06-06 -- Styleguide gate re-confirmed (design-system-003)

**Type:** Gate / Builder approval
**BC:** design-system
**Summary:** The builder re-confirmed the styleguide gate after `design-system-003` vendored the
webfonts offline — the only gated change was the token CSS `@import` → local `@font-face`, a
nil-visual-delta delivery swap. The gate stands **OPEN** against the now-fully-offline styleguide.
Recorded in the design-system README gate-status block and the ds-003 done file.

---

## 2026-06-06 -- Work session ended

**Type:** Work / Session end
**Completed:** 6 (first-try PASS: 6, re-dispatched: 0, skipped: 0)
**Bounced:** 0
**Failed:** 0
**Escalated after verification:** 0
**Commits:** 6 (e9a41cc ds-003, 21f0fe7 aw-005, 03e0b37 aw-006, ffda30f aw-007, 78c25e6 aw-008, 5cc5aac aw-009) + 1 SHA-backfill chore
**ADRs written:** ADR-0008 (vendored webfonts, design-system) · ADR-0009 (dashboard frontend app shell + build retarget) · ADR-0010 (slide-over doc-shaped item) · ADR-0011 (library = non-task half of the tree) · ADR-0012 (applyTaskMove slug-resolution + SSE re-fetch) — all BC-scoped, none global.
**Notes:**
- The **entire dashboard cluster (aw-005…009) is now done** + design-system-003. todo/ and doing/ are empty across all BCs. The dashboard renders the live board, the universal slide-over, the library/navigation, and is live-updating + Promote-writable — fully offline.
- ADR numbering: the ds-003 worker emitted its ADR as "0004" (collided with the existing cwd ADR); the orchestrator **renumbered it to ADR-0008** and fixed the refs before commit. No other collisions (0009–0012 all clean).
- **Latent bug fixed**: aw-009 found `applyTaskMove` (aw-003) assumed a bare `<id>.md` filename but real task files are `<id>-<slug>.md` — it would never have resolved a real task. Fixed + ADR-0012; lib + dashboard suites green (13 + 100).
- **Concept candidate** (escalated to builder): `dashboard-frontend-app` / `dashboard read-projection surfaces` — flagged by 2 workers (aw-007, aw-008), converging across ADR-0009/0010/0011 + aw-005/006/007/008. A synthesis page may be worth creating.
- **aw-001 (the dashboard integration epic) is now ripe to close** — all its children (aw-005…009) are done. It stays in backlog (its AC is "all children done + end-to-end flow works"); promoting/closing it is a modeling/builder call, not work.
- **Open for the builder:** the design-system styleguide gate re-opened lightly by ds-003 (token CSS edited — visual delta nil, fonts now local) wants a quick re-confirm.

---

## 2026-06-06 -- Batch started: [agentic-workflow-009]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-009 - Dashboard interactivity (SSE live-update consumer + Promote drag → applyTaskMove write path)
**Parallel:** no (1 worker)
**Note:** Final wave of the dashboard cluster. All deps satisfied (aw-003 applyTaskMove ✓, aw-005 reads ✓, aw-006 board ✓, infra-003 SSE transport ✓). Builds the SSE consumer (re-fetch /api/tree on change), the server's POST /api/task/move write endpoint delegating to applyTaskMove, and the backlog→todo Promote drag with optimistic concurrency / 409 handling (ADR-0001). Completing this lets aw-001 (the integration epic) close.

---

## 2026-06-06 -- Task verified and completed: agentic-workflow-008 - Dashboard navigation

**Type:** Work / Task completion
**Task:** agentic-workflow-008 - Dashboard navigation (discover/browse all .agentheim artifacts)
**Summary:** Built the dashboard's discovery/library surface — `dashboard/app/library.js` over the pure `library-data.js` (`treeToLibrary`) — listing the non-task half of `/api/tree` (vision, context-map, every BC README, ADRs, research) in fixed legible groups (Product / Bounded contexts / Decisions / Research), tasks deliberately excluded so each artifact has one home. Selecting a row emits the *same* open-intent the board emits, routed into the one universal slide-over (aw-007). Added a board↔library toggle in the shell built from the styleguide `RailItem`.
**Verification:** PASS (iteration 1) — full dashboard suite 82/82 green incl. new library-data tests (every artifact type grouped, no task ever in the library, intent-shape carried); toggle switches the mounted surface; styleguide patterns (TreeGroup/TreeItem/RailItem) imported not forked, source byte-unchanged; scope clean (no SSE/Promote).
**Commit:** 78c25e6
**Files changed:** 9 (library.js, library-data.js, board.js shell toggle, library-data test, dist/app.js rebuilt, BC README, ADR-0011)
**Tests added:** ~7 (library grouping + intent shape)
**ADRs written:** ADR-0011 (library = non-task half of the tree projection, grouped client-side; scope: agentic-workflow) — number free, no collision.
**Concept signal:** worker flagged `dashboard read-projection surfaces` converging on ADR-0009/0010/0011 + aw-005 — aggregating for end-of-run (related to aw-007's `dashboard-frontend-app` signal).

---

## 2026-06-06 -- Batch started: [agentic-workflow-008]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-008 - Dashboard navigation (discover/browse all .agentheim artifacts; board↔library toggle)
**Parallel:** no (1 worker)
**Note:** Fourth wave. Slots into the app shell (ADR-0009), reuses the styleguide library/doc-row + app-rail patterns, drives off `/api/tree`'s artifact-location half (aw-005), routes selections into the slide-over (aw-007). aw-009 (interactivity) remains.

---

## 2026-06-06 -- Task verified and completed: agentic-workflow-007 - Dashboard slide-over

**Type:** Work / Task completion
**Task:** agentic-workflow-007 - Dashboard slide-over (universal detail panel + client-side markdown renderer)
**Summary:** Built the dashboard's universal right-hand slide-over (`dashboard/app/slide-over.js` over the pure, unit-tested `slide-over-data.js`) and wired it to the board's open-intent seam. Clicking any artifact opens the approved styleguide `Drawer`, which fetches `GET /api/doc?path=` and renders the markdown client-side via the styleguide `Markdown`. Tasks and every non-task artifact (BC README, vision, context-map, research, ADR) render through one identical path — a *doc-shaped* item the Drawer consumes (ADR-0010); only the fetched path differs. Esc + scrim close.
**Verification:** PASS (iteration 1) — full dashboard suite 72/72 green incl. 7 new slide-over-data tests; uniform task/non-task path verified; Drawer Esc/scrim/slide-in inherited from the approved styleguide (not reimplemented); single-source intact (Drawer/Markdown imported, styleguide source byte-unchanged); scope clean (no nav, no SSE/Promote).
**Commit:** ffda30f
**Files changed:** 9 (slide-over.js, slide-over-data.js, board.js wiring, slide-over-data test, dist/app.js rebuilt, BC README, ADR-0010)
**Tests added:** 7 (slide-over-data path resolution + doc-shaped item)
**ADRs written:** ADR-0010 (slide-over feeds the Drawer a doc-shaped item; scope: agentic-workflow) — number free, no collision.
**Concept signal:** worker flagged `dashboard-frontend-app` converging on 4 artifacts (ADR-0009, aw-006, aw-007, ADR-0010) — aggregating for end-of-run.

---

## 2026-06-06 -- Batch started: [agentic-workflow-007]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-007 - Dashboard slide-over (universal detail panel + client-side markdown renderer over /api/doc)
**Parallel:** no (1 worker)
**Note:** Third wave. Slots into the app shell ADR-0009 established — reuses the styleguide Drawer + Markdown patterns, fetches `/api/doc` (aw-005), consumes the board's open-intent seam (board.js onOpen). aw-008 (nav) + aw-009 (interactivity) remain, one-per-batch.

---

## 2026-06-06 -- Task verified and completed: agentic-workflow-006 - Dashboard board view

**Type:** Work / Task completion
**Task:** agentic-workflow-006 - Dashboard board view (flat Kanban over /api/tree)
**Summary:** Stood up the dashboard frontend app in `dashboard/app/` (the project's first real UI) — imports the approved styleguide Kanban components across the BC boundary (single-source rule intact, ADR-0003), renders the flat four-column lifecycle board over live `/api/tree` with per-card BC chips, graceful unknown-status bucketing, empty-column state, and a click-emits-open-intent seam for the slide-over (aw-007). Retargeted infrastructure's esbuild ENTRY from the styleguide canvas to the live app and re-committed `dist/`.
**Verification:** PASS (iteration 1) — full dashboard suite 65/65 green incl. new board-data tests + a dist-build assertion that the committed bundle is the live board (fetches /api/tree, no canvas hero); single-source rule verified (styleguide imported not forked, source byte-unchanged); scope clean (no slide-over/nav built).
**Commit:** 03e0b37
**Files changed:** 11 (app/{app,board,board-data}.js, build.mjs retarget, 2 tests, dist/{app.js,index.html} rebuilt, BC README, ADR-0009)
**Tests added:** ~10 (board-data bucketing + dist-build live-board assertion)
**ADRs written:** ADR-0009 (dashboard frontend app shell + build retarget; scope: agentic-workflow) — number free, no collision. Governs aw-007/aw-008 too.

---

## 2026-06-06 -- Batch started: [agentic-workflow-006]

**Type:** Work / Batch start
**Tasks:** agentic-workflow-006 - Dashboard board view (flat Kanban over /api/tree)
**Parallel:** no (1 worker)
**Note:** Second wave. aw-005 done unblocked aw-006/007/008; aw-009 still blocked on aw-006. The three UI tasks share the dashboard app shell + the agentic-workflow README, so they run one-per-batch (Phase 3), lowest-id first. Worker briefed on the cross-BC seam: no dashboard frontend app exists yet (build.mjs bundles the styleguide *canvas*), so aw-006 must stand up the app shell and retarget the esbuild entry — architect consult + ADR, or a clean bounce if under-specified.

---

## 2026-06-06 -- Task verified and completed: design-system-003 - Vendor webfonts offline

**Type:** Work / Task completion
**Task:** design-system-003 - Vendor the dashboard's webfonts offline
**Summary:** Dropped the Google Fonts CDN `@import` from the token CSS and vendored Inter Tight + JetBrains Mono as latin-subset variable woff2 (one file per family, 44KB/31KB + OFL licenses) under `styleguide/styles/fonts/`, referenced by local `@font-face` rules. `dashboard/build.mjs` now copies `styles/fonts/` → `dist/fonts/` so the relative `url()` resolves identically in the canvas and the served dist — closing the last view-time network dependency; the dashboard renders correct type fully offline.
**Verification:** PASS (iteration 1) — by inspection (no test suite for CSS/fonts): no CDN ref remains, @font-face family names match the `--font-*` tokens, real woff2 (not placeholders), dist CSS byte-identical to source + dist/fonts present.
**Commit:** e9a41cc
**Files changed:** 13 (token CSS, 2 woff2 + 2 OFL ×{source,dist}, build.mjs, dist CSS, BC README, ADR-0008)
**Tests added:** 0 (CSS/font delivery change)
**ADRs written:** ADR-0008 (vendored-webfonts-latin-subset; scope: design-system) — **renumbered from the worker's 0004 by the orchestrator (0004 already taken by the cwd ADR)**; refs in the BC README + task file updated to match.
**Gate note:** edits the gated `colors_and_type.css` — reopens the styleguide gate for a lightweight builder re-confirm (visual delta nil: same families/weights, local delivery).

---

## 2026-06-06 -- Task verified and completed: agentic-workflow-005 - Dashboard read API

**Type:** Work / Task completion
**Task:** agentic-workflow-005 - Dashboard read API (/api/tree projection + /api/doc carrier)
**Summary:** Added the two read endpoints to the aw-004 server — `GET /api/tree` projects every BC × lifecycle folder × task frontmatter (id/title/status/type/context/path) plus artifact locations (pointers, never bodies); `GET /api/doc?path=` is a validated raw-markdown carrier. Both reuse `discovery.mjs`'s `startsWith(root)` guard; pure reads, no writes. New `tree.mjs` (stdlib frontmatter parser, graceful degradation) + `read-api.mjs` handlers.
**Verification:** PASS (iteration 1) — full dashboard suite 55/55 green; all 4 acceptance criteria evidenced (no-body projection, traversal-403 touches no file, malformed-frontmatter degradation exercised, BC+status on every card).
**Commit:** 21f0fe7
**Files changed:** 8 (tree.mjs, read-api.mjs, server.mjs, 3 tests, dashboard README, BC README)
**Tests added:** ~12 (tree projection + read-api endpoints)
**ADRs written:** none (ADR-0002 already covers the read transport)

---

## 2026-06-06 -- Batch started: [design-system-003, agentic-workflow-005]

**Type:** Work / Batch start
**Tasks:** design-system-003 - Vendor the dashboard's webfonts offline; agentic-workflow-005 - Dashboard read API (/api/tree projection + /api/doc carrier)
**Parallel:** yes (2 workers)
**Note:** First wave of the dashboard-cluster work run. Both ready (ds-003 deps none; aw-005 deps aw-004 ✓). Non-conflicting — ds-003 in styleguide CSS/fonts (design-system BC), aw-005 adds read endpoints to the aw-004 server (agentic-workflow BC). aw-006/007/008/009 stay blocked on the aw-005 chain.

---

## 2026-06-06 -- Modeling / Promoted: aw-005..009 - Dashboard UI cluster (5 tasks)

**Type:** Modeling / Promote
**BC:** agentic-workflow
**From → To:** backlog → todo (×5)
**Summary:** Builder asked to promote the whole dashboard backlog. Promoted the 5 buildable
children — aw-005 (read API), aw-006 (board view), aw-007 (slide-over + renderer),
aw-008 (navigation), aw-009 (SSE live-update + Promote). All leaf deps are done
(aw-004, aw-003, infra-001/002/003, ds-001/002) and the styleguide gate is OPEN, so the
frontend gate is clear for aw-006/007/008/009. Intra-cluster deps (aw-006/007/008 → aw-005,
aw-009 → aw-005/006) are now todo→todo and the `work` DAG sequences them at claim time.
**Held back:** aw-001 — the integration epic. Not promotable until its children land done
(its own AC is "all children done + end-to-end flow works"); promoting it would queue an
empty gate. Stays in backlog and closes when aw-005..009 complete.

---

## 2026-06-06 -- Modeling / Promoted: design-system-003 - Vendor the dashboard's webfonts offline

**Type:** Modeling / Promote
**BC:** design-system
**From → To:** backlog → todo
**Summary:** Promoted on builder request. Readiness confirmed — concrete acceptance criteria, clear scope, no unmet deps, styleguide gate open. Ready for `work`. (Note: working it reopens the styleguide gate for a lightweight visual re-confirm, and needs an infrastructure-002 dist rebuild downstream — both recorded in the task Notes.)

---

## 2026-06-06 -- Modeling / Captured: design-system-003 - Vendor the dashboard's webfonts offline

**Type:** Modeling / Capture
**BC:** design-system
**Filed to:** backlog
**Summary:** Captured the residual surfaced by infrastructure-002: the styleguide token CSS still @imports Inter Tight + JetBrains Mono from the Google Fonts CDN, so fonts hit the network at view time even though the framework is now fully offline. Fix = commit woff2 locally + local @font-face, drop the CDN @import (design-system-owned source). Linked prior art ds-001/ds-002 and ADR-0003. Kept in backlog per builder; notes the gate re-approval implication and the downstream infrastructure-002 dist rebuild.

---

## 2026-06-06 -- Task verified and completed: infrastructure-002 - esbuild → committed dashboard/dist

**Type:** Work / Task completion
**Task:** infrastructure-002 - Bundle the styleguide ESM source into the dashboard's committed static assets (esbuild → dist)
**Summary:** Added the esbuild build pipeline (dashboard/build.mjs + package.json devDeps) that bundles the design-system ESM styleguide source — React production / ReactDOM / marked / htm bundled in, no CDN, no Babel, minified — into a committed `dashboard/dist/` that aw-004's static handler serves directly. The dashboard now renders offline; no install to run. node_modules gitignored.
**Verification:** PASS (iteration 1) — full dashboard suite 43/43 green; render-verified live (GET / → 200 real UI, GET /app.js → 200, 0 CDN/Babel refs).
**Commit:** e37dac9
**Files changed:** 11 (build.mjs, package.json, package-lock.json, dist-build test, dist/ {index.html, app.js, 2 css}, .gitignore, infra README)
**Tests added:** ~6 (dist-build assertions)
**ADRs written:** none (ADR-0003 already covers the architecture)
**Residual:** the token CSS still `@import`s Google Fonts (Inter Tight / JetBrains Mono) from the CDN — a webfont in the design-system-owned source CSS, not editable by infrastructure. The framework is fully offline; only fonts hit the network at view time. Worth a design-system follow-up if true offline is required.

---

## 2026-06-06 -- Task started: infrastructure-002 (promoted from backlog + claimed)

**Type:** Work / Task start
**Task:** infrastructure-002 - Bundle the styleguide ESM source into the dashboard's committed static assets (esbuild → dist)
**Parallel:** no (single task)
**Note:** Builder asked to make the dashboard render. All deps now satisfied (infrastructure-001, design-system-001, design-system-002 + gate re-approved). Promoted backlog→doing and dispatched one worker. Output: a committed `dashboard/dist/` that aw-004's static handler serves; esbuild as a build-time-only dev dependency (ADR-0003).

---

## 2026-06-06 -- Styleguide gate re-approved (design-system-002)

**Type:** Gate / Builder approval
**BC:** design-system
**Summary:** The builder reviewed the migrated ESM styleguide canvas (`styleguide/index.html`)
and re-approved it ("looks good, everything works"). This closes `design-system-002`'s last
open acceptance criterion (criterion 8). **The styleguide gate is now OPEN against the
migrated ES-module source** — frontend tasks aw-006/007/008 may promote (each still subject
to its own other deps). Recorded in the design-system README, INDEX, and the ds-002 done file.
**Also noted:** running the dashboard server (aw-004) currently serves the graceful
"assets not built (dist/ absent)" fallback — the dashboard UI cannot render until
`infrastructure-002` (esbuild → committed `dist/`) is built. infrastructure-002's deps
(infrastructure-001, design-system-001, design-system-002) are now all satisfied.

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
