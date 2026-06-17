---
id: agentic-workflow-063
title: Analyze and optimize the committing pattern
status: todo
type: refactor
context: agentic-workflow
created: 2026-06-17
completed:
commit:
depends_on: []
blocks: []
tags: [committing, git, workflow-doctrine]
related_adrs: [0007, 0017]
related_research: []
prior_art: [agentic-workflow-003]
---

## Why
Two observed problems with how the workflow commits:

1. **Markdown artifacts get left over uncommitted.** `modeling`, `quick-capture`, and
   `brainstorm` write `.md` files — task files, `INDEX.md`, `protocol.md` — but **never
   commit them**. After a modeling session those changes just sit in the working tree.
   (The repo proves it: this very session left `INDEX.md`, `protocol.md`, and a new
   `todo/` task file modified-but-uncommitted.) This is the primary pain.

2. **`work` leaks its own bookkeeping out of the task commit.** The skill commits the
   worker's code + the moved task file, and *then* — after the commit — writes the
   `commit: <sha>` frontmatter, the `INDEX.md` list/count edits, and the `protocol.md`
   entry. Those land in the working tree, never in the task's commit. The de-facto
   workaround has been a separate trailing per-session "record SHAs + INDEX/protocol"
   commit (e.g. `243dcad`) — an extra commit every session, and a leak whenever it's
   forgotten. Root cause: you can't write the commit SHA into frontmatter until *after*
   you've committed, which forces all bookkeeping out of the task commit.

## What
Make every skill that produces `.agentheim/` artifacts commit those artifacts as part
of its own work, so the working tree is clean after any session, and remove the extra
bookkeeping commits.

**A. `work` skill — fold bookkeeping into the task commit.**
- Write the `doing → done` task-file move, the `INDEX.md` edits, and the `protocol.md`
  entry **before** committing, and `git add` them, so a completed task's code +
  task-file move + INDEX + protocol all land in **one** commit. Nothing left in the
  working tree afterward.
- Remove the SHA-in-frontmatter chicken-and-egg: stop writing `commit: <sha>` into the
  task frontmatter after the commit. The commit is already discoverable from `git log`
  via the `[<task-id>]` in the message. (ADR to settle: drop the `commit:` field
  outright — default — vs keep it via a follow-up amend. Default: drop it.)
- Keep **one commit per task** as the rule, with a **trivial-squash carve-out**: a wave
  of trivial same-area follow-ups (same files, no behavior change beyond the prior task —
  e.g. the aw-064/065/066/067 one-line chrome tweaks) MAY be squashed into one commit.
  Define "trivial" precisely in `work/SKILL.md`.

**B. Markdown-producing skills — commit their own artifacts.**
- `modeling` (CAPTURE / REFINE / PROMOTE / DISMISS), `quick-capture`, and `brainstorm`
  commit their `.md` changes (new/updated task files + `INDEX.md` + `protocol.md`) at the
  end of each action, scoped with explicit `git add` of just those files (never
  `git add -A`).
- Define the commit-message convention for these markdown-only commits (e.g.
  `chore(<bc>): capture <task-id> - <title>` / `model(<bc>): refine <task-id>`).

**C. Record the doctrine as an ADR** — who commits what, bookkeeping folded into the
task commit, the `commit:`-field decision, and the trivial-squash carve-out (which bends
the "one task = one commit" invariant in vision.md and the Task aggregate, so it must be
recorded). Cross-link ADR-0007 and ADR-0017.

## Acceptance criteria
- [ ] After a `work` session, `git status` is clean — no leftover modified `INDEX.md`,
      `protocol.md`, or task files; each task's code + task-move + INDEX + protocol are in
      that task's single commit.
- [ ] `work/SKILL.md` writes INDEX/protocol/task-move **before** the commit and `git add`s
      them; the post-commit SHA-write step is gone (or replaced per the ADR decision).
- [ ] The `commit:` frontmatter field is dropped (default) — or, if the ADR keeps it, it is
      populated *inside* the committed change, not left dangling.
- [ ] One-commit-per-task stays the default; the trivial-squash carve-out is written into
      `work/SKILL.md` with a concrete definition of "trivial".
- [ ] After a `modeling` / `quick-capture` / `brainstorm` session, `git status` is clean of
      `.agentheim/` markdown — the skill committed its own task files, INDEX, and protocol.
- [ ] Each markdown-only commit uses scoped `git add` (only the files it touched, never
      `git add -A`) and a defined message convention.
- [ ] An ADR records the committing doctrine and cross-links ADR-0007 / ADR-0017.

## Notes
Captured via `quick-capture` on 2026-06-17; refined 2026-06-17 (Interrogator).

**Decisions taken in refinement (user):** keep per-task granularity with a trivial-squash
carve-out (not per-session bundling); fix the leak by folding bookkeeping into the task
commit and dropping the SHA-in-frontmatter chicken-and-egg.

**Side-effect boundary (ADR-0007).** ADR-0007 keeps `applyTaskMove` owning *only* the
move, with INDEX/protocol side-effects owned by the skills/orchestrator. This task does
**not** move those side-effects into the mover — it changes *when* the skill performs them
relative to its commit (before, so they're committed atomically). Keep ADR-0007's boundary
intact; reference it in the new ADR.

**Concurrency constraint (must address in the ADR).** `modeling` sometimes runs
concurrently with `work` (see the 2026-06-17 session-end protocol entry). If *both* skills
now commit, they must never `git add` each other's in-flight files — scoped `git add` of
only each skill's own artifacts is load-bearing, exactly as `work` already practices.
Spell this out so concurrent modeling+work sessions don't bundle or race each other's
markdown.

**Open question for the worker/ADR:** should the markdown-producing skills commit
silently at end-of-action, or confirm with the user first? The global "commit only when
asked" stance argues for a prompt; the user's complaint (leftover uncommitted `.md`)
argues for silent auto-commit like `work`. Default to silent auto-commit (matches `work`);
let the ADR settle it.

**May split** along the A (work) / B (modeling+capture+brainstorm) seam if the worker
finds it too large — but the doctrine (C) is one ADR shared by both halves, so prefer
keeping it as one task.
