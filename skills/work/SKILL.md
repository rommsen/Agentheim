---
name: work
description: Use whenever the user wants work executed on the todo backlog — running tasks, building features, implementing what has already been modeled. Triggers on phrases like "start working", "execute the todo", "work on it", "build it", "implement the backlog", "let's go", "run the workers", "pick up where you left off", "ship what's ready". Spawns parallel worker sub-agents that resolve task dependencies and claim ready tasks from `contexts/*/todo/`. Workers follow TDD per `skills/test-driven-development/SKILL.md`. Every worker SUCCESS goes through a `verifier` agent (see `skills/verification-before-completion/SKILL.md`) before commit — failed verification re-dispatches the worker up to twice, then escalates to the user. New tasks promoted to todo during the run are picked up automatically as they become ready. Does not do modeling — only executes already-refined tasks.
---

# Work — Parallel Dependency-Aware Worker Loop

The `work` skill turns refined `todo/` tasks into real code and real decisions. It is a loop, not a one-shot: it keeps going until todo is empty (or the user stops it), and it picks up tasks added mid-run.

**The orchestrator (you) never writes code.** You coordinate: scan, build the DAG, dispatch workers, commit, log. Keeping you lean prevents context exhaustion across long batches. All coding work is delegated to subagents.

## Phase 1: Recovery check

Before anything else, look at `contexts/*/doing/`:
- **0 tasks** → proceed to Phase 2.
- **1 task** → a previous session was interrupted. Resume it sequentially as the first task of this session, *before* starting any parallel dispatch.
- **2+ tasks** → a previous parallel session was interrupted. Ask the user: "Resume all in parallel", "Resume one at a time", or "Abandon — move them back to todo". Do not guess.

## Phase 2: Build the dependency graph

