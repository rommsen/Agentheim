---
id: agentic-workflow-065
title: Prompt-bar buttons redesign — icon tile + title/subtitle cards, Quick Capture emphasised, ⌘↵ hint
status: backlog
type: feature
context: agentic-workflow
created: 2026-06-17
completed:
commit:
depends_on: [design-system-001]
blocks: []
tags: [dashboard, frontend, prompt-bar, ui]
related_adrs: [0003, 0016, 0020]
related_research: []
prior_art: [agentic-workflow-036, agentic-workflow-023, agentic-workflow-038, agentic-workflow-054, agentic-workflow-030]
---

## Why
A screenshot mock the builder produced (root `Screenshot 2026-06-17 112241.png`) reshapes
the three launch buttons beneath the prompt field. Today they are three small flat chips
(`Quick Capture` / `Modeling` / `Research`, aw-023/aw-036). The design upgrades them into
richer cards so the "type a prompt, then choose how to file it" intent reads clearly.

## What
Restyle the `BoardPromptBar` launch row in `dashboard/app/board.js`. **Interaction is
unchanged** — each button still launches its own session on click (aw-023's
`launchOrCopy` + the per-button seeded command, the armed-`skipPermissions` threading,
the confetti-on-success). This is a **visual restyle only**, no selection model and no
Enter-to-launch (aw-038's swallowed Enter stays as-is).

Each of the three buttons becomes a card with:
1. A **square icon tile** on the left (the mock: a filled accent `+` tile for Quick
   Capture, a target/concentric `Modeling` glyph, a magnifier for Research).
2. A **two-line label** — a bold title over a quiet subtitle:
   - **Quick Capture** / "File it fast"
   - **Modeling** / "Shape into structure"
   - **Research** / "Dig deeper"
3. **Quick Capture carries the emphasised (accent) treatment** — the mock shows it
   filled/active in ochre with the others quiet/bordered. This is *emphasis*, not a
   selected state (there is no selection behaviour).

To the **right of the row**, a quiet helper: the text **"Type a prompt to begin"** and a
**⌘↵** keyboard-shortcut chip. Per the captured decision this hint is **decorative** — it
does not wire Enter/⌘↵ to a launch (consistent with aw-038 swallowing Enter in the field).

## Acceptance criteria
- [ ] The three buttons render as icon-tile + title + subtitle cards with the copy above.
- [ ] Clicking any button still launches its own seeded session (Quick Capture /
      Modeling / Research commands unchanged), with the silent clipboard fallback,
      armed-`skipPermissions` threading, and the success confetti all preserved.
- [ ] Quick Capture wears the emphasised accent treatment; Modeling and Research are
      quiet/secondary. No selected-state logic is introduced.
- [ ] The right-side "Type a prompt to begin" + ⌘↵ hint renders as shown and is
      decorative — Enter/⌘↵ launches nothing (aw-038's swallowed Enter is untouched).
- [ ] Styleguide consumed unforked (ADR-0003); the buttons stay board-local, token-styled
      composites — no styleguide primitive forked.
- [ ] `dashboard/dist/app.js` rebuilt (esbuild) so the deployed app carries the change.

## Notes
**Open question — the accent fill (token tension).** Quick Capture's ochre/accent
emphasis (and Work's, in aw-064) leans on a colour the styleguide reserves: ADR-0016 keeps
`--accent-ochre-soft` for the **selection** accent. Refinement must decide whether to reuse
it (and file the design-system reconciliation, per the ADR-0019 precedent) or add a
distinct accent token first. This pairs with aw-064 — settle the accent once for both.

**⌘↵ decorative, by decision.** A keyboard hint that fires nothing is a deliberate choice
(captured 2026-06-17): the restyle does not change the launch model. If the builder later
wants Enter/⌘↵ to actually launch a selected mode, that is a separate behavioural task that
would reverse aw-038.

Frontend task — gated on the approved styleguide (`design-system-001`, done). Shares the
`dashboard/dist/app.js` bundle with aw-064, so the two cannot build in parallel (the `work`
skill conflict-serializes shared-dist tasks).
</content>
