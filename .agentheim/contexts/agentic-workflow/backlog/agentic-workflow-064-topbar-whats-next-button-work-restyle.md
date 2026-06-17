---
id: agentic-workflow-064
title: Topbar "What's next" launch button + Work button restyle (accent fill, trailing ↗)
status: backlog
type: feature
context: agentic-workflow
created: 2026-06-17
completed:
commit:
depends_on: [design-system-001]
blocks: []
tags: [dashboard, frontend, topbar, ui]
related_adrs: [0016, 0003, 0018, 0017]
related_research: []
prior_art: [agentic-workflow-053, agentic-workflow-033, agentic-workflow-024, agentic-workflow-049]
related_tasks: [agentic-workflow-031]
---

## Why
A screenshot mock the builder produced (root `Screenshot 2026-06-17 112241.png`) reshapes
the topbar's right edge. Today it reads `[ search ] … [ ⚙ ] [ Work ]` (aw-053). The design
adds a third standing action — **"What's next"** — and gives **Work** a louder, accent
treatment so the primary launch reads as the page's main call to action.

## What
Adjust the main-column topbar (`BoardTopbar` in `dashboard/app/board.js`) so its right
group reflects the mock, left → right: `[ ⚙ gear ] [ What's next ] [ Work ↗ ]`.

1. **"What's next" button** — a new standing button between the settings gear and Work,
   carrying a sun glyph (the mock's sun/`sun`-style icon). It **launches a seeded Claude
   session** through the existing VS Code bridge (`launchOrCopy`, like Work and Stop
   dashboard — ADR-0018), with the silent clipboard fallback when the bridge is absent.
   The session generates a "what next" overview of sensible next steps. It threads the
   armed `skipPermissions` signal like the other launches, and passes no `onResult`.
   - Emphasis sits **between** the quiet gear and the primary Work — a bordered secondary
     button (the mock shows a hairline-bordered chip with the sun icon + label).

2. **Work restyle** — the primary Work launch (`LaunchButton label="Work"
   emphasis="primary"`) gets the mock's treatment: an **accent-filled** button with the
   arrow glyph moved to the **right** of the label and rendered as an **up-right diagonal**
   (the `square-arrow-out-up-right` glyph the registry already carries, used by aw-062),
   reading `Work ↗`. Behaviour (bare `/agentheim:work` via `launchOrCopy`, theme-following,
   threads `skipPermissions`) is unchanged — only the fill, the icon glyph, and its
   left→right order change.

## Acceptance criteria
- [ ] The topbar right group renders `[ ⚙ ] [ What's next ] [ Work ↗ ]`, flush-right
      (the aw-053 `marginLeft:auto` group), search field still left-anchored.
- [ ] "What's next" fires a seeded session via `launchOrCopy` (bridge → terminal; silent
      clipboard fallback when absent), threading `skipPermissions` when armed; it never
      writes lifecycle state (read-only, ADR-0017).
- [ ] Work shows the accent fill, label, then a trailing up-right arrow glyph; its launch
      behaviour and theme-following are byte-unchanged apart from the icon glyph + side.
- [ ] Styleguide consumed unforked (ADR-0003); no new styleguide primitive forked for
      either button.
- [ ] `dashboard/dist/app.js` rebuilt (esbuild) so the deployed app carries the change.
- [ ] Pure logic (any new command constant/builder) unit-tested under `node --test`.

## Notes
**Open question — the "What's next" command.** The button launches a session, but there is
no dedicated skill yet. The *process* that produces a next-steps overview is itself a
backlog item, **aw-031** ("Next-steps overview when work is done"), still unrefined. This
task should align the seeded command with whatever aw-031's refinement settles on; until
then it can fire an interim seeded prompt. Refinement should decide whether to (a) ship an
interim prompt now and align later, or (b) make this depend on aw-031 producing the skill.

**Open question — the accent fill (token tension).** The mock paints Work (and, in aw-065,
Quick Capture) in an ochre/orange accent. The styleguide's `--accent-ochre-soft` is
**reserved for the selection accent** by **ADR-0016**, and the BC already has a precedent
(ADR-0019) of repurposing a reserved token for a new role and flagging it for the
design-system to reconcile. Refinement must decide: reuse `--accent-ochre-soft` (and file
the reconciliation), or introduce a distinct accent token in the design-system first. This
may warrant a small `type: decision` task or design-system child. Do not silently consume
the reserved selection accent without recording the choice.

Frontend task — gated on the approved styleguide (`design-system-001`, done). Shares the
`dashboard/dist/app.js` bundle with aw-065, so the two cannot build in parallel (the `work`
skill conflict-serializes shared-dist tasks).
</content>
</invoke>