1. Read `.agenthoff/vision.md` and `.agenthoff/context-map.md` for orientation.
2. Read `.agenthoff/knowledge/index.md` (top-level catalog — current BCs and recent ADRs). If missing, surface to user that the project hasn't been indexed and offer to run `scripts/backfill-indexes.ps1` (or `.sh`) before continuing — workers will be less effective without indexes.
3. Read the first ~100 lines of `.agenthoff/knowledge/protocol.md` (newest entries are on top — this gives recent activity context). Skip if it doesn't exist yet. **Hold this excerpt in memory** — you pass it forward to each worker as `## Recent activity` so workers don't re-read the protocol themselves.
4. Scan `.agenthoff/contexts/*/todo/` and `.agenthoff/contexts/*/doing/`.
5. For every todo task, read `depends_on`. A task is *ready* if every id in `depends_on` is in `done/` (or doesn't exist — treat missing as satisfied, but warn the user).
6. **Detect cycles.** If the graph has a cycle, stop and surface the cycle to the user. Do not "just pick one".
7. Briefly tell the user what you found: "X tasks ready across N contexts, Y tasks blocked on Z."

## Phase 3: Conflict detection before batch dispatch

Two parallel workers touching the same file is the most common cause of merge pain. Defend against it:

1. For each ready task, scan its `What`, `Acceptance criteria`, and `Notes` sections for file paths, directory references, and shared resources (BC READMEs, ADRs, shared modules).
2. If two ready tasks reference the same file or directory, **demote the higher-id task to the next batch** — don't dispatch it in the current wave.
3. Tasks targeting the same BC's README count as a conflict (only one worker updates the BC memory per batch).
4. **Cap the batch at MAX_PARALLEL = 3** unless the user asked otherwise. Pick the lowest-numbered unblocked, non-conflicting tasks.

## Phase 4: Batch dispatch

For each dispatch wave:

1. **Move all selected task files** from `todo/` to `doing/` (the orchestrator does this *before* spawning subagents — prevents workers racing for the same file).

2. **Log "Batch started"** to `.agenthoff/knowledge/protocol.md` (prepend — see "Protocol logging" section below).

3. **Spawn one subagent per task** using the Agent tool with `subagent_type: "worker"`. Launch all subagents in **one message** (parallel tool calls). Use the Subagent Prompt Template below.

4. **Wait for all subagents to complete.** As each returns:
   - Parse its strict return format (see template).
   - For `RESULT: SUCCESS`:
     - **Verify the result** (see "Verification gate" section below). Only commit after verification passes.
   - For `RESULT: BOUNCED`: the worker moved the task back to `backlog/` because it was under-refined. Log "Task bounced" to protocol.md. Do not commit — the worker made no changes.
   - For `RESULT: FAILED`: log "Task failed" to protocol.md with the error. Leave the task in `doing/` so it doesn't silently retry. Tell the user at the end.
   - One failure does not block the batch — the other subagents continue and are processed normally.

5. **After the batch completes**, return to Phase 2 — re-scan. New tasks may have been promoted to todo (via parallel `model` invocations) or new dependencies may have unblocked.

## Verification gate (post-SUCCESS, pre-commit)

A worker returning `RESULT: SUCCESS` is not yet a commit. Every SUCCESS goes through the `verification-before-completion` gate — a separate `verifier` agent inspects the diff against the acceptance criteria with fresh context. This is the structural defense against plausible-but-wrong code.

The full doctrine lives in `skills/verification-before-completion/SKILL.md`. The operational integration here is:

### When to skip verification

Skip the gate (commit immediately on SUCCESS) when any of these is true:

- The project is not a git repo (no diff to inspect).
- The user invoked `work` with `--no-verify` or said "skip verification this run" — opt-out is per-batch, never persistent.
- The task is `type: decision` AND `FILES_CHANGED == 1` AND the single file is an ADR — auto-SKIP without spawning the verifier.

Otherwise, verify.

### Verifier dispatch

For each SUCCESS that requires verification, in parallel where the workers ran in parallel:

1. Capture the diff: run `git diff` (working tree against HEAD — the worker has not committed) and `git diff --stat`. Note the exact files changed.
2. Track the iteration count for this task (start at 1; increments on each FAIL re-dispatch).
3. Spawn one `verifier` subagent via Agent with `subagent_type: "verifier"` using the **Verifier Prompt Template** below. Launch verifiers for a batch's successes in the same message (parallel tool calls).
4. Wait for each verifier's verdict.

### Handling the verdict

**`VERDICT: PASS`**
1. Proceed to the existing "Git authority" section — `git add` + commit the worker's files.
2. Log "Task verified and completed" to protocol.md (replaces the old "Task completed" entry — see Protocol logging below).

**`VERDICT: SKIP`**
1. Commit exactly as on PASS.
2. Log "Task completed (verification skipped: <reason>)" to protocol.md.

**`VERDICT: FAIL`, iteration 1 or 2**
1. Do **not** commit. The worker's changes stay on the working tree but are not added or committed yet.
2. Roll back the worker's completion claim on the task file:
   - Move the task file from `done/` back to `doing/`
   - Revert frontmatter: `status: done` → `status: doing`, clear the `completed:` date
3. Append the verifier's output to the task file as a new `## Verifier note (iteration N)` section at the bottom, containing the REASONS, SUGGESTED_FIX, and ITERATION_HINT verbatim.
4. Log "Verification failed (iteration N)" to protocol.md.
5. Decide re-dispatch:
   - If `ITERATION_HINT: task-under-specified` → do not re-dispatch even on iteration 1. Treat as iteration-3 below.
   - Otherwise → **re-dispatch a worker** on this task. Use the standard Subagent Prompt Template, but prepend a paragraph telling the worker to read the task file's `## Verifier note` sections and address them. Set `iteration = N + 1` for the next verification.

**`VERDICT: FAIL`, iteration 3 (or earlier with `ITERATION_HINT: task-under-specified`)**
1. Do not commit. Do not re-dispatch.
2. Leave the task in `doing/` with all accumulated verifier notes — the user will see them.
3. Log "Verification failed — escalating to user" to protocol.md.
4. Surface at end-of-batch (see End-of-run reporting): summarize the task, the iteration history, and the latest verifier's SUGGESTED_FIX. The user decides whether to refine the task (re-route via `model` REFINE) or abandon.

### Verifier Prompt Template

Spawn each verifier with `Agent(subagent_type: "verifier", prompt: <the-below>)`. Fill the placeholders.

```
You are a verifier agent auditing one worker's completed task with fresh context. You have no exposure to the worker's reasoning — only the task spec, the BC README, and the diff in front of you.

## Your inputs
Task file (currently in doing/ or done/): <ABSOLUTE-PATH>
Bounded context: <BC-NAME>
BC README: <ABSOLUTE-PATH-TO-BC-README>
Iteration: <N> of max 3

## The worker's strict SUCCESS return
<paste the worker's full RESULT: SUCCESS block verbatim>

## The diff to audit
<paste `git diff --stat` output, then `git diff` output — or attach as text>

## Project context (read on demand if needed)
- .agenthoff/vision.md
- .agenthoff/context-map.md (if exists)
- .agenthoff/knowledge/decisions/ (ADRs)

## Your job
Follow the checks in `agents/verifier.md`, in order, stopping at the first failing check. Return exactly one verdict block — VERDICT: PASS, VERDICT: FAIL, or VERDICT: SKIP — per the strict formats in your agent definition.

Do not use Write, Edit, or any git command. You are read-only.
```

### Parallel verification

When the orchestrator dispatched a parallel batch of N workers and several return SUCCESS, capture each worker's diff independently (use `git diff -- <FILE_LIST>` per worker if needed to scope the patch), and spawn the verifiers as parallel Agent calls in one message. Each verifier sees only its own task's diff. Commit each verified-PASS sequentially in the order verifiers return — never parallelize git writes.

## Git authority (orchestrator only)

Git is owned by `work`, not by workers or verifiers. Workers only move files and write content; verifiers only read. This is load-bearing for parallel safety — two writes to git concurrently can race.

After a verifier returns `VERDICT: PASS` (or `VERDICT: SKIP`, or when verification was bypassed per the skip rules above):

1. `git status` to see what changed.
2. `git add` — the files from the worker's `FILE_LIST` plus the moved task file, the updated BC README (if the worker reports `BC_README_UPDATED: yes`), and any ADRs listed in `ADRS_WRITTEN`. **Never `git add -A`** — it sweeps in unrelated changes (user's in-progress work, or a parallel sibling worker's files awaiting their own verification).
3. Commit with message:
   ```
   <type>(<bc>): <summary> [<task-id>]
   ```
   where `<type>` comes from the task's frontmatter (feature / bug / refactor / chore / spike / decision), `<bc>` is the bounded context, `<task-id>` is the task id. Example:
   `feature(books): add ReadingSession concept to Book aggregate [books-001]`
4. Capture the commit SHA.
5. Update the task file's frontmatter with `commit: <sha>` (you do this — the worker already set status=done and moved the file, you add the SHA the worker didn't have).

