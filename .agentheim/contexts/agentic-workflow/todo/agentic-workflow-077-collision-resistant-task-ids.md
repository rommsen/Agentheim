---
id: agentic-workflow-077
title: Collision-resistant task IDs for multi-user / multi-branch work (replace sequential integers)
status: todo
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
id scheme** (ADR-0028, `scope: global`); the implementation sweep splits out into child
tasks **once the decision lands** (see *Child tasks* below — created at that point, not now).

### Decisions already taken (refinement, 2026-06-17)

- **Migration policy: go-forward coexistence (FIXED by the builder).** Existing ids
  `agentic-workflow-001`…`-077` (and all `design-system-*` / `infrastructure-*`) stay
  **exactly as they are** — **no rewrite sweep**, no history-touching migration. Only *new*
  captures use the new scheme; the two id shapes coexist permanently. Legacy `[id]` commit
  trailers stay valid. This is a hard constraint on the scheme: it **must** live alongside
  legacy `<bc>-NNN` ids without ambiguity.
- **Scheme direction: short random token (architect recommendation, scheme B).** The only
  zero-coordination candidate, collision-free by construction, short against the
  already-long BC prefix, and it coexists with legacy ids via a single structural tell
  (leading letter vs all-digit tail). Ratified by ADR-0028 when this task is worked.

## Acceptance criteria

- [ ] **ADR-0028 (`scope: global`)** records the chosen scheme and *why* — its collision
      model, the readability trade-off, the (lack of) chronological ordering, and that it
      coexists with legacy sequential ids. It **amends ADR-0022 §5** (retirement) and
      **cross-links ADR-0012** (filename-anchored resolution). Written when this task is
      worked, not before.
- [ ] **Core requirement:** two branches can each capture a new task with no shared counter
      and never collide on a merge.
- [ ] New captures mint ids as `<bc>-<token>`, token = **exactly 5 chars** from Crockford
      base32 lowercase minus look-alikes (`0123456789abcdefghjkmnpqrstvwxyz`), **first char
      a letter** (`[a-hjkmnp-z]`), lowercase only. (Architect proposes 5 chars + leading
      letter; the ADR ratifies — 6 chars is the belt-and-braces alternative at one extra
      keystroke. See *Open questions for the ADR*.)
- [ ] The id stays **human-usable** — short enough to type in `dismiss <id>` / `refine <id>`
      and read on a board card (e.g. `agentic-workflow-k3f9q`, only 2 chars longer than the
      legacy `agentic-workflow-077`).
- [ ] BC affiliation is preserved (the `<bc>-` prefix still names the BC at a glance).
- [ ] **Legacy ids are untouched** on disk and in frontmatter — no rewrite performed
      (go-forward coexistence).
- [ ] `deriveContext(id)` (`lib/task-lifecycle.mjs`) returns the correct BC for **both** a
      legacy all-digit tail **and** a new leading-letter token tail. The current
      `/^(.*)-\d+/` is replaced with a dual-shape match, e.g.
      `/^(.*)-(?:\d+|[a-hjkmnp-z][0-9a-hjkmnp-z]{4})$/`, using `m[1]` as the BC. Covered by a
      test asserting both `agentic-workflow-077` and `agentic-workflow-k3f9q` derive
      `agentic-workflow`.
- [ ] `resolveTaskFile` resolves **both** id shapes via its existing trailing-`-` anchor,
      with no prefix collision between a token and a longer string (ADR-0012's
      `alpha-001` ≠ `alpha-0010` guarantee now also disambiguates legacy vs new). Covered by
      a test.
- [ ] **Dismissed-id retirement (ADR-0022) is restated** under the new scheme: there is no
      "next free number"; tokens are random and never regenerated (the generator never
      consults history), so "never reuse, never renumber" holds **by construction**. The
      legacy clause stays as written for legacy ids.
- [ ] Every id-minting call site in the **three live skills** is updated to the token-emit
      instruction: `skills/modeling/SKILL.md` (CAPTURE's "scan existing files to determine the
      next number" step), `skills/quick-capture/SKILL.md`, and `skills/brainstorm/` (its
      greenfield foundation tasks). Eval fixtures under `capture-workspace/` are **explicitly
      left unchanged** (they are snapshots/fixtures, not a live skill).
