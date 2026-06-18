---
id: design-system-r4k8m
title: Add an inquiry/question glyph to the shared icon set
status: todo
type: feature
context: design-system
created: 2026-06-18
completed:
depends_on: []
blocks: [agentic-workflow-h7n2c]
tags: [icons, frontend, ui]
related_adrs: [0003]
related_research: []
prior_art: [design-system-017]
---

## Why
The board prompt bar is gaining an **Inquire** launch card (agentic-workflow-h7n2c) that
fires the `inquire` skill — "ask a question toward the codebase". Its sibling cards use
`plus` (Quick Capture), `compass` (Modeling) and `search` (Research). There is **no**
question/inquiry glyph in the shared icon registry today, and `search` / `compass` are
already taken by the neighbouring cards — so the new card has nothing to wear. This is the
exact gap design-system-017 closed for the dismiss trash can.

## What
Add one lucide glyph to the shared icon set
(`contexts/design-system/styleguide/app/icons.js`) that reads as "ask a question". The
natural fit is lucide **`message-circle-question`** (a chat bubble carrying a question mark)
— a question-mark glyph distinct from `search` and `compass`. `circle-help` is an
acceptable fallback. Mirror the existing registry entries (key → inner SVG path string) and
the `node --test` coverage pattern (`styleguide/test/icons-trash.test.mjs` is the ds-017
precedent). Consumed unforked by the dashboard (ADR-0003).

## Acceptance criteria
- [ ] A new glyph keyed for inquiry (e.g. `message-circle-question`) exists in `icons.js`,
      its inner SVG path matching the lucide source, sitting alongside the other 24×24
      stroke glyphs.
- [ ] The glyph renders through the shared `Icon` component unchanged (no new prop, no fork).
- [ ] A `node --test` guard asserts the glyph is registered and renders (the
      `icons-trash.test.mjs` shape).
- [ ] The styleguide icon gallery / canvas shows the new glyph (if the gallery enumerates
      the registry).

## Notes
- Precedent: design-system-017 added `trash-2` the same way for the board dismiss button.
- Pick the glyph key the dashboard task (aw-h7n2c) will import; keep the two in sync.
- This unblocks agentic-workflow-h7n2c — that task wires the Inquire card and consumes
  this glyph by name.
