---
id: ADR-0020
title: Board prompt-bar confetti is a board-local transient ACK, not a styleguide motion primitive
scope: agentic-workflow
status: accepted
date: 2026-06-15
related_tasks: [agentic-workflow-023, agentic-workflow-034]
related_adrs: [ADR-0014, ADR-0016, ADR-0003, ADR-0009, ADR-0001]
---

# ADR-0020: The prompt-bar confetti lives board-local, not in the styleguide motion vocabulary

## Context

agentic-workflow-023 gave the board a prompt bar: a textarea plus the relocated
Quick Capture / Modeling launch buttons. The builder asked that, on a successful
launch or landed clipboard copy, the textarea **clear** and a **confetti
animation** play to mark the clearance.

The dashboard consumes the design-system styleguide as the single source of UI
truth, **unforked** (ADR-0003); its token CSS (`colors_and_type.css`,
`agentheim.css`) is copied verbatim into `dashboard/dist/` by the build, never
edited from the dashboard side (ADR-0009 / the build pipeline). The styleguide
already owns one piece of motion vocabulary — the doing-card **ambient pulse**
(ADR-0014), with its `--duration-ambient` token and a `@keyframes` defined in the
styleguide CSS. ADR-0014 also set the standing contract that *ambient motion is a
status SIGNAL* and must be quiet, palette-only, and strippable to a static
baseline under `prefers-reduced-motion`.

That raised the question: should the confetti become a second entry in the
styleguide's motion vocabulary (a shared "celebration" keyframe + token), the way
the doing-pulse did?

## Decision

**The confetti stays board-local — it is NOT added to the styleguide.**

1. **It is a transient ACK, not a status signal.** ADR-0014 admits *ambient,
   looping* motion as a channel for **status** (a card *is* in `doing/`). Confetti
   is the opposite: a one-shot acknowledgement that an *action* just succeeded
   (the bar cleared). It carries no status, loops nothing, and vanishes. Folding
   it into the same vocabulary as the status-pulse would blur the very distinction
   ADR-0014 drew, so it is kept out of the styleguide's motion language.

2. **Board-local CSS, injected once.** The confetti `@keyframes` and piece class
   are injected into `document.head` exactly once by the board
   (`ensureConfettiStyle`, idempotent on an id), not written into the styleguide
   CSS — because that CSS is copied verbatim from the design-system source and the
   worker may not edit another BC. This keeps the styleguide consumed **unforked**
   (ADR-0003): the board adds its own behaviour beside the primitives (the same
   precedent as the board-local sort `<select>` / group toggle / prompt textarea),
   it does not fork or extend them.

3. **It honours ADR-0014's strip-to-plain contract.** Under
   `prefers-reduced-motion: reduce` the burst renders **nothing** — the
   `BoardConfetti` component checks `matchMedia` and mounts no pieces, and the CSS
   also suppresses the animation (belt and suspenders). The clearance is still a
   complete, legible ACK without the motion (the textarea simply empties), so the
   confetti is pure progressive enhancement.

4. **Palette discipline.** The pieces draw only from existing **status-palette**
   tokens (`--st-done` / `--st-todo` / `--st-backlog` / `--fg-3`). They
   deliberately avoid the **reserved selection accent** `--accent-ochre-soft`
   (ADR-0016) and the **`--obligation`** skip-permissions danger hue (ADR-0019 /
   aw-021), so a celebratory flourish can never be misread as a selection or a
   danger cue.

5. **No lifecycle write.** Clearing the textarea and playing confetti are local
   presentation effects; the board stays a projection of disk (ADR-0001).

## Consequences

**Positive**
- The status-vs-ACK distinction ADR-0014 established stays sharp: looping motion =
  status; one-shot motion = action acknowledgement, kept in separate homes.
- The styleguide remains consumed unforked; no cross-BC edit was needed to ship a
  board feature.
- Reduced-motion users get a fully functional, motionless clearance.

**Negative / cost**
- A **second** confetti surface (anywhere a future celebration is wanted) would
  duplicate this board-local treatment. That is the explicit trigger to promote a
  shared **celebration-motion** primitive into the design-system — filed as a
  non-blocking design-system follow-up by aw-023. Until a second surface exists,
  promoting it now would be speculative.
- Board-local injected CSS is a small departure from "all tokens/CSS come from the
  styleguide", justified by the unforked-consumption constraint; it is scoped to
  one idempotent style block and uses styleguide tokens for every value.

## Alternatives considered

- **Add a shared `--duration-celebrate` token + `@keyframes` to the styleguide**
  (mirroring the doing-pulse). Declined now: it is a single consumer, and the
  worker cannot edit the design-system BC; promoting it on first use would also
  conflate ACK motion with ADR-0014's status motion. Deferred to a design-system
  follow-up once a second surface needs it.
