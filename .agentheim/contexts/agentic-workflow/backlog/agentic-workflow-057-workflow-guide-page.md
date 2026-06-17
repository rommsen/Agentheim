---
id: agentic-workflow-057
title: Workflow guide page — a visual left-rail explainer of the Agentheim workflow
status: backlog
type: feature
context: agentic-workflow
created: 2026-06-17
completed:
commit:
depends_on: [design-system-001, agentic-workflow-058, agentic-workflow-059, agentic-workflow-060]
blocks: []
tags: [captured, frontend, ui, docs, onboarding, umbrella]
related_adrs: [0003, 0009, 0017, 0021, 0025]
related_research: []
prior_art: [agentic-workflow-026, agentic-workflow-027]
---

> **Umbrella task.** Decomposed during refinement (2026-06-17) into a strict chain —
> **aw-058** (rail item + main-pane routing scaffold) → **aw-059** (page shell +
> three-segment layout) → **aw-060** (hand-authored flow diagrams). This task is the
> shared spec; it **closes when all three children are done**. Do not work it directly —
> work the children.

## Why
A new builder opening the dashboard has no in-product explanation of *how Agentheim
actually works* — the idea→vision→backlog→shipped-code loop, when to brainstorm, when to
refine, when to promote, what `work` does — and has to reconstruct it from skill docs and
READMEs. A single, mostly-visual page reachable straight from the left rail turns that
implicit knowledge into a glance: the workflow as a diagram, not prose.

## What
Add a second navigation entry — **Workflow** — to the **left rail, directly below the
existing Board link**. Selecting it opens a built-in **Workflow** page in the **main
content area** (the same surface the non-task document reader uses, aw-027 / ADR-0021),
*not* the slide-over and *not* a document fetched from disk. The page content is **static
and built into the dashboard app** — it describes Agentheim's own workflow, identical for
every project, so it is authored in the frontend, not generated from `.agentheim/`.

The page is **mostly visual, using proper diagrams** built as **hand-authored,
styleguide-conformant SVG/HTML+CSS components** (boxes, arrows, lanes drawn from the
design-system tokens so they track light/dark theme) — **no bundled diagramming library**
(decided at capture, 2026-06-17). Text is supporting captions around the diagrams, not the
primary medium. The diagram components are **board-local** under `dashboard/app/` (decided
in refinement — see Notes), styleguide consumed unforked (ADR-0003).

The page is split into **three labelled segments** (corrected, skill-accurate flow below):

1. **Preparation** — `brainstorm` (no-code Socratic, six modes) → **vision** +
   **context map**, then the foundation pass (infrastructure BC, foundation decision
   tasks, walking-skeleton spike, and — if frontend — the styleguide gate). No code yet.
2. **Capturing** — two intake doors into `backlog/`: **quick-capture** (fast/raw) and
   **modeling** CAPTURE (Socratic); **refine** deepens; **research** feeds external
   knowledge mid-model (research-reviewer gate); **dismiss** removes an abandoned task.
3. **Promote & Work** — **promote** a refined task to `todo`, then **work** runs the
   dependency-aware parallel TDD execution through the **verifier** gate to committed code.

## Acceptance criteria (satisfied across the children)
- [ ] A **Workflow** rail item appears directly **below Board** in the left rail and is
      keyboard-operable, consistent with the existing `RailItem` treatment. *(aw-058)*
- [ ] Selecting **Workflow** renders the guide in the **main content area** as a genuine
      **third** mutually-exclusive main-pane state, without regressing the aw-027 /
      ADR-0021 task-vs-doc split. *(aw-058, governed by ADR-0025)*
- [ ] The page is organised into the three named segments: **Preparation**, **Capturing**,
      **Promote & Work**. *(aw-059)*
- [ ] Each segment is carried primarily by **hand-authored diagrams** built from
      styleguide tokens — they render correctly in **both light and dark themes** and add
      **no new bundled runtime dependency**. *(aw-060)*
- [ ] The diagrams convey the corrected flows (brainstorm → vision + context map;
      quick-capture-vs-modeling intake + refine + research + dismiss; promote → work →
      **verifier** → commit, with the human gates). *(aw-059 copy, aw-060 visuals)*
- [ ] Read-only — the page introduces no write path over `.agentheim/` (ADR-0017).
- [ ] `dashboard/dist/` is rebuilt so the deployed app carries the page. *(each child)*

## Notes
**Refinement resolutions (2026-06-17):**
- **Rail routing → explicit third main-pane state.** The page is neither a task nor a
  disk-fetched document, so the shell gains a `mainView` (`"board" | "workflow"`) state
  alongside `selectedDoc`/`openIntent` — **not** a sentinel pseudo-doc. `isTaskIntent`
  (ADR-0021) stays byte-unchanged; render precedence is `workflow → document → board`.
  Governed by **ADR-0025** (Proposed), which reshapes ADR-0021. Implemented in **aw-058**.
- **Diagram primitives → board-local.** The seam test fails for a shared design-system
  primitive (single consumer, content-bound shapes), so the diagrams live board-local
  under `dashboard/app/`, styleguide consumed unforked (ADR-0003). **No design-system
  child task.** Existing `design-system-001` dependency is the right and sufficient gate.
- **Decomposition → aw-058 → aw-059 → aw-060** (strict chain). aw-058 promoted to `todo`;
  aw-059 / aw-060 stay in backlog and promote as their predecessors land.
- **Content accuracy.** Keep the copy/diagrams honest: name the **verifier** (not
  "verify"); show **quick-capture and modeling as two distinct intake doors**; include
  **DISMISS**; mark the **human-in-the-loop gates**; note the Preparation foundation pass
  and the research-review gate. Source of truth: `vision.md`, this BC's README, skill docs.
- Frontend gate met: `design-system-001` (styleguide) is in `done/`.
