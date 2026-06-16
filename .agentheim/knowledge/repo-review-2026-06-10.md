# Repo setup review — 2026-06-10

Full-repo audit of Agentheim as a Claude Code plugin: correctness of the skill/agent contracts, packaging hygiene, design gaps, and cut candidates. Findings verified against the working tree at v0.8.4 (commit 5397457). Work through the checkboxes; each item cites its evidence.

---

## 🔴 Critical — harness correctness

### 1. Verifier test gate is disarmed by a template drift
- [ ] **Fix:** add `TESTS_ADDED`, `TESTS_PASSING`, `TDD_SKIPPED` to the worker return format in `skills/work/SKILL.md` (Subagent Prompt Template, ~lines 332–340).

`agents/worker.md:127-130` mandates those three fields; `agents/verifier.md` only runs the test suite when `TESTS_ADDED > 0`. The template that workers are actually handed at spawn time omits all three, so spawned workers never emit them and the verifier silently skips test execution. Single highest-value fix in the repo.

### 2. Research review gate unreachable from the orchestrator
- [ ] **Fix:** either give the orchestrator explicit instructions to spawn `research-reviewer` itself after a researcher returns, or document that orchestrator-routed research is ungated.

`agents/orchestrator.md:34` says "route through the gated research flow — let the research skill own it; don't re-implement the gate here." An agent cannot invoke a skill. `modeling → orchestrator → researcher` therefore produces **unreviewed** reports; the gate only exists when the `research` skill is the entry point.

### 3. Two skills not loading at runtime
- [ ] **Investigate:** run `claude --debug` and check skill-load errors for `capture` and `verification-before-completion`.

