# ADR-0021 — The dashboard open-intent splits on artifact kind: tasks → slide-over, non-task documents → main pane

- Status: Accepted
- Date: 2026-06-15
- Context (BC): agentic-workflow
- Supersedes: —
- Reshapes: ADR-0010 (one drawer for all artifacts → drawer is task-only), ADR-0011 §5 (board↔library toggle retired, full-pane library surface retired)
- Reshaped by: ADR-0025 (the two-render-target main pane — board OR document — widens to a third state for built-in static pages; the "EITHER document OR board" invariant and the "Board active exactly when no document selected" predicate are widened there) — agentic-workflow-057/058
- Related: ADR-0003 (styleguide single source), ADR-0009 (dashboard app shell), ADR-0010 (slide-over doc-shaped item), ADR-0011 (library groups from tree locations), ADR-0017 (dashboard read-only), agentic-workflow-026 (left-rail shell relayout), agentic-workflow-027, agentic-workflow-039 (slide-over "Open in full screen" — a deliberate per-action OVERRIDE of this split: it puts a *task* in the main pane, expressed as a separate shell handler `setSelectedDoc(openIntent); setOpenIntent(null)`, NOT a change to `isTaskIntent`; the default click routing below still governs)

## Context

Through aw-026 the dashboard fed **every** clicked artifact — board tasks **and**
non-task documents (vision, context map, BC README, ADR, research) — into **one**
right-hand slide-over (the universal `SlideOver`, ADR-0010). That was the right call
while the library was a separate full-pane surface reached by a `board↔library`
toggle (ADR-0011 §5): the slide-over was the one detail viewer shared by both
surfaces.

aw-026 changed the premise. It relocated the library tree permanently into the left
rail and retired the `board↔library` toggle and the full-pane `DashboardLibrary`
surface. With the tree always visible in the rail, a clicked **non-task document**
has a natural home — the **main content area** — where there is room to read it. A
task, by contrast, is a transient detail glanced at *beside* the board; the slide-over
still fits it.

So the question this ADR settles: after aw-026, should non-task documents keep
opening in the slide-over, or render in the main pane? And what discriminates the two?

## Decision

**The single open-intent sink splits into TWO render targets, keyed on artifact
KIND:**

1. **A board TASK intent opens in the right-hand `SlideOver` — unchanged.** A
   transient detail panel beside the board (ADR-0010, ADR-0007).

2. **A non-task DOCUMENT intent opens in the MAIN content pane** via a new
   `MainPaneReader` (`dashboard/app/main-pane-reader.js`). The main pane shows
   **either** the selected document **or** the board (the default on first load /
   nothing selected). The rail's **Board** nav item returns the main pane to the
   board by clearing the selection, and is `active` exactly when no document is
   selected.

3. **The discriminator is the EXISTING intent shape — no new field.** A board-task
   intent carries a lifecycle **`status`** (`backlog|todo|doing|done`, from
   `/api/tree`); a rail/library intent carries a styleguide content **`type`**
   (`vision|map|context|adr|research`, from `library-data.js`) and **no `status`**.
   The fork is exactly *"has `status` → task → slide-over; else → non-task document
   → main pane"*. It lives in a pure, unit-tested module
   (`dashboard/app/intent-route.js` → `isTaskIntent`), mirroring how
   `slide-over-data.js`'s `resolveType` already keys `"ticket"` off `status`.

4. **One fetch mechanism, two render targets.** Both the slide-over Drawer and the
   main-pane reader fetch the document the same way — `docUrl(path)` →
   `GET /api/doc?path=` → client-side markdown (no SSR, ADR-0010). The reader renders
   through the styleguide **`Markdown`** primitive (independently exported from
   `styleguide/app/primitives.js`, prop `source`), imported across the BC boundary
   and consumed **unforked** (ADR-0003) — the same primitive the slide-over reaches
   *through* the Drawer, now reached directly. No styleguide change, no design-system
   child task.

5. **The shell holds TWO selection states** (`DashboardApp` in `board.js`):
   `openIntent` (task → `SlideOver`; drives the board card ring) and `selectedDoc`
   (non-task doc → main pane; drives the rail row's selected edge). They are mutually
   exclusive — opening one clears the other — so the card ring and the rail edge never
   both show. The rail's `selectedId` follows `selectedDoc`, not `openIntent`.

The change is read-only throughout (ADR-0017): opening a document performs no write
and never alters the board projection.

## Consequences

- **Positive.** A document is read where there is room to read it; the slide-over
  becomes a focused, task-only detail panel; the discriminator costs no new intent
  field (it falls out of the data the surfaces already emit); the styleguide stays
  byte-unchanged (the `Markdown` primitive is consumed, not forked); the one
  `/api/doc` fetch path is reused, so there is one way to load a doc and two ways to
  render it.
- **Negative.** There are now two detail viewers to keep visually coherent (the
  Drawer's contextual header vs. the reader's plain path strip). They share the
  `Markdown` body, so drift is bounded to chrome. The dead full-pane `DashboardLibrary`
  module (`dashboard/app/library.js`) is removed; `library-data.js` (`treeToLibrary`)
  stays — it now feeds the rail tree (aw-026).
- **Reshapes ADR-0010 / ADR-0011 §5.** ADR-0010's "ONE identical code path for tasks
  and non-task artifacts" no longer holds — the slide-over is now task-only.
  ADR-0011 §5's "board↔library toggle ... one `view` state" is retired (the toggle
  and the `view` state are gone; `selectedDoc` replaces the library-surface role).
  Both ADRs are annotated to point here.
