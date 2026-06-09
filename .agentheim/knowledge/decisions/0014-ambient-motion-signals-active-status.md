---
id: ADR-0014
title: Ambient motion may signal active status — the doing-card pulse
scope: design-system
status: accepted
date: 2026-06-09
related_tasks: [design-system-004]
---

# ADR-0014: Ambient motion may signal active status — the doing-card pulse

## Context

The styleguide's visual law is *"quiet by default; color is used only to signal
**ticket status** and **content type**."* Until now, status was carried by **hue
alone** — each status has an `--st-*` rail/chip color — and **all motion in the
system was transition-only**: short, event-triggered eases (`--duration-fast` /
`--duration-base`) on hover, theme flip, drawer open. There were **no
`@keyframes`** anywhere; nothing looped.

This left a gap. A ticket in the **doing** column should read, at a glance, as
*actively being worked on*. But the doing rail's ochre (`--st-doing`) is, in
"liveness," indistinguishable from the static backlog/todo/done rails — the
doing column looks like just another static pile. `design-system-004` asked for
a treatment that makes "in the doing column" legible as *alive*.

The honest signal is **status**, not a live-process marker. The dashboard reads
disk state via `/api/tree` — it knows which lifecycle folder a task sits in, not
whether a worker process is running this second. So `status === "doing"` ("in the
`doing/` folder") *is* the truthful proxy for actively-worked, and the treatment
keys off it — never off the `agent` field.

Two forks were settled during refinement: **intensity** → a *calm* pulse, not a
loud rotating/glowing background (the loud option was explicitly declined);
**reduced-motion** → strip to a *plain* card, no static-glow fallback.

## Decision

**Ambient (continuous, looping) motion is now an admissible status signal** — a
deliberate, scoped extension of the visual law. Motion, not just hue, may carry a
status signal, *provided it stays quiet*: low amplitude, slow cadence, and drawing
**only** from the status's existing color family (no new hue). This is the
system's **first continuous animation** and its **first `@keyframes`**.

Concretely, the doing-card treatment:

1. **A breathing glow on the ochre status rail.** `@keyframes ambient-rail-pulse`
   (in `styles/agentheim.css`, beside the status palette it draws from) animates
   the rail's `opacity` (0.9 → 0.62 → 0.9) and a soft `box-shadow` glow that
   `color-mix`es **`--st-doing`** in and out. Opacity + box-shadow only — cheap to
   composite continuously. **Ochre-only:** no hue outside the doing status family
   is introduced, so "color used only to signal status" still holds.

2. **The first loop motion token — `--duration-ambient`.** Added to the motion
   block in `styles/colors_and_type.css` beside `--ease-base` /`--duration-fast`
   / `--duration-base`, value `2600ms` — a slow "breathing" cadence chosen to read
   as alive in peripheral vision, never as a blink. The cadence is a token, not a
   magic inline number; transition durations and the ambient loop now live in one
   motion vocabulary.

3. **Status-keyed in one place.** A framework-free helper
   `doingPulseClass(status)` (`app/motion.js`, re-exported from `app/kanban.js`)
   returns `"ticket-rail--pulse"` iff `status === "doing"`, else `""`. The
   styleguide `TicketCard` puts that class on the rail span. **Single source
   (ADR-0003):** the dashboard imports `TicketCard` unforked
   (`dashboard/app/board.js`), so the pulse appears on the live board's doing
   column with **zero dashboard-side change**.

4. **Reduced-motion strips to a plain card.** Under
   `@media (prefers-reduced-motion: reduce)` the `.ticket-rail--pulse` rule is
   fully suppressed — `animation: none`, no residual `box-shadow` glow, rail back
   to its normal ochre at opacity 0.9. The pulse is **pure progressive
   enhancement**: the rail *color* still conveys "doing," so nothing is lost. This
   is the standing contract for any future ambient motion — **ambient motion is
   always strippable to a static, still-legible baseline.**

**Scope guard.** The pulse rides the **rail** variant only (the `badge` variant
has no rail). In practice doing cards render rail-variant on both the canvas and
the dashboard board, so this covers every live surface; a doing *badge* card
(used only as a documentation alternative in the styleguide) shows no pulse, by
design — extending it there is out of scope until a surface needs it.

## Consequences

**Positive**
- The doing column reads as alive at a glance without breaking the quiet-by-default
  law: low amplitude, ochre-only, slow cadence.
- One place to build (the styleguide `TicketCard`), both surfaces (canvas +
  dashboard) inherit it — no dashboard fork.
- Establishes a reusable, named ambient-motion vocabulary: the `--duration-ambient`
  token and the strip-to-plain reduced-motion contract for any future ambient cue.

**Negative / cost**
- The visual law now admits *motion* as a status channel, not just hue — a small
  but real widening of the language. Future ambient motion must clear the same bar
  (quiet, palette-only, strippable) or it erodes the law.
- The committed dashboard `dist/` is a derived artifact (ADR-0003) and must be
  **rebuilt** for the live board to show the pulse; the styleguide source change
  alone does not update the served bundle. (Rebuild owned by infrastructure's
  build pipeline, not by this task.)
- Editing the gated styleguide source/canvas lightly **reopens the styleguide
  gate** — the builder re-reviews the doing-card state on the canvas (section 06 +
  the live board in 05) before this is final.

**Neutral**
- `box-shadow`/`opacity` keyframes are compositor-friendly; the continuous animation
  is effectively free on the GPU and pauses when the tab is backgrounded.

## Alternatives considered

- **Loud rotating / glowing background** (the original capture's literal ask).
  Rejected at refinement: it shouts, breaking quiet-by-default.
- **Gate on a live-`agent` marker** instead of status. Rejected: `/api/tree` cannot
  truthfully know a worker is live this second; status-in-`doing/` is the honest
  proxy.
- **Reduced-motion → static glow** (a dimmed non-animated halo). Rejected: motion
  is enhancement-only and the rail color already conveys "doing"; a residual glow
  would add a second always-on signal for no gain.
- **CSS transition trick instead of `@keyframes`.** Rejected: a loop is what's
  wanted; `@keyframes` is the natural, legible fit (and the system's first).
