---
id: design-system-016
title: Search field + grouped-results popover/listbox styleguide pattern
status: backlog
type: feature
context: design-system
created: 2026-06-16
completed:
commit:
depends_on: [design-system-001]
blocks: [agentic-workflow-050]
tags: [captured, frontend, styleguide, search]
related_adrs: [ADR-0003, ADR-0005]
related_research: []
prior_art: [design-system-005, design-system-006]
---

## Why
The dashboard global search (agentic-workflow-050) needs a **text input that, as you
type, opens a floating panel of results grouped by category** — each row a title plus a
matched-text excerpt, navigable by up/down arrows and chosen by Enter or click. The
styleguide has **no text-input primitive** today (the board prompt-bar `<textarea>` is a
bespoke, board-local control flagged repeatedly as a design-system follow-up) and **no
combobox/listbox results pattern**.

`design-system-015` (todo) extracts a generic `Menu`/`Popover`; its own Notes say to build
it "when a second popover consumer appears." This search affordance **is** that second
consumer — but it is a **richer combobox** (type-ahead input + grouped result rows +
active-descendant keyboard highlight) than a dropdown menu. This task gives the styleguide a
reviewed **search-field + grouped-results** pattern so the dashboard consumes it unforked
(ADR-0003) instead of inventing token-drifting search chrome board-side.

## What
A styleguide search/combobox pattern (likely `styleguide/app/search.js` or `combobox.js`),
authored with htm tagged templates (no JSX, ADR-0005), owning:

- a **token-styled text input** — the styleguide's first input control: placeholder, focus
  ring, a clear affordance, theme-aware (surfaces / type / radii / focus from the token set);
- a **floating results panel** anchored **below the input** at `--shadow-md` elevation,
  dismissed on outside-click and Esc (reuse `design-system-015`'s `Popover` machinery if it
  is built first; otherwise the same elevation + dismiss seam);
- **labelled category groups** in the panel — consistent with the library groups
  (Bounded contexts / Decisions / Research / Tickets);
- **result rows**: a title line + a secondary **excerpt** sub-line (the matched snippet),
  with the matched term marked, token-styled;
- an **active-descendant keyboard model**: up/down moves a single highlight across **all**
  rows (spanning groups), Enter selects, Esc closes/clears; ARIA combobox/listbox roles;
- **body-agnostic / data-driven**: the consumer supplies the grouped result data + an
  `onSelect` callback — the styleguide owns look / placement / keyboard mechanics, the
  consumer owns the data and what selection does (the ds-006 `cornerAction` / ds-005
  `Collapsible` "styleguide owns the look, consumer drives behavior" seam).

## Acceptance criteria
- [ ] A search-field + grouped-results pattern exists in the styleguide as a new module, htm templates (no JSX, ADR-0005), consumed unforked across the BC boundary (ADR-0003).
- [ ] The input is token-styled (surfaces / type / radii / focus), theme-aware, with a placeholder and a clear control.
- [ ] Results render in a floating panel anchored below the input, partitioned into labelled category groups; each row shows a title + a matched-excerpt sub-line with the term marked.
- [ ] Keyboard model: up/down moves a single highlight across all rows (spanning groups), Enter selects the highlighted row, Esc closes/clears; mouse hover + click select the same way. ARIA combobox/listbox semantics.
- [ ] Dismisses on outside-click and Esc; empty-query and no-results states are defined (no dead panel).
- [ ] The pattern is body-agnostic: the consumer supplies grouped result data + `onSelect`; the styleguide owns look / placement / keyboard.
- [ ] The styleguide canvas documents the pattern in context; styleguide + dashboard build/dist tests stay green; the dashboard `dist/` is rebuilt from source (`node build.mjs`).
- [ ] Styleguide gate re-reviewed by the builder (a visible new pattern; ds-005 / 007 / 009 / 014 precedent).

## Notes
- **Consumer:** `agentic-workflow-050` (dashboard global search). This is the styleguide-capability
  half; the `/api/search` backend, topbar wiring, and main-pane routing are aw-050's job —
  mirrors the ds-014 → aw-047 and ds-009 → aw-039 ordering.
- **Relationship to design-system-015 (Menu/Popover):** the search panel is the "second popover
  consumer" ds-015 anticipated. Decide at refine whether to (a) build ds-015 first and compose
  the floating-panel + dismiss from it, or (b) build this standalone and retrofit. A combobox is
  richer than a menu (type-ahead input + grouped rows + active-descendant), so this stays a
  distinct pattern either way.
- **Shared text-input question:** the styleguide still has no input primitive (the board prompt-bar
  textarea is bespoke). This task could also become the home for a shared input, or stay
  search-scoped — corner at refine.
- Seam precedent: ds-006 `cornerAction` render-prop, ds-005 `Collapsible` (controlled/uncontrolled).
