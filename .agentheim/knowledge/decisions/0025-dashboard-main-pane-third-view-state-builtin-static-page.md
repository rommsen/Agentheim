# ADR-0025 — The dashboard main pane gains a third view state for built-in static pages, beside the task/document split

- Status: Proposed
- Date: 2026-06-17
- Context (BC): agentic-workflow
- Supersedes: —
- Reshapes: ADR-0021 (the two-render-target main pane — board OR document — becomes three: board, document, or a built-in static view; ADR-0021's "the main pane shows EITHER the selected document OR the board" invariant and its "Board RailItem is active exactly when no document is selected" predicate are widened here)
- Related: ADR-0009 (dashboard app shell), ADR-0017 (dashboard read-only — skills own lifecycle), ADR-0003 (styleguide single source, consumed unforked), agentic-workflow-026 (left-rail shell relayout), agentic-workflow-027 (main-pane document reader), agentic-workflow-039 (slide-over "Open in full screen" — a per-action override of the ADR-0021 split), agentic-workflow-052 (topbar search routing to the main pane)
- related_tasks: [agentic-workflow-057, agentic-workflow-058, agentic-workflow-062]

## Context

ADR-0021 settled the dashboard's open-intent as a **two-state, two-render-target**
model: every clicked artifact is routed on KIND by the pure `isTaskIntent`
discriminator — a board **task** (carries a lifecycle `status`) opens in the
right-hand `SlideOver`; a non-task **document** (carries a content `type` and a
real on-disk `path`) opens in the **main pane** via `MainPaneReader`, fetched
through `/api/doc`. The shell holds two mutually-exclusive selection states —
`openIntent` and `selectedDoc` — and ADR-0021 §2 fixes the invariant that the
main pane shows "**either** the selected document **or** the board," with the
**Board** rail item `active` "exactly when no document is selected."

agentic-workflow-057 introduces a **Workflow guide page**: a static page built
into the dashboard bundle that explains Agentheim's own workflow. It is
**neither** a board task (no `status`) **nor** a disk-fetched document (no
`path`, no `/api/doc` fetch). It is reached from a new **Workflow** rail item
directly below **Board**. So it does not fit either existing selection state,
and forcing it into one would corrupt a clean contract.

The tempting shortcut — overloading `selectedDoc` with a sentinel non-disk
"workflow" pseudo-doc that `MainPaneReader` special-cases — was rejected.
`selectedDoc` has a hard contract (a real-path document fed to a Markdown
reader); a pseudo-doc would force a non-fetching branch into `MainPaneReader`,
push a non-document through the rail's `selectedId` machinery, and smuggle a
third implicit case into the `isTaskIntent` "else" branch that ADR-0021 worked
to keep clean. That is exactly how a both-selected bug is born.

## Decision

**The shell gains an explicit third main-pane view state for built-in static
pages, ALONGSIDE the task/document split — never a sentinel value of either.**

1. **A new shell state `mainView`** (`"board" | "workflow"`, default `"board"`)
   is added to `DashboardApp` in `dashboard/app/board.js`, a third main-pane
   state beside `openIntent` (task → SlideOver) and `selectedDoc` (doc → main
   pane). It is not a fourth field on any intent shape.

2. **A built-in static page is NOT an open-intent.** It carries no `status` and
   no `path`, so it never enters `intent-route.isTaskIntent`, which stays
   **byte-unchanged** (ADR-0021's discriminator is untouched). It is selected by
   its own shell handler (`onSelectWorkflow`), not the rail's `onOpen` machinery.

3. **Main-pane render precedence is `workflow → document → board`.** The three
   states are mutually exclusive **by construction**: `onSelectWorkflow` clears
   both `selectedDoc` and `openIntent`; and every existing handler that lands
   something else in the main pane — `onSelectBoard`, `onOpen` (both task and
   doc branches), `onOpenSearch`, and `onOpenFullScreen` (aw-039) — resets
   `mainView` to `"board"`. Missing one would let the workflow page persist under
   a later board/doc click; threading the reset through each is the one
   mechanical obligation this ADR imposes.

4. **The Workflow `RailItem` sits BESIDE the Board item**, directly below it,
   with its own `onClick` and its own `active=${mainView === "workflow"}`. The
   **Board** item's predicate widens from `!selectedId` to
   `mainView !== "workflow" && !selectedDoc`. The library tree's `selectedId`
   still follows `selectedDoc` alone — because `onSelectWorkflow` nulls
   `selectedDoc`, the tree edge clears when the Workflow page opens, so no two
   rail rows highlight at once.

5. **The page is read-only (ADR-0017) and styleguide-unforked (ADR-0003):**
   static, built into the bundle, no `/api/doc` fetch, no write path; its visuals
   are composed from styleguide tokens and the existing `Icon` set, never forking
   the styleguide.

## Consequences

- **Positive.** Adding further built-in pages (a future "About", a changelog)
  is now a one-line `mainView` enum extension, not another shell-state
  invention — the pattern generalises. `MainPaneReader` and `isTaskIntent` stay
  pure and single-purpose (a document reader / a task discriminator); the
  static-page case lives entirely in shell state. The styleguide stays
  byte-unchanged and ADR-0021's discriminator is not touched.
- **Negative.** One more `setMainView("board")` reset line must be threaded
  through each existing main-pane handler; a missed reset would let the workflow
  page linger under a doc/board click (a bounded, mechanical risk a verifier
  diff-audit catches). There is now a third main-pane surface to keep visually
  coherent with the board and the reader.
- **Reshapes ADR-0021.** ADR-0021's "the main pane shows EITHER the selected
  document OR the board" becomes a three-way precedence, and its "Board item is
  active exactly when no document is selected" predicate is widened to also
  exclude the workflow view. ADR-0021 is annotated to point here.
