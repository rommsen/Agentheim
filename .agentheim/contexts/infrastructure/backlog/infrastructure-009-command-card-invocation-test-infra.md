---
id: infrastructure-009
title: Add a test seam for slash-command card invocation (catch project-relative launcher paths)
status: backlog
type: chore
context: infrastructure
created: 2026-06-08
completed:
commit:
depends_on: []
blocks: []
tags: [dashboard, command, launcher, testing, plugin]
related_adrs: [ADR-0002]
related_research: []
prior_art: [infrastructure-008, infrastructure-004]
---

## Why

infrastructure-008 fixed the `/dashboard` command card so it invokes `launch.mjs` by its
plugin-rooted path (`node "${CLAUDE_PLUGIN_ROOT:-.}/dashboard/launch.mjs"`) instead of a
bare project-relative `node dashboard/launch.mjs`, which broke in every foreign consumer
project. That bug — and its sibling infrastructure-004 — were both "project-root
assumption" regressions that **no test would have caught**: the command card is markdown
prose with no automated invocation check, and the launcher's printed hint was a plain
string. The fix was verified by an ad-hoc end-to-end simulation, not a committed test, so
the next edit to the card can silently reintroduce the same class of bug.

## What

Add a lightweight, stdlib-only test seam that asserts the dashboard command card's
invocation is plugin-rooted and project-cwd-safe. Candidate approaches (worker to refine):

- A `dashboard/test/command-card.test.mjs` that parses `commands/dashboard.md`, extracts the
  fenced `node ...` lines, and asserts: (1) no bare `dashboard/launch.mjs` without a
  `${CLAUDE_PLUGIN_ROOT...}` prefix; (2) all three verbs present; (3) no `cd` directive.
- And/or an executable integration test that, in a temp foreign project (`.agentheim/` but
  no `dashboard/`), runs the exact card command form with `CLAUDE_PLUGIN_ROOT` exported and
  asserts launch/status/stop succeed and the runfile lands under the foreign project — the
  simulation infrastructure-008 ran by hand, made permanent.

## Acceptance criteria

- [ ] A committed test fails if `commands/dashboard.md` reintroduces a project-relative
      launcher path (the infrastructure-008 regression).
- [ ] The test is stdlib-only (no new dependency), consistent with the dashboard runtime's
      zero-dependency rule (ADR-0002).
- [ ] Runs green in the existing `node --test "dashboard/test/*.test.mjs"` suite on Windows
      and POSIX.

## Notes

Filed by the infrastructure-008 worker (TDD-skip follow-up): the 008 fix had no testable
command-card seam, so the regression guard is deferred here for the user to refine and
prioritize.
