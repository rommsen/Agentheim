# Design System

## Purpose

The home for Agentheim's **frontend infrastructure** — the visual language, component
patterns, and styleguide that any UI-bearing feature in any other BC must conform to.
It exists so that frontend work has a single reviewed source of truth for look-and-feel
instead of each feature inventing its own.

It was created the moment Agentheim grew its first UI-bearing feature (the `dashboard`,
in the `agentic-workflow` BC). Before that, Agentheim was a markdown-and-prompts plugin
with no frontend at all.

## Classification

**supporting** — it serves other BCs' UI work; it is not the product itself. Today its
only consumer is `agentic-workflow`'s `dashboard` feature.

## The styleguide gate

Every UI/frontend task in any BC must list this BC's styleguide task
(`design-system-001-styleguide`) in its `depends_on`, and no frontend task may be
promoted to `todo` ahead of the styleguide. The styleguide is reviewed and approved by
the builder before any BC implements its UI.

## The styleguide

The styleguide artifact lives at `styleguide/` and is the reviewed visual language all UI
conforms to. Direction (decided 2026-06-05): a refined, content-first developer tool —
"Linear precision, Notion calm, Vercel restraint" — **dark-first with a light toggle**,
quiet by default, color used only to signal **ticket status** and **content type**. Derived
from the Ledger design system. Tokens are the source of truth in
`styleguide/styles/colors_and_type.css` (surfaces, type, spacing, radii, motion) and
`styleguide/styles/agentheim.css` (status + content-type palettes, elevation, markdown
reading scale). The canvas (`styleguide/index.html`) documents the tokens and renders every
component pattern in context.

> **Approved by the builder 2026-06-05** — the styleguide gate is open. Frontend tasks in
> any BC may now be promoted (each still subject to its own other dependencies). See
> `design-system-001` (done).

## Relationships with other contexts

- **agentic-workflow** — depends on this BC's styleguide for its `dashboard` feature.
- **infrastructure** — the styleguide ships as plain static assets (no install); the
  dashboard's runtime (`infrastructure-001`) should vendor/pre-bundle the CDN scripts the
  canvas currently loads. See `design-system-001` → Delivery.

## Pointers

- Styleguide artifact: `styleguide/index.html` (+ `styleguide/styles/`, `styleguide/app/`)
- BC index: `INDEX.md`
