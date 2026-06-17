---
id: agentic-workflow-071
title: Confetti "no @keyframes" test trips on the unrelated About-page aboutRise keyframe
status: backlog
type: bug
context: agentic-workflow
created: 2026-06-17
completed:
depends_on: []
blocks: []
tags: [dashboard, test, confetti, about, regression]
related_adrs: []
related_research: []
prior_art: [agentic-workflow-034, agentic-workflow-062]
---

## Why
The test `the celebration is rendered by canvas-confetti, not the old CSS keyframes (aw-034 swap)`
in `dashboard/test/board-prompt-bar.test.mjs:334` asserts the WHOLE `board.js` source contains
no `@keyframes` (it was meant to prove the old CSS-burst confetti implementation is gone, aw-034).
Since the About-page visual polish landed, `board.js` now legitimately contains a board-local
`@keyframes aboutRise` (the About card entrance reveal, `board.js:1642`) that has nothing to do
with confetti. The blanket `doesNotMatch(boardSrc, /@keyframes/)` therefore fails on an unrelated,
intentional keyframe. This is a PRE-EXISTING failure (reproducible on HEAD, independent of aw-070).

## What
Tighten the aw-034 confetti assertion so it proves the CONFETTI keyframe implementation is gone
without forbidding every keyframe in the file. Options to weigh during refinement:
- Assert the absence of the specific old confetti keyframe name / `agentheim-confetti-piece` /
  `ensureConfettiStyle` only (those three sibling assertions already exist and still pass), and
  drop the over-broad bare `/@keyframes/` check; or
- Scope the keyframe check to the confetti code region rather than the whole file.

Do not remove or alter the legitimate `aboutRise` keyframe — it is intended About-page behavior.

## Acceptance criteria
- [ ] The full dashboard suite (`node --test` under `dashboard/`) is green (552/552).
- [ ] The aw-034 confetti test still fails if the old CSS-burst confetti (keyframe injector /
      `agentheim-confetti-piece` / `ensureConfettiStyle`) is reintroduced.
- [ ] The legitimate `@keyframes aboutRise` About-page reveal is untouched.

## Notes
- Surfaced by agentic-workflow-070 (Ko-fi button solid colour). aw-070 left the failure in place
  because fixing it is out of that task's scope (net-new test behavior).
- Failing assertion: `dashboard/test/board-prompt-bar.test.mjs:342`.
- Legitimate keyframe: `dashboard/app/board.js:1642` (`aboutRise`, from the About-page polish).
