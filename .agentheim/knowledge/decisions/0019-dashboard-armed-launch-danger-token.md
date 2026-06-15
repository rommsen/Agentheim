---
id: ADR-0019
title: Dashboard armed-launch danger treatment reuses the existing --obligation token, unforked
scope: agentic-workflow
status: accepted
date: 2026-06-15
related_tasks: [agentic-workflow-021, agentic-workflow-030]
related_adrs: [ADR-0018, ADR-0016, ADR-0003, ADR-0015, ADR-0017]
---

# ADR-0019: Armed skip-permissions launch uses --obligation as its danger hue, unforked

## Context

agentic-workflow-021 added a dashboard setting that, when **armed**, makes every
bridge launch request a skip-permissions session (the bridge then seeds
`claude --dangerously-skip-permissions "<prompt>"`, the opt-in contract frozen in
infrastructure-015 / honoured in infrastructure-016, amended ADR-0018). The
amended ADR-0018 mandates a **per-launch indicator**: when armed, each of the four
launch buttons (Quick Capture, Modeling, per-card Refine, per-card Promote) must
carry an at-a-glance "this launch skips permissions" cue, and the shell-header
arming control must read as **danger**, never as a neutral preference.

That requires a danger / warning visual treatment. The styleguide's colour law is
*"quiet by default; colour is reserved for meaning"* (ADR-0003 / ADR-0014). Two
constraints bound the choice:

- The **reserved selection accent** (`--accent-ochre-soft`) is held back for
  selection/brand/focus and must **not** be repurposed (ADR-0016).
- The refinement decision for aw-021 ruled the indicator must be built
  **board-local from existing styleguide tokens, consumed unforked (ADR-0003)**,
  with **no** new design-system child task.

The styleguide token palette has no token *named* "danger". The closest existing
semantic red is the `--obligation` family (`--obligation`, `--obligation-soft`,
with both light and dark variants), originally minted for "tax owed / negative
deltas" in a money domain.

## Decision

The armed-launch danger treatment **reuses the existing `--obligation` token
family**, consumed **unforked** (ADR-0003):

- the shell-header arming toggle, when armed, fills with `--obligation-soft` and
  borders/labels in `--obligation`;
- each launch button, when armed, borders + labels in `--obligation` and shows an
  `--obligation` indicator dot (replacing its idle icon) — the per-launch cue.
  **(Narrowed by aw-030 — see Amendment below: the border + label tint is dropped;
  the dot alone survives as the per-launch cue.)**

No new colour token is minted, no styleguide source is edited, and the **reserved
selection accent is deliberately not touched** (ADR-0016 honoured). The transient
launch/copy feedback flash still uses `--st-done` and wins over the armed
treatment, so feedback always reads.

## Amendment — 2026-06-15 (agentic-workflow-030): per-launch cue narrowed to the dot alone

The Builder found the button-wide red over-painted the board: with the toggle armed,
all four launch buttons turned `--obligation` (border + label) at once, drowning out
the single control that should own the danger signal — the arming toggle. aw-030
**narrows the per-launch cue**:

- A launch button, when armed, **no longer carries** the `--obligation` border or the
  `--obligation` label color. Its body is now **identical to an unarmed button** (the
  normal idle/hover label color + border).
- The **`--obligation` indicator dot stays** — it remains the at-a-glance per-launch
  "this launch skips permissions" flag (with its "skips permissions" `aria-label` /
  `title` wording intact).
- The **arming toggle keeps the full `--obligation` treatment** unchanged — it is now
  the single control wearing the danger hue.

This is a **narrowing, not a reversal**. The amended ADR-0018 mandate — that any
affordance firing a permission-bypass launch show an at-a-glance *per-launch* cue —
**still holds**: the dot satisfies it. The original Decision's first bullet (the
toggle treatment) is unchanged; only the second bullet's "border + label" is reduced
to "dot only." No new token, no styleguide edit, reserved selection accent still
untouched (ADR-0016 honoured).

## Consequences

- **`--obligation` now carries a second meaning** outside its money origin: the
  generic "destructive / danger" red for the dashboard. This is the *correct* hue
  semantically (a saturated red reads as danger), but the token's **name** is
  domain-specific, which is mildly misleading for a future reader.
- Because this repurposes an existing token rather than minting one, there is **no
  new design-system child task** (per the refinement decision). The asymmetry —
  using a money-named token for a danger cue — is **flagged for the design-system
  README** so a future pass can reconcile it into a properly-named shared
  `--danger` token (or alias) rather than leaving an ad-hoc fork. The worker may
  only edit this BC's README, so the reconciliation note is surfaced to the
  orchestrator, not written into the design-system README here.
- The indicator reflects the **armed toggle state, not a live bridge probe** — it
  never probes `/api/bridge` on render (that would break the silent-absence
  contract of ADR-0018 and add a probe to every paint). When the bridge is absent
  the launch silently falls back to a clipboard copy that **cannot** carry the
  bypass (a slash command for a *running* session; the bypass is startup-only), so
  the indicator signals armed **intent**; the bridge-present/absent asymmetry is
  accepted (ADR-0018), not a defect.
- The armed choice is presentation view-state only (a sibling of theme-state.js /
  board-view-state.js, ADR-0015), never a disk lifecycle write — the dashboard
  stays read-only over `.agentheim/` (ADR-0017).
