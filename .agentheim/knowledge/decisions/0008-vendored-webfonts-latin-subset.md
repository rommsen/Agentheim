---
id: ADR-0008
title: Vendor dashboard webfonts as the Google Fonts latin-subset woff2, served from a fonts/ dir beside the token CSS
scope: design-system
status: accepted
date: 2026-06-06
related_tasks: [design-system-003, infrastructure-002, design-system-001]
related_adrs: [ADR-0003]
---

# ADR-0008: Vendored webfonts — latin-subset woff2, `fonts/` beside the token CSS

## Context

After `infrastructure-002` the dashboard framework (React / ReactDOM / `marked` / `htm`)
is bundled and offline, but the token CSS (`styleguide/styles/colors_and_type.css`,
the single source of truth per ADR-0003) still `@import`ed **Inter Tight** and
**JetBrains Mono** from the Google Fonts CDN. So both the buildless canvas and the
bundled dashboard hit the network for fonts at view time, and on a genuinely offline
machine the type silently fell back to system fonts — breaking visual fidelity to the
approved styleguide (JetBrains Mono is load-bearing for the `AGH-128` / `ADR-0007` ID
treatment). `design-system-003` closes this last view-time network dependency.

Two questions had to be settled: (1) **which font files** to vendor, and (2) **where**
to put them so the `url()` resolves both in the source canvas and in the derived
`dashboard/dist/` (whose layout differs from the source — ADR-0003's seam).

## Decision

**1. Vendor the Google Fonts `latin`-subset woff2, one file per family.**
The `@import` URL resolves (with a modern UA) to woff2 that are **variable fonts along
the weight axis**, split into unicode-range subsets. The `latin` subset
(`U+0000-00FF` + common punctuation/symbols/arrows) fully covers the styleguide's
content (English UI, ticket/ADR IDs, em-dashes). Because each family's woff2 is the
variable font, **one file per family** covers every weight the tokens use — Inter Tight
400/500/600 and JetBrains Mono 400/500 — so we ship exactly two woff2:

- `InterTight-latin.woff2` (44 KB), `@font-face` `font-weight: 100 900`
- `JetBrainsMono-latin.woff2` (31 KB), `@font-face` `font-weight: 100 800`

No whole-family dump; no cyrillic/greek/vietnamese/latin-ext subsets we never render.
Fetched directly from `fonts.gstatic.com` so glyphs/hinting match the previously
approved rendering exactly (delivery-mechanism change, not a type-design change).

**2. Files live in `styleguide/styles/fonts/`, referenced as `url('fonts/<file>.woff2')`.**
The `@font-face` `url()` is relative to the CSS file. Putting the fonts in a `fonts/`
child of the CSS's own directory makes the **same relative URL** resolve in both
consumers:

- Source canvas: CSS at `styleguide/styles/` → `styleguide/styles/fonts/…` ✓
- Dashboard dist: the build copies the token CSS to the **dist root** (flat), and
  `dashboard/build.mjs` now also copies `styles/fonts/` → `dist/fonts/`, so the same
  `url('fonts/…')` resolves to `dist/fonts/…` ✓

The OFL 1.1 licenses (Inter, JetBrains Mono — both redistributable) are committed
alongside the woff2 and copied into dist with them.

## The seam (ADR-0003)

design-system **owns** the woff2, the licenses, and the `@font-face`/`url()` in the
token CSS. infrastructure **owns** the relocation: one `cp(styles/fonts → dist/fonts)`
added to `dashboard/build.mjs`, mirroring the existing token-CSS copy loop. This is a
trivial, certain path-copy on the consuming side — the fonts are not forked or
hand-maintained in dist; they remain derived from the single source. After this change
`dist/` must be rebuilt and re-committed (`cd dashboard && npm install && npm run build`).

## Consequences

- The styleguide canvas and the bundled dashboard render correct type with **zero
  network at view time**; no FOUT-to-system-font, no font 404s.
- Editing the gated token CSS reopens the styleguide gate (as `design-system-002` did);
  visual delta is nil (same fonts, local delivery), so a lightweight builder re-confirm
  is expected.
- If the styleguide ever needs non-latin glyphs, the matching subset woff2 must be added
  (currently out of scope — content is latin-only).

## Alternatives considered

- **Vendor Google's per-weight static files** — rejected: Google serves variable woff2,
  so static instances would mean refitting and lose the one-file-per-family simplicity.
- **Vendor all unicode-range subsets** — rejected: ships glyphs we never render (whole-
  family dump the task explicitly forbids).
- **Put fonts at dist root and rewrite paths in the build** — rejected: would fork the
  `url()` between source and dist, breaking ADR-0003's single-source rule; the `fonts/`
  child dir keeps one identical URL for both consumers.
