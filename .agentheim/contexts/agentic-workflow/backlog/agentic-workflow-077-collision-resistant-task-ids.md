---
id: agentic-workflow-077
title: Collision-resistant task IDs for multi-user / multi-branch work (replace sequential integers)
status: backlog
type: decision
context: agentic-workflow
created: 2026-06-17
completed:
depends_on: []
blocks: []
tags: [identity, ids, concurrency, collaboration, git]
related_adrs: [0012, 0022, 0026]
related_research: []
prior_art: []
---

## Why

Task ids today are sequential per-BC integers (`agentic-workflow-072`), minted by
**scanning the BC's existing task files for the next free number**. That mint assumes a
**single writer** owning a global counter. The moment two people use Agentheim on
**separate branches of the same repo**, both scan the same tree and both pick the same
next number — `aw-077` on branch A *and* `aw-077` on branch B — for two unrelated tasks.

On merge they collide, and the collision is silent and corrosive because the id is the
spine of the whole system:
- two different `<id>-<slug>.md` files claim one id (filename + frontmatter clash);
- `depends_on` / `blocks` / `prior_art` / `related_tasks` edges become ambiguous;
- the `[aw-077]` commit trailer (ADR-0026) can no longer identify *which* task shipped;
- the INDEX lists one id twice, and "dismissed ids are retired" (ADR-0022) breaks down.

The sequential-integer scheme is fundamentally incompatible with concurrent, branch-based
collaboration. This task replaces it.

## What

Replace the integer tail of the id with an identifier that is **generated independently on
each branch with no coordination** and is collision-free either by construction or with
overwhelming probability. Whatever scheme is chosen must still thread through everything the
current id does: the anchored `<id>-<slug>.md` filename resolution (ADR-0012), the four
backlink fields, the `[<id>]` commit trailer (ADR-0026), the dashboard `id` projection, and
dismissed-id retirement (ADR-0022).

This is filed `type: decision` because the keystone deliverable is an **ADR fixing the new
id scheme**; the implementation sweep (and any one-time migration) splits out into child
tasks once the decision lands.

## Acceptance criteria

- [ ] An ADR records the chosen scheme and *why* — its collision model, the readability
      trade-off, and whether it preserves chronological/sortable ordering.
- [ ] **Core requirement:** two branches can each capture a new task with no shared counter
      and never collide on a merge.
- [ ] The id stays **human-usable** — short enough to type in `dismiss <id>` / `refine <id>`
      and to read on a board card (today `aw-072` is 6 chars).
- [ ] BC affiliation is preserved or recoverable (today the `aw-` prefix names the BC at a
      glance).
- [ ] The ADR-0012 filename-anchoring guarantee (`alpha-001` never matches `alpha-0010`)
      still holds for the new scheme.
- [ ] **Migration policy is decided:** rewrite existing ids vs. new-scheme-going-forward
      coexistence. If rewrite, the sweep covers filenames, frontmatter, backlinks, INDEX
      lines, `[<id>]` commit-trailer references, and protocol entries.
- [ ] "Never renumber / dismissed ids are retired" (ADR-0022) is restated or replaced under
      the new scheme.
- [ ] Every id-minting call site is updated: `modeling` CAPTURE (the "look at existing files
      to determine the next number" step), `quick-capture`, and `brainstorm`'s foundation
      tasks.

## Notes

**Recommended next step: an architect round** (orchestrator → architect) — this is a
cross-skill identity change, not a single-BC implementation detail.

**Key fork to corner in refine — readable counter vs. opaque token:**
- *Per-branch / per-author prefix over a counter* (e.g. `aw-mh-07`, or a short namespace
  segment) — keeps readability and the BC cue, but needs a per-writer namespace each user
  picks once.
- *Short random / base32 token* (nanoid / ULID-style, e.g. `aw-k3f9q`) — kills collision by
  construction, but hurts typeability and (for pure-random) loses monotonic ordering.
- *Timestamp-prefixed* (ULID) — collision-resistant **and** sortable, at the cost of length.

**Other open questions for refine:**
- **Ordering.** Sequential ints sort chronologically for free; humans read `aw-072` as
  "later than aw-040". Random tokens lose that; ULID/timestamp schemes keep it. (The
  dashboard's mod-date sort uses `mtimeMs`, not the id, so it's unaffected — this is a
  human-readability concern.)
- **Keep `<bc>-`, change only the tail?** Localizes the change and preserves the at-a-glance
  BC prefix — likely the smallest correct change.
- **Migration as a separate `type: chore` child** — a one-time rewrite script, distinct from
  the decision, if the policy is "rewrite existing ids".

**Touch list to scope during refine:** `applyTaskMove` id-resolution (`lib/task-lifecycle.mjs`,
ADR-0012), the `[<id>]` commit-trailer convention (ADR-0026), dismissed-id retirement
(ADR-0022), the dashboard tree projection's `id` field, and the "next number" minting step in
every authoring skill.

Not a frontend task — no styleguide gate. It's a domain/identity decision touching the skills
and `lib/`, with a small dashboard-projection follow-on.
