---
id: agentic-workflow-050
title: Dashboard global search — search field replaces the breadcrumb; grouped results across BCs, ADRs, research & tickets
status: backlog
type: feature
context: agentic-workflow
created: 2026-06-16
completed:
commit:
depends_on: [design-system-001, design-system-016, agentic-workflow-049]
blocks: []
tags: [captured, frontend, dashboard, search]
related_adrs: [ADR-0017, ADR-0021, ADR-0009, ADR-0003]
related_research: []
prior_art: [agentic-workflow-005, agentic-workflow-008, agentic-workflow-027, agentic-workflow-039]
---

## Why
The main-column topbar leads with a **static breadcrumb** — `Board` + a mono
`agentheim / tickets` (`dashboard/app/board.js`, `BoardTopbar`, lines ~1111–1116) — that
carries no function: the project name already shows in the **rail brand**, so the breadcrumb
is dead chrome. The builder wants that space to become a **global search**: type anything and
search **every artifact** in `.agentheim` — bounded-context READMEs, design decisions (ADRs),
research papers, **and** tickets — by **title and content**, see grouped results, and jump
straight to the document.

Today the dashboard is **read-only with no search backend** — `BoardTopbar`'s own comment
says "*NO Search box is rendered — the dashboard is read-only with no search backend*" — and
`/api/tree` carries **pointers / metadata only, never document bodies** (ADR-0002). So
searching **content** (not just titles) requires a **new server-side read endpoint**. Search
is a **pure read**, so it does **not** breach the read-only contract (ADR-0017).

## What
Replace the `BoardTopbar` breadcrumb with a search field, backed by a new read endpoint, with
a grouped results popover:

- **`GET /api/search?q=<term>` read endpoint** — a sibling of `/api/tree` + `/api/doc`
  (aw-005). Walks the discovered `.agentheim` corpus, matches the term (case-insensitive
  substring) against each artifact's **title and body**, and returns ranked matches as
  `{ category, title, excerpt, path }` (+ whatever id the opener needs). The **excerpt** is a
  short window around the **first** occurrence of the term in that artifact. Categories:
  **Bounded contexts** (READMEs), **Decisions** (ADRs), **Research**, **Tickets** (tasks). The
  walk + excerpting is **pure and unit-testable** (mirrors the board-data / tree transforms);
  being a read, the read-only contract stays intact.
- **Topbar search field** replacing the breadcrumb — the styleguide ds-016 search pattern,
  consumed unforked (ADR-0003). Typing queries `/api/search` (debounced) and renders a results
  panel that **pops over the content**, anchored **below** the input.
- **Results grouped by category**, each row = the item **title** + the **first-occurrence
  excerpt** with the matched term marked.
- **Keyboard:** up/down moves a single highlight across all rows (spanning groups), Enter loads
  the highlighted item; mouse hover + click do the same; Esc closes.
- **Selection routing:** loads the chosen artifact into the **main content pane**
  (`MainPaneReader`) — non-task docs as today (aw-027) **and tickets too** (builder's choice:
  main pane, consistent with aw-039 "open in full screen"), via the existing `/api/doc` fetch
  and the shell's `selectedDoc` state. The rail's **Board** item returns to the board.

## Acceptance criteria
- [ ] The `BoardTopbar` breadcrumb (`Board` + `agentheim / tickets`) is removed; a search field takes its place. The project name is unaffected (it lives in the rail brand).
- [ ] A `GET /api/search?q=` read endpoint returns matches across BC READMEs, ADRs, research, and tasks, matching the term against **title and body**, case-insensitive. It performs **no writes** (read-only contract intact, ADR-0017 / ADR-0001).
- [ ] Each result carries: category, title, a short excerpt around the **first** occurrence of the term, and the path/id needed to open it.
- [ ] Typing queries live (debounced) and renders results in a panel that **pops over the content, below the input**, grouped by category with a per-category group label.
- [ ] Up/down arrows move a single highlight across all result rows (spanning groups); Enter opens the highlighted result; mouse hover + click open the same way; Esc closes the panel.
- [ ] Selecting any result loads that document into the **main content pane** (`MainPaneReader`) — non-task docs and tickets alike — via the existing `/api/doc` fetch.
- [ ] Empty / whitespace query shows no panel; a query with no matches shows a clear empty state (no dead popover).
- [ ] The search input **consumes the design-system ds-016 pattern unforked** (ADR-0003); no bespoke search chrome forked board-side.
- [ ] Dashboard tests green; `dist/` rebuilt from source (`node build.mjs`); SSE/live-update and existing topbar behavior (settings gear, Work launch) unaffected.

## Notes
- **Sequencing:** `agentic-workflow-049` (in `doing`) rewrites `BoardTopbar` into
  `[breadcrumb] … [⚙][Work]`. This task edits the **same function** and removes the breadcrumb —
  land it **after** aw-049 (hence the `depends_on`). The topbar then becomes
  `[search field] … [⚙][Work]`.
- **Likely splits at REFINE** into (1) the `/api/search` **backend endpoint** (a read-API task
  like aw-005 — separately testable, the architectural keystone) and (2) the **topbar search UI**
  (field + popover + keyboard + routing). Kept as one capture; the refiner/orchestrator should
  split it and **consider an ADR** for the search backend (the read-only server's first
  content-search endpoint: corpus walk, ranking, excerpting).
- **Search semantics to corner at refine:** ranking/order across categories (title matches above
  body matches? category order?), excerpt window size + term highlighting, debounce interval, min
  query length, whether to search frontmatter, and exactly how a **ticket** (which normally opens
  in the slide-over, aw-007) renders in the main pane (reuse the aw-039 full-screen path / a
  ticket-shaped doc intent via `isTaskIntent`, ADR-0021).
- **Prior art to reuse:** `/api/tree` + `/api/doc` read API (aw-005, ADR-0002); the library
  category grouping Product / BCs / Decisions / Research (aw-008, `treeToLibrary`); the main-pane
  reader (aw-027) + ticket-in-main-pane (aw-039); open-intent routing `isTaskIntent` (aw-027 /
  ADR-0021). The corpus the endpoint walks is the **same** `.agentheim` the tree projection
  already discovers.
- **Read-only stays intact:** search is a pure read; no lifecycle write (ADR-0017 / ADR-0001).
- **Styleguide gate:** depends on `design-system-001` (gate) + `design-system-016` (the
  search-field pattern).