One task = one commit. Commit after each verifier passes, not in a batch — that way if the next verification fails we haven't bundled it with an already-passed one. In a parallel batch where verifiers return roughly simultaneously, commit sequentially in the order verifiers return PASS.

If the project isn't a git repo, skip commits silently and note it in the end-of-run summary. (Verification is also auto-skipped in this case — see "When to skip verification".)

## Index updates (orchestrator-owned)

Indexes track artifact movement. The work skill — **never the worker** — updates them. The worker is scope-restricted; touching `INDEX.md` files from inside a worker would fail verification. Index template lives at `references/index-template.md`.

Per state transition in `contexts/<bc>/INDEX.md`:

| Transition | Marker edits | Counts |
|---|---|---|
| **todo → doing** (Phase 4 step 1) | remove from `<!-- todo-list:start -->` → insert into `<!-- doing-list:start -->` | Todo −1, Doing +1 |
| **doing → done** (post-PASS commit) | remove from `<!-- doing-list:start -->` → insert at top of `<!-- done-list:start -->` (newest first) | Doing −1, Done +1 |
| **doing → backlog** (BOUNCED) | remove from `<!-- doing-list:start -->` → insert into `<!-- backlog-list:start -->` | Doing −1, Backlog +1 |
| **doing → doing** (FAIL iteration N, re-dispatched) | no list move; line stays in doing-list | no count change |
| **doing → doing-final** (FAIL iteration 3, escalated) | no list move | no count change |

Per ADR written (from `ADRS_WRITTEN` in worker SUCCESS):

- Read the ADR's frontmatter `scope:` field.
- `scope: <bc-name>` → insert under `<!-- adr-local:start -->` in `contexts/<bc-name>/INDEX.md`.
- `scope: global` → insert under `<!-- adr-global:start -->` in `.agenthoff/knowledge/index.md`.
- **Bidirectional backlink:** append the ADR id to the task's `related_adrs` frontmatter, and append the task id to the ADR's `related_tasks` frontmatter. The worker writes the ADR but does not maintain these cross-links — the orchestrator does, atomically, alongside the index update.

If `.agenthoff/knowledge/index.md` or the BC's `INDEX.md` does not exist yet, create it from `references/index-template.md` before inserting. Do not auto-rewrite the file — only insert/remove at markers.