Observed in a live session (2026-06-10): the installed 0.8.4 cache (`~\.claude\plugins\cache\agentheim\agentheim\0.8.4\skills\`) contains all 9 skill dirs, but only 7 loaded — `agentheim:capture` and `agentheim:verification-before-completion` were absent. Both have valid-looking frontmatter; cause unknown. `capture`'s absence is user-facing but masked by item 4.

### 4. Trigger collision: modeling claims capture's phrases
- [ ] **Fix:** remove "capture this" / "add this to the backlog" from `skills/modeling/SKILL.md:3`'s description; add a deflection line ("for fast no-questions capture, that's the `capture` skill").

Routing happens on descriptions alone — the body-level disambiguation rule in capture never gets a chance to run. With both skills claiming the same phrases, dispatch is a coin flip (and currently always lands on modeling, since capture isn't loading).

---

## 📦 Packaging — what ships to every consumer

Claude Code clones the whole repo per install **and keeps every version**: local cache held 6 full copies = **81 MB** on the consumer machine.

| Item | Size | Action |
|---|---|---|
| `agentheim-workflow.pdf` + `.html` | 2.1 MB | - [ ] Move to GitHub Release assets or a `docs` branch; link from README |
| `skills/capture-workspace/` | ~1 MB, 209 files | - [ ] Delete (skill-creator eval leftovers); it also sits inside the skill-discovery dir |
| `.agentheim/` dogfood state | 751 KB, 87 files | - [ ] Decide what ships (see styleguide coupling below) |
| `evals/evals.json`, `skills/capture/evals/` | 5 KB | - [ ] Delete or gitignore |
| Fonts committed twice (styleguide + `dashboard/dist/fonts/`) | ~83 KB each | - [ ] De-duplicate |

### ⚠️ Styleguide lives inside dogfood state
`dashboard/app/*.js` imports from `../../.agentheim/contexts/design-system/styleguide/app/` — product code build-depends on project state. Can't delete `.agentheim/` without breaking the dashboard build.
- [ ] Move the styleguide source somewhere first-class (e.g. `dashboard/styleguide/`), leaving `.agentheim/` as pure state.

### Docs / release discipline
- [ ] README:22 ("omit `version`, fall back to commit SHA") contradicts RELEASE.md / ADR-0013 (version field is sole authority). Align README.
- [ ] README:24 shows lightweight tags + stale `v0.6.0` example; RELEASE.md mandates annotated tags. Align.
- [ ] No `CLAUDE.md` at repo root for contributors — the never-regress disciplines (README Status section) and contract conventions belong there.
- [ ] `skills/work/SKILL.md:22` offers `scripts/backfill-indexes.ps1` "(or `.sh`)" — **the `.sh` doesn't exist**. Write it or drop the promise.

---

## 🧩 Design gaps — missing features

1. - [ ] **No abandon/cancel verb.** `work` mentions "abandon" for escalated tasks but no skill defines it. `lib/task-lifecycle.mjs` `LEGAL_MOVES.skill` has no backward moves, yet `work`'s bounce (`doing→backlog`) and verifier-fail rollback need them — so skills do raw file moves, bypassing the lifecycle guard entirely. Extend `LEGAL_MOVES` and route all moves through `applyTaskMove`.
2. - [ ] **No status entrypoint.** "What's in flight / blocked / escalated?" requires the dashboard or a full `work` run. A tiny read-only status skill would be cheap.
3. - [ ] **Concept pages promised, never implemented.** `references/concept-template.md` exists, workers emit `CONCEPT_CANDIDATE`, but nothing implements page creation. Fold into `modeling`.
4. - [ ] **`priority` referenced but absent** — `modeling/SKILL.md:48` mentions a priority flag; task frontmatter has no such field. Add or remove.
5. - [ ] **Brainstorm writes foundation tasks directly into `todo/`** (`skills/brainstorm/SKILL.md:169,242`), skipping the `backlog→todo` dependency guard — `depends_on` on e.g. the styleguide task never gets checked. Write to `backlog/`, promote via lifecycle helper.
6. - [ ] **No modeling-output gate.** Workers get a verifier, researchers a reviewer; the orchestrator's refined tasks/ADRs go unreviewed. Maybe deliberately fine for single-user — decide and document.
7. - [ ] **Dashboard gaps:** no BC/type filtering (projection already carries both fields); `handleMove` doesn't forward `context` — relies on `deriveContext(id)`, which mis-derives any non-`<bc>-NNN` id; no concurrency test for simultaneous moves of the same task.

---

## 🤔 Weirdly implemented

- [ ] **Doctrine docs registered as skills.** `research-review`, `test-driven-development`, `verification-before-completion` are never user-triggered — they're files read by other skills/agents. As skills, their descriptions cost context in every consumer session and clutter the trigger space. Move to `references/` (consumers already reference them by path).
- [ ] **work/SKILL.md duplicates agents/worker.md** (the embedded Subagent Prompt Template) — this duplication produced critical defect #1. Make one canonical.
- [ ] **Repeated blocks drift:** protocol.md header template duplicated in 4 skills; mode summaries duplicated in brainstorm + modeling despite `references/modes.md` being canonical. Existing drift: `verification-before-completion`'s `ITERATION_HINT` long-form strings ≠ `verifier.md:144` enums (work skill parses the enum — agent is correct, doctrine doc is stale).
- [ ] **commands/dashboard.md** pastes the same ~600-char `node -e` bootstrap three times (launch/stop/status). One template, verb as variable.
- [ ] **`/dashboard status` isn't read-only:** `launch.mjs:111` → `inspectExisting` deletes a stale runfile, contradicting the documented contract.
- [ ] **Dead code:** `window.__agentheimLastOpen` (`dashboard/app/board.js:612`, no read site); `defaultAssetRoot`'s ignored `_root` param in `server.mjs`.
- [ ] **ADR authorship ambiguous:** orchestrator says "you write them" (orchestrator.md:51); strategic/tactical-modeler say "return ADR drafts". Draft→disk path unspecified.
- [ ] **Triple `/api/tree` fetch on dashboard startup** (board.js: projectName fetch + loadTree on mount + SSE hello resync). Derive projectName from the board's fetch.
- [ ] Cosmetic: verifier check "6b"; two steps numbered "4." in work's end-of-run reporting; protocol prepend instruction says "after the `---` on line 4" — only true for a fresh file (should say "after the header block's closing `---`").

---

## 🔒 Security (dashboard)

Good: bound to `127.0.0.1`, path traversal guarded + tested (single-encoded), 64 KB body cap.

- [ ] **CSRF on `POST /api/task/move`:** no Origin/Content-Type check — any website can fire a `text/plain` POST at the localhost port and move task files. Low severity (worst case: a markdown file moves), three-line fix: reject if `Origin` isn't own host or content-type isn't `application/json`.
- [ ] `/api/tree` leaks the absolute filesystem `root` path to the browser (`tree.mjs:205`). Drop it.
- [ ] Add a double-encoded traversal test case (`%252e%252e%252f`) to `server.test.mjs`.
- [ ] `dist-build.test.mjs` hard-fails without `npm install` in `dashboard/` — add a node_modules guard with a clear skip message. No mechanism flags stale `dist/` JS relative to `app/*.js` outside test runs.

---

## ✂️ Cut candidates

- `skills/capture-workspace/` (entirely), `evals/evals.json`, `skills/capture/evals/`
- `agentheim-workflow.pdf/.html` from the repo (→ release assets)
- The three doctrine skills *as skills* (keep content in `references/`)
- ~40% of worker.md's "what you do NOT do" section (restates the action phases)
- Duplicated styleguide fonts

---

## Top 5 priorities

1. Add `TESTS_ADDED`/`TESTS_PASSING`/`TDD_SKIPPED` to work/SKILL.md's return template (re-arms the verifier).
2. Debug why `capture` / `verification-before-completion` don't load; de-overlap modeling's trigger description.
3. Close the orchestrator→researcher gate bypass.
4. Purge `capture-workspace/` + workflow PDF (~3 MB × every version × every consumer).
5. Extend `LEGAL_MOVES` with the backward moves skills already perform manually; route them through `applyTaskMove`.
