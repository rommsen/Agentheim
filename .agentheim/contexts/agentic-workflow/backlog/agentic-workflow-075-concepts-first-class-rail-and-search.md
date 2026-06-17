---
id: agentic-workflow-075
title: Concepts are a first-class artifact kind — left-rail nav group + searchable category
status: backlog
type: feature
context: agentic-workflow
created: 2026-06-17
completed:
depends_on: [design-system-001-styleguide]
blocks: []
tags: [dashboard, navigation, search, concepts]
related_adrs: [0011, 0023, 0021, 0003]
related_research: []
prior_art: [agentic-workflow-008, agentic-workflow-066, agentic-workflow-056, agentic-workflow-050, agentic-workflow-052]
---

## Why
Concept pages (the opt-in per-BC synthesis pages under `contexts/<bc>/concepts/`) are a
real artifact kind — the tree projection already carries them per BC (`bc.concepts`,
built in aw-005, tested in `tree.test.mjs`) — but they are **invisible** in the dashboard's
two discovery surfaces. `treeToLibrary` (the left-rail library) pools only Product /
Bounded contexts / Research / Decisions, and the search corpus (`enumerateCorpus`) walks
only Bounded contexts / Decisions / Research / Tickets. So a synthesized concept page can
be linked from an INDEX but cannot be browsed from the rail or found by search. Concepts
deserve the same first-class standing as ADRs and research.

## What
Surface **Concepts** as a first-class group/category across the dashboard's discovery
surfaces, drawing from the `bc.concepts` locations the tree projection already carries
(no new server data — purely additive to the consuming transforms; styleguide consumed
unforked, ADR-0003).

1. **Left rail (library nav).** `dashboard/app/library-data.js` → `treeToLibrary` gains a
   **Concepts** group positioned **between Bounded contexts and Research** —
   `Product → Bounded contexts → Concepts → Research → Decisions`. It lists every BC's
   concept pages, each a row opening in the **main-pane reader** via the existing non-task
   open-intent shape (`{ id, type: 'concept', title, path }`, routed by `isTaskIntent`,
   ADR-0021). Note concepts are **per-BC** (`tree.contexts[].concepts`), unlike the
   top-level `locations.adrs` / `locations.research` — the transform must iterate contexts.
2. **Search.** `dashboard/search.mjs` → `enumerateCorpus` gains a **Concepts** category
   (title + body searchable, frontmatter excluded per ADR-0023), and the topbar search
   panel groups results under a **Concepts** label. The fixed orders in `search.mjs`
   (`CATEGORY_ORDER`) and `dashboard/app/search-results.js` (`GROUP_ORDER`) stay **mirrored**
   to each other and consistent with the rail — proposed: `Bounded contexts → Concepts →
   Decisions → Research → Tickets`.

## Acceptance criteria
- [ ] The left rail shows a **Concepts** group between **Bounded contexts** and **Research**
      (`Product → Bounded contexts → Concepts → Research → Decisions`).
- [ ] The Concepts group lists every BC's concept pages (from `bc.concepts`); selecting a row
      opens it in the main-pane reader (non-task doc, `type: 'concept'`, no new routing).
- [ ] An empty Concepts group is **omitted** (no 0-item heading) — consistent with the other
      groups' `.filter(items.length > 0)`.
- [ ] `/api/search` matches concept page titles + bodies; results appear under a **Concepts**
      group in the topbar search panel, positioned right after Bounded contexts.
- [ ] `library-data.js`, `search.mjs` (`CATEGORY_ORDER`) and `search-results.js`
      (`GROUP_ORDER`) orderings stay mirrored.
- [ ] The pure transforms keep their `node --test` coverage — new cases for the Concepts
      group/category; loss-tolerant (missing/empty `concepts` → no group, never a throw).
- [ ] `dashboard/dist/` rebuilt via esbuild so the deployed app carries the change.
- [ ] Styleguide consumed **unforked** (ADR-0003): reuse the existing `TreeGroup`/`TreeItem`
      and `SearchField`. If a `type: 'concept'` row needs a distinct icon the styleguide's
      TreeItem icon map lacks, file a **design-system** child task rather than forking.

## Notes
Open questions for a quick refine pass (the *what* is clear; these are small decisions):
- **Concept title source** — filename `baseName` (mirrors ADR/research titling today) vs the
  page's frontmatter `title`. Default to `baseName` unless refine decides the synthesis pages
  carry meaningful titles worth reading from frontmatter.
- **Search category exact position / ranking tier** — proposed right after Bounded contexts
  (before Decisions) to mirror the rail; confirm in refine.
- **Styleguide icon for `type: 'concept'`** — check the library TreeItem icon map; a distinct
  glyph may need a `design-system` child task (ADR-0003), or reuse an existing one.
- This project currently has **zero** concept pages (the BC INDEX `concepts` list is empty),
  so both surfaces will render empty until a concept is synthesized — but the rail group and
  search category become first-class regardless, ready the moment a concept page lands.

Prior art (all shipped, related, none the same): aw-008 (library nav transform), aw-056 /
aw-066 (rail group ordering), aw-050 (`/api/search` corpus), aw-052 (topbar search grouping).
</content>
</invoke>