If `NEW_BACKLOG_ITEMS` are non-empty in the worker SUCCESS, also insert those task lines under `<!-- backlog-list:start -->` in the appropriate BC's INDEX.md (counts +N).

## Protocol logging

`.agenthoff/knowledge/protocol.md` is the project's chronological diary. Every `work` event prepends a new entry. Keep entries terse — the diff carries the detail.

If `protocol.md` doesn't exist, create it with:
```markdown
# Protocol

Chronological log of everything that happens in this project.
Newest entries on top.

---
```

Then every entry is prepended right after the `---` on line 4.

Entry formats:

```markdown
## YYYY-MM-DD HH:MM -- Batch started: [task-id-1, task-id-2, ...]

**Type:** Work / Batch start
**Tasks:** task-id-1 - [title], task-id-2 - [title]
**Parallel:** yes / no (N workers)

---

## YYYY-MM-DD HH:MM -- Task verified and completed: <task-id> - [title]

**Type:** Work / Task completion
**Task:** <task-id> - [title]
**Summary:** [worker's 1-line SUMMARY]
**Verification:** PASS (iteration N)
**Commit:** <short-sha>
**Files changed:** N
**Tests added:** N
**ADRs written:** [ids or "none"]

---

## YYYY-MM-DD HH:MM -- Task completed (verification skipped): <task-id> - [title]

**Type:** Work / Task completion
**Task:** <task-id> - [title]
**Summary:** [worker's 1-line SUMMARY]
**Verification:** SKIPPED — [reason: decision-only task | --no-verify | non-git project]
**Commit:** <short-sha>
**Files changed:** N

---

## YYYY-MM-DD HH:MM -- Verification failed: <task-id> - [title]

**Type:** Work / Verification failure
**Task:** <task-id> - [title]
**Iteration:** N of 3
**Reasons:** [verifier's REASONS, comma-joined]
**Iteration hint:** likely-fixable | task-under-specified
**Next:** re-dispatched worker | escalated to user

---

## YYYY-MM-DD HH:MM -- Task bounced: <task-id> - [title]

**Type:** Work / Task bounced
**Task:** <task-id> - [title]
**Reason:** [worker's REASON]
**Moved to:** backlog

---

## YYYY-MM-DD HH:MM -- Task failed: <task-id> - [title]

**Type:** Work / Task failure
**Task:** <task-id> - [title]
**Error:** [worker's ERROR]
**Left in:** doing

---
```

## Subagent Prompt Template

Spawn each worker with `Agent(subagent_type: "worker", prompt: <the-below>)`. Fill the placeholders.

```
You are a worker agent executing one refined task. Stay strictly within its scope.

## Your task
Task file (currently in doing/): <ABSOLUTE-PATH>
Bounded context: <BC-NAME>
BC README: <ABSOLUTE-PATH-TO-BC-README>
BC index: <ABSOLUTE-PATH-TO-CONTEXTS-BC-INDEX-MD>  # catalog of ADRs/research/concepts scoped to this BC

## Pre-loaded ADRs (MUST READ before coding)
The task's `related_adrs` frontmatter lists ADRs you must read. Their full content is below — do not re-fetch.

<For each id in task.related_adrs, paste the full ADR file content here, separated by `---`. If related_adrs is empty, write: "No related ADRs.">

## Pre-loaded prior art (SHOULD READ if non-empty)
The task's `prior_art` frontmatter lists done-task ids that are close in subject. Read their `## Outcome` sections before designing yours — don't re-derive a solved problem.

<For each id in task.prior_art, list: id, title, path to done/ file, and the Outcome section excerpt (last 30 lines of the file). If prior_art is empty, write: "No prior art identified.">

## Related research (read on demand)
The task's `related_research` frontmatter points at research reports under `.agenthoff/knowledge/research/`. Read the ones whose topic actually bears on your work.

<List task.related_research entries by slug; do not paste contents — reports can be long.>

## Recent activity
Last ~100 lines of `.agenthoff/knowledge/protocol.md` — the project's recent events. Use this for orientation; do not re-fetch the protocol yourself.

<Paste the head -100 excerpt the orchestrator captured in Phase 2 verbatim.>

