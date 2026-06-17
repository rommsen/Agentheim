---
id: agentic-workflow-q7m4k
title: What's Next card drops the front matter and lays its three sections out as columns
status: todo
type: feature
context: agentic-workflow
created: 2026-06-18
completed:
depends_on: [design-system-001]
blocks: []
tags: [dashboard, whats-next, layout, frontend]
related_adrs: [0027, 0003]
related_research: []
prior_art: [agentic-workflow-073, agentic-workflow-076]
---

## Why
The dashboard's What's Next panel (aw-073) renders the advisory recommendation
artifact through the same `withFrontmatterSection` + `Markdown` path the slide-over
and main-pane reader use. That path is right for a *document* you're reading, but the
What's Next panel is a glanceable advisory card, not a document: the folded "Front
matter" section is noise it doesn't need, and stacking the three sections vertically
buries the recommendation below a scroll. The card reads better when the front matter
is gone and the three named sections sit side by side.

## What
Two changes to `WhatsNextPanel` (`dashboard/app/board.js`):

1. **No front matter.** Stop rendering the folded "Front matter" `<details>` block.
   The leading YAML is stripped from the body before it reaches `Markdown` (rather than
   folded via `withFrontmatterSection`). The `generated` stamp keeps coming from the
   body via `generatedStamp` — that read is independent of rendering, so the staleness
   cue and the dismiss-keyed-by-`generated` behaviour are untouched.

2. **Three columns.** The three sections — *where things stand*, *recommended move*,
   and *next* — render as three side-by-side columns instead of one stacked markdown
   stream. Each column keeps its section heading and renders its content through the
   unforked styleguide `Markdown` primitive (ADR-0003) — board-local, token-matched
   layout (the board-control precedent), no forked renderer and no new design-system
   primitive.

## Acceptance criteria
- [ ] The What's Next panel no longer renders the collapsible "Front matter" section; the leading YAML block is stripped (not folded) before the body reaches `Markdown`.
- [ ] The `generated` timestamp / staleness cue still renders, and dismiss-keyed-by-`generated` still works — dropping the front matter render does not break either (both read the stamp from the body, not the rendered frontmatter).
- [ ] The three sections (*where things stand* / *recommended move* / *next*) render as three side-by-side columns, each with its heading, rather than a single vertically-stacked markdown stream.
- [ ] Each column renders its content through the unforked styleguide `Markdown` primitive (ADR-0003) — no forked renderer, no new design-system child task.
- [ ] Degraded artifact (a missing/empty section, malformed body) still renders without throwing; an absent artifact still renders nothing (the aw-073 contract is preserved).
- [ ] `dashboard/dist/` is rebuilt (`node build.mjs`) so the served bundle carries the change (the standing dashboard-source-change rule).

## Notes
- The panel and its render path were shipped by **aw-073**; the artifact's frontmatter
  (`generated`) + three-section body shape are defined by **aw-076** / **ADR-0027**.
  The front-matter folding helper is `withFrontmatterSection` (`dashboard/app/frontmatter.js`,
  aw-043); `parseFrontmatter` from the same module is already imported in `board.js`
  and can do the strip-only job.
- **Open question for the worker:** narrow-viewport behaviour. Three columns may need to
  collapse/stack below some width so the card stays legible on a narrow board — decide a
  sensible responsive fallback (stack, or let the columns shrink) at implementation time.
- Splitting the body into its three sections keys off the section headings the artifact
  always carries (*where things stand* / *recommended move* / *next*); keep it
  loss-tolerant so a body that doesn't match the expected shape degrades gracefully.
- Styleguide gate is **OPEN** (design-system, re-approved) so this frontend task is
  promotable; it depends on `design-system-001` per the gate.
