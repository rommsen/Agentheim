---
id: infrastructure-006
title: Plugin release discipline — stop the manifest version from silently drifting
status: backlog
type: decision
context: infrastructure
created: 2026-06-08
completed:
commit:
depends_on: []
blocks: []
tags: [plugin, packaging, distribution, release, version, ci]
related_adrs: []
related_research: []
prior_art: [infrastructure-005]
---

## Why

`.claude-plugin/plugin.json` `version` drifted ~30 commits behind `main` (see
infrastructure-005): feature work landed but the manifest stayed at 0.7.0, so `/plugin`
told every marketplace user *"already at latest version"* and they silently stalled on
stale code — a contributor had to mirror the cache by hand to get current. Nothing in the
workflow today forces a bump when shippable change lands, so this *will* recur. The bump
itself (infrastructure-005) is the patch; this task decides the policy that prevents the
next drift.

## What

Decide and document how the plugin version is managed going forward, so a marketplace
user always pulls what's on `main`. Output is an ADR (and, if the decision warrants it, a
follow-up implementation task — e.g. a CI guard). This is a `decision` task, not code.

Options to weigh (not exhaustive):

- **Bump-on-feature policy** — a written rule that `feature`/`fix` commits touching shipped
  behavior must bump the manifest; enforced by review/discipline only.
- **Release checklist** — a documented release step (bump + tag + changelog) the builder
  runs deliberately, decoupled from per-commit work.
- **CI / hook guard** — automation that fails (or warns) when `main` advances past the last
  manifest version without a bump. Strongest guarantee, most setup.
- Some combination (e.g. checklist + CI backstop).

## Acceptance criteria

- [ ] A decision is recorded as an ADR in `.agentheim/knowledge/decisions/`: which
      mechanism (or combination) governs plugin version bumps, and the rationale.
- [ ] The ADR states the trigger explicitly — *when* a bump is required and *who/what*
      performs it.
- [ ] If the decision implies tooling (CI guard, hook, release script), a concrete
      follow-up implementation task is captured with that scope.
- [ ] The rule is discoverable where a future contributor would look (BC README and/or a
      release doc), not only in the ADR.

## Notes

- Spun out of infrastructure-005's open process question. Keep the two distinct:
  005 ships the current bump; 006 stops the recurrence.
- Consider how this interacts with the marketplace cache behavior the contributor hit —
  any policy has to actually move users off "already at latest", not just change a number.
- Needs a modeling/refine pass (or `architect` input on the CI-guard option) before it is
  todo-ready — hence backlog.