## Project context (read only if you need them)
- .agenthoff/vision.md
- .agenthoff/context-map.md (if exists)
- .agenthoff/knowledge/decisions/ (other ADRs beyond the pre-loaded ones)
- .agenthoff/knowledge/research/ (research reports)
- .agenthoff/contexts/<bc>/concepts/ (opt-in synthesis pages — grep for relevant concepts before designing)

## Rules — CRITICAL
1. Do NOT run `git add`, `git commit`, or any git write operation. The orchestrator owns git.
2. Do NOT modify `.agenthoff/knowledge/protocol.md`. The orchestrator owns protocol logging.
3. Do NOT modify any `INDEX.md` (`.agenthoff/knowledge/index.md` or `.agenthoff/contexts/*/INDEX.md`). The orchestrator owns indexes.
4. Do NOT touch any task file other than the one you were assigned.
5. Do NOT modify other BCs' READMEs. Only the BC your task belongs to.
6. DO write code, run tests, update YOUR BC's README, write ADRs for decisions you make.
7. DO move your task file from doing/ to done/ when acceptance criteria are met, and update its frontmatter (status: done, completed: YYYY-MM-DD).
8. If the task is under-refined (no concrete acceptance criteria, unclear scope, unmet dependencies, insufficient BC language), MOVE IT BACK TO backlog/ with a `## Worker note` explaining what's missing, and return RESULT: BOUNCED. This is correct behavior, not a failure.

## Context hygiene — IMPORTANT
Your context window is finite. Respect it:
- Read only what you need. Use targeted reads (offset/limit) on large files. Don't read a whole file for a few lines.
- Don't echo file contents back in your output — work with them silently.
- Keep tool output concise (use head/tail, --quiet flags).
- Don't re-read files you've already read unless they've changed.
- Don't restate the task file or the BC README verbatim — the orchestrator already has them.

## Return format — STRICT
When done, return ONLY the following, nothing else. No prose, no preamble, no "here's what I did".

RESULT: SUCCESS
TASK_ID: <id>
SUMMARY: <one or two sentences, domain-language>
FILES_CHANGED: <integer>
FILE_LIST: <comma-separated absolute paths of all files you created or modified, EXCLUDING the moved task file>
BC_README_UPDATED: yes | no
ADRS_WRITTEN: <comma-separated filenames under .agenthoff/knowledge/decisions/, or "none">
NEW_BACKLOG_ITEMS: <comma-separated task ids created in a backlog/ during your work, or "none">
CONCEPT_CANDIDATE: <concept-name> — converging on N artifacts (<id list>) | none

For a bounce, return:
RESULT: BOUNCED
TASK_ID: <id>
REASON: <one or two sentences on what was missing>

For a failure, return:
RESULT: FAILED
TASK_ID: <id>
ERROR: <where and why it went wrong, one or two sentences>
```

## End-of-run reporting

When `todo/` is empty and all `doing/` is resolved (or the user interrupts):

1. Summarize in plain prose: tasks completed (with verification stats — how many passed first try vs. needed re-dispatch), tasks bounced (and why), tasks failed (and why), tasks escalated after 3 verification failures (these need user attention), ADRs written, new backlog items created, total commits made.
2. For each task escalated to the user: name it, summarize the iteration history, and show the latest verifier's SUGGESTED_FIX. The user decides whether to REFINE via `model` or abandon.
3. **Concept candidates.** Aggregate every non-"none" `CONCEPT_CANDIDATE` from worker SUCCESS blocks across the run. If any concept name shows up in 2+ workers' returns, escalate the convergence signal more loudly. For each unique candidate: print the concept name, the BC, and the converging artifact ids. The user decides whether to create the page (per `references/concept-template.md`); never auto-create.
4. Surface anything that surprised you mid-run: cycles detected, dependency gaps, recovered sessions, repeated verification failures pointing at a common cause.
4. Prepend a final protocol entry:
   ```markdown
   ## YYYY-MM-DD HH:MM -- Work session ended

   **Type:** Work / Session end
   **Completed:** N (first-try PASS: A, re-dispatched: B, skipped: C)
   **Bounced:** M
   **Failed:** K
   **Escalated after verification:** E
   **Commits:** <count>

   ---
   ```

## Do not model in work

If a worker realizes mid-task that the scope is actually under-refined, it bounces to backlog — it does not try to refine the task itself. Refinement is the `model` skill's job, with the user in the loop. Workers executing under-specified tasks produce plausible-looking but wrong output — that's the worst possible outcome.
