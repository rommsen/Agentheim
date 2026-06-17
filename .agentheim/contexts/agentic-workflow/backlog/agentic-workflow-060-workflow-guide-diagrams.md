---
id: agentic-workflow-060
title: Workflow guide diagrams (hand-authored flow visuals)
status: backlog
type: feature
context: agentic-workflow
created: 2026-06-17
completed:
commit:
depends_on: [design-system-001, agentic-workflow-059]
blocks: [agentic-workflow-057]
tags: [frontend, ui, docs, onboarding, diagrams]
related_adrs: [0003, 0017]
related_research: []
prior_art: [agentic-workflow-040]
---

## Why
The Workflow page is meant to be **mostly visual** — the workflow as a diagram, not prose
(umbrella aw-057). With the page shell and captions in place (aw-059), this task supplies
the actual **hand-authored flow diagrams** that carry each of the three segments, turning
the supporting captions into supporting text around a primary visual.

## What
Replace aw-059's placeholder diagram slots with **hand-authored, styleguide-token flow
visuals** (boxes, arrows, lanes) — built as SVG/HTML+CSS components drawn from the
design-system tokens so they track the active light/dark theme. **No bundled diagramming
library** (decided at capture, 2026-06-17). The components are **board-local** under
`dashboard/app/` (decided in refinement — the seam test fails for a shared design-system
primitive: single consumer, content-bound shapes), with the styleguide consumed
**unforked** (ADR-0003), like the board's sort `<select>`, confetti, and `StoppedOverlay`
precedents.

Each diagram depicts the corrected, skill-accurate flow (full detail in aw-059):

1. **Preparation** — brainstorm → vision + context map → foundation pass (infrastructure
   BC, foundation decision tasks, walking-skeleton spike, styleguide gate). No code yet.
2. **Capturing** — two intake doors (quick-capture / modeling CAPTURE) → backlog;
   modeling REFINE deepens; research feeds in (research-reviewer gate); modeling DISMISS
   removes. Refinement is human-in-the-loop.
3. **Promote & Work** — modeling PROMOTE (backlog → todo) → work (DAG → parallel TDD
   workers → **verifier** gate, FAIL re-dispatches ×2 then escalates) → commit. User
   reviews before work; verifier guards every commit.

## Acceptance criteria
- [ ] Each of the three segments is carried **primarily by a hand-authored diagram**
      (boxes/arrows/lanes), with caption text as support.
- [ ] Diagrams are built from **design-system tokens** and render correctly in **both
      light and dark themes** (they track the theme flip).
- [ ] **No bundled diagramming library** and **no new bundled runtime dependency** are
      introduced.
- [ ] The diagrams convey the corrected flows: brainstorm → vision + context map
      (Preparation); the quick-capture-**vs**-modeling intake split + refine + research +
      dismiss loop (Capturing); the promote → work → **verifier** → commit flow with the
      human gates (Promote & Work).
- [ ] Components are **board-local** under `dashboard/app/`; styleguide consumed
      **unforked** (ADR-0003); the worker edits only this BC's README.
- [ ] Read-only (ADR-0017); `dashboard/dist/` rebuilt so the deployed app carries the
      diagrams.

## Notes
- Diagram primitives are **board-local** — no design-system child task (refinement
  decision; the seam test failed). If a second surface ever needs flow diagrams, promote
  them to a `design-system` primitive then.
- Depends on aw-059 (the slots must exist first). This is the last piece of the umbrella
  aw-057 — when this lands, aw-057 closes.
- Frontend gate met: `design-system-001` (styleguide) is in `done/`.
