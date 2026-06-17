---
id: design-system-021
title: Concept content-type — registry entry + glyph + --ct-concept tokens for the library/search type
status: backlog
type: feature
context: design-system
created: 2026-06-17
completed:
depends_on: [design-system-001-styleguide]
blocks: [agentic-workflow-075]
tags: [styleguide, icons, content-types, frontend]
related_adrs: [0003, 0016]
related_research: []
prior_art: [design-system-017, design-system-001]
---

## Why
aw-075 makes **Concepts** a first-class artifact kind in the dashboard's two discovery
surfaces (left-rail nav group + search category). The rail renders each library row through
the styleguide `TreeItem`, which does `const t = CONTENT_TYPES[item.type]` and then
`<Icon name=${t.icon} color=${t.color} />`. `CONTENT_TYPES` (`styleguide/app/data.js`) today
has only `ticket | context | vision | map | research | adr` — **no `concept`** — so a
`type: 'concept'` row would dereference `t.icon` on `undefined` and **throw**. The icon
registry (`styleguide/app/icons.js`) also has **no concept-suitable glyph** (no lightbulb /
sparkles / network; the full set today is arrow-right, bot, box, chevron-right, compass,
copy, file-text, flask-conical, folder, folder-git-2, git-commit-horizontal, git-fork,
inbox, library, maximize, moon, plus, scale, search, settings-2, square-arrow-out-up-right,
square-kanban, sun, trash-2).

Per ADR-0003 the dashboard consumes the styleguide **unforked**, and ds-017's lesson is that
even a one-entry glyph add to `icons.js` is a styleguide change that reopens the gate. So the
new content-type must land in the primitive first — the ds-009→aw-039 / ds-014→aw-047 /
ds-016→aw-052 / ds-020→aw-074 "styleguide-capability-first" precedent. This is aw-075's hard
dependency: without it the Concepts rail group cannot render a single row.

## What
Make `concept` a first-class **content type** in the styleguide registry, so any consumer
emitting `{ type: 'concept' }` gets a distinct icon + color at a glance — mirroring the five
existing non-task types (context / vision / map / research / adr).

1. **Glyph.** Add a concept glyph to the `icons.js` LUCIDE map. **Proposed: `lightbulb`**
   (concept = idea / insight / synthesis); runner-up `notebook-pen` (a synthesis is a
   written-up note). Final glyph is a **gate decision** at styleguide review. Worker verifies
   the Lucide path geometry against the pinned Lucide version when adding (the ds-017/ds-020
   discipline).
2. **Registry entry.** Add a `concept` entry to `CONTENT_TYPES` (`data.js`):
   `{ label: "Concept", icon: "<chosen>", color: "var(--ct-concept)", tint: "var(--ct-concept-tint)" }`.
3. **Tokens.** Add `--ct-concept` / `--ct-concept-tint` to **both** the light and dark theme
   blocks in `styleguide/styles/agentheim.css`, alongside the existing `--ct-*` content-type
   token pairs. Pick a hue distinct from the six in use (ticket grey, context teal, vision
   ochre-brown, map purple, research blue, adr red) — and **not** the reserved selection accent
   `--accent-ochre-soft` (ADR-0016). A green / lime reads naturally as "synthesis / insight."

## Acceptance criteria
- [ ] `icons.js` LUCIDE map contains the chosen concept glyph (proposed `lightbulb`),
      path geometry verified against the pinned Lucide version.
- [ ] `CONTENT_TYPES` (`data.js`) has a `concept` entry with `label`, `icon`, `color`, `tint`.
- [ ] `--ct-concept` and `--ct-concept-tint` are defined in **both** the light and the dark
      theme blocks of `agentheim.css` (a hue distinct from the six existing content types,
      never `--accent-ochre-soft`).
- [ ] A `type: 'concept'` row renders through `TreeItem` **without throwing** (the gap that
      blocks aw-075 is closed): `CONTENT_TYPES['concept'].icon` resolves to a real glyph.
- [ ] Canvas (`styleguide/index.html`, the §04 icon gallery + the library/TreeItem specimen)
      demonstrates the concept glyph + a `type: 'concept'` TreeItem so the gate re-review has
      something visible.
- [ ] README capability note + **gate re-review note**: a new content-type glyph + token pair
      is a visible styleguide change reopening the gate (the ds-005/007/009/014/015/017/018
      precedent) — re-review against `styleguide/index.html` before aw-075 ships.
- [ ] `dist/` rebuild is **deferred to the consuming task (aw-075)** — this task adds the
      capability with no shipped dashboard consumer yet (the ds-017/ds-018/ds-020 pattern).

## Notes
Split off from **agentic-workflow-075** during its refine (2026-06-17): aw-075 is the
rail/search consumer, this is the content-type capability it depends on. aw-075's
acceptance criterion ("if a `type: 'concept'` row needs a distinct icon the styleguide's
TreeItem icon map lacks, file a design-system child task rather than forking") resolved to
**yes, it's needed** — `CONTENT_TYPES` has no `concept` and the registry has no fitting glyph.

- **No ADR** — adds a content type along the established `CONTENT_TYPES` shape under ADR-0003
  (unforked) + ADR-0016 (don't repurpose the reserved selection accent). The glyph/hue choice
  is README prose + a gate decision, exactly as ds-017 carried the trash-2 rationale.
- **Direct prior art:** ds-017 (added the `trash-2` glyph the same way — glyph + gate
  re-review + deferred dist rebuild). ds-001 is the registry's origin.

**Relevant files:**
- `styleguide/app/icons.js`, `styleguide/app/data.js`,
  `styleguide/styles/agentheim.css`, `styleguide/index.html`, `README.md`.
</content>
</invoke>
