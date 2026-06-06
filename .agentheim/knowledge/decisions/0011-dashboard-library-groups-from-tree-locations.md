# ADR-0011 — The dashboard library/navigation surface is the non-task half of the tree projection, grouped client-side

- Status: Accepted
- Date: 2026-06-06
- Context (BC): agentic-workflow
- Supersedes: —
- Related: ADR-0002 (tree projection / read-first), ADR-0003 (styleguide single source), ADR-0009 (dashboard app shell), ADR-0010 (slide-over doc-shaped item), agentic-workflow-005 (/api/tree), agentic-workflow-008

## Context

aw-008 builds the dashboard's discovery/navigation surface: the library that makes
the *non-task* knowledge base browsable — vision, context map, every BC README,
ADRs, research reports — and opens each in the existing universal slide-over (aw-007).
The board (aw-006) already covers tasks.

`GET /api/tree` (aw-005) already projects, alongside per-BC lifecycle tasks, the
*locations* of all these non-task artifacts: `locations.vision`, `locations.contextMap`,
`locations.adrs[]`, `locations.research[]`, and per-context `readme` / `index` /
`concepts[]`. No second endpoint, no document bodies — the slide-over fetches bodies
on demand via `/api/doc` (ADR-0010).

The open question for this task: where does the *grouping* of those locations into a
legible navigation live, and what defines what is browsable?

## Decision

1. **The library is the non-task half of the existing tree projection — no new endpoint.**
   A pure, framework-free transform (`dashboard/app/library-data.js` → `treeToLibrary`)
   reads `tree.locations` + `tree.contexts[].readme` and pools them into ordered groups.
   The board's task transform (`board-data.js`) and this one are mirror images over the
   same single read model.

2. **Tasks are deliberately EXCLUDED from the library.** The board owns the task surface;
   the library owns everything else. The two surfaces never overlap, so there is exactly
   one home for each artifact and no duplication. A lifecycle task path can never leak in
   (the transform reads only the locations half), which is asserted by test.

3. **Grouping mirrors the approved styleguide library demo, client-side:** Product
   (vision + context map) → Bounded contexts (each BC README, titled by context name) →
   Decisions (ADRs) → Research (reports). Group order is fixed for legibility; empty
   groups are omitted so the nav never shows a 0-item heading. Grouping is a UI concern,
   so it lives in the consumer, not in `tree.mjs` (which stays a neutral projection — disk
   is the source of truth, the tree is a flat projection of it, per ADR-0002).

4. **Each library item is shaped as the slide-over open-intent (ADR-0010):**
   `{ id, type, title, path }` where `type` is a styleguide content type
   (`vision`/`map`/`context`/`adr`/`research`) and `path` is the real in-root path
   `/api/doc` fetches by. This is the SAME intent the board emits, so the shell routes
   both into ONE universal slide-over — selecting a board card and selecting a library row
   are the same operation downstream.

5. **The board↔library toggle lives in the shell** (`DashboardApp` in `board.js`), built
   from the approved styleguide `RailItem` primary-nav pattern (imported, never forked —
   ADR-0003). The shell holds one `view` state and one `openIntent` state; whichever
   surface is active emits into the same slide-over.

## Consequences

**Positive.** One read model feeds both surfaces; the slide-over is reused verbatim; the
grouping logic is pure and unit-tested without a DOM; the styleguide stays the single
source of UI truth (TreeGroup/TreeItem/RailItem imported as-is). Adding a new artifact kind
to navigation is a small change in one transform.

**Negative.** BC `index` and `concepts[]` locations are projected by the tree but not yet
surfaced in the library (only README per BC). That is intentional scope-trimming for aw-008
(README is the BC's front door); surfacing concepts/indexes is a follow-up if it earns its
place. Group order and labels are hard-coded in the consumer — fine while the artifact kinds
are a small closed set, revisit if they grow.
