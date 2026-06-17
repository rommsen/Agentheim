---
id: agentic-workflow-059
title: Workflow page shell + three-segment layout
status: backlog
type: feature
context: agentic-workflow
created: 2026-06-17
completed:
commit:
depends_on: [design-system-001, agentic-workflow-058]
blocks: [agentic-workflow-060, agentic-workflow-057]
tags: [frontend, ui, docs, onboarding]
related_adrs: [0003, 0017, 0025]
related_research: []
prior_art: [agentic-workflow-027, agentic-workflow-040]
---

## Why
With the routing scaffold landed (aw-058), the Workflow page needs its real structure:
the three labelled segments that explain Agentheim's workflow, with supporting caption
copy. This task builds the **static page shell and layout** — the frame the diagrams
(aw-060) will hang in — and the honest, skill-accurate captions. Splitting layout from
diagrams keeps each commit reviewable and lets the verifier check the prose for accuracy
independently of the visuals.

## What
Replace aw-058's placeholder with the real **static, built-in** Workflow page body: three
labelled segments, in order, each a titled section with supporting caption text and
**placeholder diagram slots** (filled by aw-060). The page is read where there is room —
a comfortable centered reading measure consistent with the main-pane reader (aw-040).

The three segments and the **real** flow each must describe (corrected for accuracy
during refinement — keep the copy honest against the actual skills/vision):

1. **Preparation** — `brainstorm` (no-code Socratic dialogue, six modes) produces
   **vision.md** + **context-map.md**, then the foundation pass stands up the
   **infrastructure BC**, **foundation decision tasks**, a **walking-skeleton spike**,
   and (if the vision implies frontend) the **design-system styleguide gate**. *Gate: no
   code is written in Preparation.*
2. **Capturing** — two intake doors into `backlog/`: **`quick-capture`** (fast, no
   questions, raw) and **`modeling` CAPTURE** (Socratic). **`modeling` REFINE** deepens a
   task; **`research`** feeds external knowledge mid-model (gated by **`research-reviewer`**
   before it is citable); **`modeling` DISMISS** cascade-deletes an abandoned task under
   one confirmation (ADR-0022). *Gate: refinement is human-in-the-loop.*
3. **Promote & Work** — **`modeling` PROMOTE** (`backlog → todo`, readiness check) →
   **`work`** resolves the dependency DAG and dispatches **parallel TDD workers** → each
   SUCCESS passes a fresh-context **`verifier`** gate (FAIL re-dispatches up to twice,
   then escalates to the builder) → **commit** (one task = one commit). *Gates: the user
   reviews tasks before `work`; the verifier guards every commit; failures escalate to
   the human.*

Captions are **supporting** — the primary medium is the diagrams (aw-060). Static and
built into the bundle (no `/api/doc` fetch), read-only (ADR-0017), styleguide tokens/
primitives consumed **unforked** (ADR-0003), no new bundled dependency.

## Acceptance criteria
- [ ] The page renders **three named segments in order**: **Preparation**, **Capturing**,
      **Promote & Work**, each a clearly labelled section.
- [ ] Caption copy names the **real** verbs/skills and **gates** per the corrected flow
      above: quick-capture **and** modeling as two distinct intake doors; the
      **`verifier`** named correctly (not "verify"); DISMISS present; the
      human-in-the-loop gates marked.
- [ ] Each segment carries **placeholder diagram slots** ready for aw-060 to fill.
- [ ] The page is **static / built-in** (not fetched from disk), renders correctly in
      **both light and dark themes**, and keeps a comfortable centered reading measure
      consistent with the main-pane reader (aw-040).
- [ ] Read-only (ADR-0017); styleguide consumed unforked (ADR-0003); no new bundled
      runtime dependency.
- [ ] `dashboard/dist/` is rebuilt so the deployed app carries the layout.

## Notes
- Source of truth for the copy: `.agentheim/vision.md` and this BC's README
  ("Key commands", "Adversarial gate", "Ubiquitous language"). Keep it honest — the
  refinement found the original capture copy understated Preparation and the gates.
- Layout is **board-local** under `dashboard/app/`; the diagram primitives are also
  board-local (decided in refinement — no design-system child task; aw-060 authors them).
- Depends on aw-058 (the routing scaffold must exist first).
- Frontend gate met: `design-system-001` (styleguide) is in `done/`.