- **No confetti — clear the textarea silently.** Declined: the builder explicitly
  asked for a celebratory clearance cue; reduced-motion users already get exactly
  this (the silent clear) as the strip-to-plain baseline.
- **Use the `--obligation` / `--accent-ochre` hues for visual punch.** Declined:
  both are reserved (danger / selection); a celebration must not borrow them.

## Amendment (agentic-workflow-034, 2026-06-15)

The builder found the hand-rolled CSS-keyframe burst underwhelming and asked for
the real particle physics of **canvas-confetti**. aw-034 reimplements the
celebration over canvas-confetti. This amendment records what changed and, just as
importantly, what still binds — it does **not** supersede this ADR.

**What changed:**

1. **CSS-keyframe → canvas-confetti (decision #2 reversed).** The
   `ensureConfettiStyle` injected `@keyframes` rule and the
   `.agentheim-confetti-piece` DOM-span rendering are **removed**. `BoardConfetti`
   now drives a single **canvas-confetti** call on remount (`fireConfetti`). The
   original "board-local CSS, injected once" mechanism is gone; the burst is now
   drawn on canvas-confetti's own canvas.

2. **First bundled frontend RUNTIME dependency.** canvas-confetti is added to
   `dashboard/package.json` `devDependencies` (pinned `^1.9.4`) and `import`ed in
   `dashboard/app/board.js`, so esbuild folds it into the committed
   `dashboard/dist/app.js` (`bundle: true`, `nodePaths` → `dashboard/node_modules`).
   react / react-dom / marked / htm are framework/render infrastructure;
   canvas-confetti is the dashboard's **first bundled frontend runtime dependency**
   that exists purely for a board feature. **No CDN / no runtime network fetch** —
   the dashboard runs offline on `127.0.0.1` (the original dependency-free rationale
   is preserved by *bundling*, not by avoiding the library).

3. **Full-window footprint — "board-local" meant ownership, not pixels.** The
   celebration now uses canvas-confetti's **default global `confetti()`** (a fixed
   full-viewport canvas, `pointer-events: none`, above content, auto-cleared),
   firing from an **origin near the prompt-bar buttons** so particles rain across
   the page — the dramatic upgrade the builder wanted, over the old
   contained-over-the-buttons footprint. This clarifies the original "board-local"
   clause: it always meant **ownership** (the board injects/owns the call, it is
   consumed within the BC) and **not-a-DS-primitive**, NOT a literal pixel footprint.
   The confetti is still **not** promoted to a styleguide motion primitive and files
   **no** design-system child task (decision #1 and the consequences/alternatives
   stand — a shared primitive still waits for a second surface).

4. **Palette is now the four status bases, resolved at fire time, theme-aware
   (decision #4 refined).** canvas-confetti draws on a JS `<canvas>` and cannot
   consume `var(--st-done)`; it needs concrete color strings. The palette is read at
   **fire time** via `getComputedStyle(document.documentElement).getPropertyValue('--st-…')`
   (trimmed) from the four status bases — `--st-done` / `--st-todo` / `--st-doing` /
   `--st-backlog`. This **drops** the old muted `--fg-3` grey and **adds** the warm
   `--st-doing` amber for a livelier spread. Resolving at fire time means the burst
   tracks the active **light/dark theme** for free and stays a true *projection* of
   the styleguide tokens (ADR-0003), not a forked hard-coded list. The reserved
   selection accent `--accent-ochre-soft` (ADR-0016) and the `--obligation`
   skip-permissions hue (ADR-0019 / aw-021) remain excluded **by construction** —
   neither is a status base.

**What still binds (unchanged):**

- **ADR-0014's reduced-motion silence.** Under `prefers-reduced-motion: reduce` the
  celebration renders **nothing**: `BoardConfetti`'s `matchMedia` guard wraps the
  fire path, so `confetti()` is **never invoked** under reduce (decision #3 holds).
- **Transient ACK, not status** (decision #1) and **no lifecycle write** (decision
  #5): the celebration is still a one-shot acknowledgement on a successful launch /
  landed copy (and the aw-025 replay button), fired by the unchanged `confettiKey`
  remount path; it performs no launch, bridge call, clipboard copy, textarea clear,
  or lifecycle write beyond the visual (ADR-0001 / ADR-0017).

The exact canvas-confetti tuning (`particleCount` / `spread` / `startVelocity` /
`gravity` / `scalar` and the precise normalized origin) is an iteration target,
dialed in via the aw-025 replay button.