- [ ] **Well-known foundation-id references resolved:** the styleguide gate hard-codes the id
      `design-system-001-styleguide` in `skills/modeling/SKILL.md` and `skills/brainstorm/`
      ("every frontend task must list `design-system-001-styleguide` in `depends_on`"). The
      ADR must decide how that reference survives when `brainstorm` mints a *random* token
      for the styleguide task in a new project — e.g. reserve a deterministic well-known id
      for foundation tasks, or have `brainstorm` record the minted id and skills look it up
      dynamically. (Not a problem for *this* repo, where `design-system-001-styleguide`
      already exists as a legacy id and is kept — but it is a problem for any new project.)
- [ ] A minted token is greppable as a commit trailer `[<bc>-<token>]` (ADR-0026 unchanged).

## Notes

### Architect round (2026-06-17) — recommendation

Scored A/B/C against the hard requirements; **scheme B (short random token)** won:

| Scheme | Collision-free | Readability vs long BC prefix | Ordering | Coexists w/ legacy | Mint complexity |
|---|---|---|---|---|---|
| **A** per-author/branch prefix (`aw-mh-07`) | by discipline, not construction | good | within-author only | extra segment to parse | needs per-writer namespace chosen once |
| **B** short random token (`aw-k3f9q`) ✅ | **by construction** | **good** (5 chars) | none | **clean** (leading-letter tell) | trivial — emit a token |
| **C** ULID/timestamp (`aw-01JZ8K3F9Q`) | by construction | poor (long) | **global, sortable** | clean | trivial |

The BC prefix is already the **full BC name** (`agentic-workflow-`, 17 chars) — `aw-` is
prose shorthand only — so length matters and ULID's extra length hurts most here. Lost
chronological ordering (B's only real cost) is acceptable: the dashboard already sorts by
`mtimeMs`, not by id (aw-013), so id ordering is a human-readability nicety, not a
mechanism.

### Proposed id grammar (ADR-0028 to ratify)

- Format `<bc>-<token>`; token = 5 chars from `[0-9a-hjkmnp-tv-z]`, **first char a letter**.
- Example: `agentic-workflow-k3f9q` (22 chars vs legacy `agentic-workflow-077`'s 20).
- On-disk filename unchanged: `agentic-workflow-k3f9q-collision-resistant-task-ids.md`.
- **Disambiguation tell:** legacy tail is all digits; new tail leads with a letter. Parsers
  key on "is the first char after the last `-` a letter?".

### Touch points (grounded against the implementation)

- `lib/task-lifecycle.mjs` — `deriveContext` (line ~240, `/^(.*)-\d+/`) is the **one** code
  change; `resolveTaskFile` (line ~64) needs **no change** — its trailing-`-` anchor already
  works for both shapes.
- `skills/modeling/SKILL.md`, `skills/quick-capture/SKILL.md`, `skills/brainstorm/` — the
  minting-instruction prose (ID convention sections).
- ADR-0026 commit trailer — unchanged (token is greppable).
- Dashboard `id` projection — unchanged (carries the id verbatim).

### Open questions for the ADR (defaults proposed, ADR ratifies)

- **5 vs 6 chars.** 5 → ~0.004% collision over a realistic concurrent window (n≈50),
  ~1.7% at an implausible n=1000; 6 → ~887M space at one extra keystroke. Architect
  recommends **5**.
- **Leading-letter rule** as the disambiguation tell (vs "tail contains ≥1 letter", which is
  a weaker parser signal). Architect recommends **leading-letter**.
- **Well-known foundation ids** (the `design-system-001-styleguide` gate reference) — see the
  matching acceptance criterion. The genuinely open design call in this decision.

### Child tasks (created when the decision lands — NOT now)

Once ADR-0028 is written, split the implementation out:
1. `type: refactor` — `deriveContext` dual-shape regex in `lib/task-lifecycle.mjs` + tests
   (both shapes derive the right BC; `resolveTaskFile` resolves both). Smallest, ships first.
2. `type: chore` — minting-call-site sweep across the three live skills; leave
   `capture-workspace/` fixtures alone.
3. `type: chore` — author ADR-0028, amend ADR-0022 §5, cross-link ADR-0012 (may fold into the
   task that lands the grammar).
4. *(optional)* a CI lint grepping for duplicate ids — insurance, not required for v1.

**No migration-rewrite child** — go-forward coexistence is fixed.

Not a frontend task — no styleguide gate. It's a domain/identity decision touching the skills
and `lib/`, with no dashboard-projection change.
