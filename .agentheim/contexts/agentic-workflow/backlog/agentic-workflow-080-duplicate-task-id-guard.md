---
id: agentic-workflow-080
title: (optional) CI lint grepping for duplicate task ids across the tree
status: backlog
type: chore
context: agentic-workflow
created: 2026-06-17
completed:
depends_on: []
blocks: []
tags: [identity, ids, ci, lint, insurance]
related_adrs: [0028]
related_research: []
prior_art: [agentic-workflow-077]
---

## Why

ADR-0028's random-token scheme is collision-free by construction at the realistic concurrent
window (≈0.005% over n≈50), but a tiny residual collision probability remains, and a token can
also clash with a legacy id only through a bug. ADR-0028 names a duplicate-id CI lint as the
**insurance** that covers that tail (rather than a longer token). This task is explicitly
**optional / not required for v1** of the id scheme.

## What

Add a CI check that scans every `.agentheim/contexts/*/{backlog,todo,doing,done}/` task file,
extracts the `id` (filename and/or frontmatter), and fails if any id appears more than once
across the whole tree.

## Acceptance criteria

- [ ] A check (script + CI wiring) enumerates all task files and collects their ids.
- [ ] The check fails with a clear message naming the offending id(s) and their file paths when
      two files share an id.
- [ ] The check passes on the current tree (no existing duplicates).
- [ ] The check is shape-agnostic — it treats legacy `<bc>-NNN` and new `<bc>-<token>` ids the
      same (it compares whole ids, not tails).

## Notes

- Insurance only; do not gate the id-scheme rollout on this task.
- Keep it cheap — an O(tree) scan with a Set is sufficient; lifecycle folders are small.
