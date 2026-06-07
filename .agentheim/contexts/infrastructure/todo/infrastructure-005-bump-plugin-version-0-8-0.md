---
id: infrastructure-005
title: Bump plugin version to 0.8.0 to unblock marketplace updates
status: todo
type: chore
context: infrastructure
created: 2026-06-08
completed:
commit:
depends_on: []
blocks: []
tags: [plugin, packaging, distribution, release, version]
related_adrs: []
related_research: []
prior_art: []
---

## Why

`.claude-plugin/plugin.json` still declares `"version": "0.7.0"`, set by a prior research
commit — but `main` is ~30 commits past it (the dashboard, design-system, and
infrastructure feature work). Because the manifest version is unchanged, `/plugin`
reports *"already at latest version (0.7.0)"* to every marketplace user and never pulls
the new state. A macOS contributor had to mirror the marketplace cache to `main` by hand
just to get the current code. A version bump is what actually ships the accumulated work.

## What

Bump `.claude-plugin/plugin.json` `version` from `0.7.0` to `0.8.0` — a minor bump,
reflecting the new dashboard / design-system / infrastructure features added since 0.7.0
(no breaking changes to the plugin contract).

## Acceptance criteria

- [ ] `.claude-plugin/plugin.json` `version` reads `0.8.0`.
- [ ] No other manifest fields changed.
- [ ] (If the repo has any version reference that must agree — e.g. a changelog or README
      badge — it is updated to match; otherwise N/A.)

## Notes

- One-line change; the value of capturing it is making sure it lands and is not forgotten
  again — the recurrence is the actual problem.
- **Open process question** (not this task): nothing today forces a version bump when
  feature commits land, so the manifest silently drifts and marketplace users stall. Worth
  a follow-up to decide release discipline — a bump-on-feature policy, a release checklist,
  or a CI guard that fails when `main` advances without a manifest bump. Surface to the
  builder whether to capture that separately.
