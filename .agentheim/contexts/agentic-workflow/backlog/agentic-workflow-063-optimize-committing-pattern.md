---
id: agentic-workflow-063
title: Analyze and optimize the committing pattern
status: backlog
type: refactor
context: agentic-workflow
created: 2026-06-17
completed:
commit:
depends_on: []
blocks: []
tags: [captured]
related_adrs: []
related_research: []
prior_art: []
---

## Why
The current committing behaviour produces too many overly-detailed commits, and
still very often files don't get committed at all.

## What
Analyze and optimize the pattern by which the workflow commits code. Two observed
problems to address:
- Commits are too numerous and too fine-grained ("too many detailed commits").
- Files frequently get left out — work happens but the files don't make it into a commit.

## Acceptance criteria
- [ ] To be defined during refinement.

## Notes
Captured via `quick-capture` on 2026-06-17 — raw, unrefined. Needs a `modeling` refine pass
before it can be promoted.
