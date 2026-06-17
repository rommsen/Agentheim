---
id: agentic-workflow-070
title: About-page Ko-fi button uses a solid colour, not a gradient
status: todo
type: refactor
context: agentic-workflow
created: 2026-06-17
completed:
depends_on: [design-system-001]
blocks: []
tags: [dashboard, about, ko-fi, styleguide]
related_adrs: [0003, 0016]
related_research: []
prior_art: [agentic-workflow-062]
---

## Why
The "Buy me a coffee on Ko-fi" button on the About page (`KofiButton`, aw-062) is
filled with a `linear-gradient`. The builder doesn't want the gradient — the button
should read as a flat, opaque colour.

## What
Replace the gradient fill on the `KofiButton` in `dashboard/app/board.js` with a
**solid** fill of the styleguide token `--st-doing` (the gradient's current leading
stop). The button keeps everything else: its label, icon, hover (opacity + shadow),
radius, padding, `--surface-0` text, the external `<a href="https://ko-fi.com/heimeshoff">`,
and the safe `rel`. Still token-based, so it tracks the active light/dark theme — no
new gradient, no fixed hex, no ochre (ADR-0016). The styleguide stays unforked (ADR-0003);
this is a board-local control.

Current line:
`background: "linear-gradient(90deg, var(--st-doing) 0%, var(--st-todo) 100%)"`
→ `background: "var(--st-doing)"`

Rebuild the bundled `dashboard/dist/app.js` (esbuild) so the deployed dashboard carries
the change.

## Acceptance criteria
- [ ] `KofiButton`'s `background` is a solid `var(--st-doing)` — no `linear-gradient`.
- [ ] No other visual property changes (label, icon, hover, radius, padding, text colour, link, rel all unchanged).
- [ ] The colour is a styleguide token (tracks light/dark), not a fixed hex; ochre untouched (ADR-0016).
- [ ] `dashboard/dist/app.js` is rebuilt so the deployed app reflects the change.

## Notes
- Component lives in `dashboard/app/board.js` (`KofiButton`, ~line 1561), consumed by the
  About page's Support card (`AboutCard` 2).
- Builder picked the gradient's start hue (`--st-doing`) as the solid fill over `--st-todo`
  or Ko-fi brand blue (captured 2026-06-17).
- Prior art: the button was introduced in aw-062 (About page).
