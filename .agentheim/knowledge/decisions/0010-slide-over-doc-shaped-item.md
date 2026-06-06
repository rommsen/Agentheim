# ADR-0010 — The dashboard slide-over feeds the styleguide Drawer a *doc-shaped* item

- Status: Accepted
- Date: 2026-06-06
- Context (BC): agentic-workflow
- Supersedes: —
- Related: ADR-0003 (styleguide single source), ADR-0009 (dashboard app shell), agentic-workflow-007

## Context

aw-007 builds the universal detail slide-over: clicking any artifact (a board
task today, any non-task artifact via aw-008 navigation tomorrow) opens the
right-hand panel, which fetches `GET /api/doc?path=` and renders the markdown
client-side. We reuse the approved styleguide `Drawer` AS-IS (ADR-0003: import,
never fork), and the `Drawer` already renders its body through the styleguide
`Markdown` (marked) component.

The friction: the styleguide `Drawer` normalizes its `item` prop through
`describeItem(item)` (drawer.js). That helper has two branches keyed on whether
`item.status` is present:

- **ticket branch** (`item.status` truthy) — *synthesizes* the path as
  `tickets/<id>.md` and forces `type: "ticket"`. This is right for the
  styleguide's demo data (which has no real on-disk paths), but WRONG for the
  live dashboard, where every artifact has a real in-root `path` that `/api/doc`
  validates and that the header must show.
- **doc branch** (no `status`) — keeps `path = item.meta` and `type = item.type`
  verbatim, and renders `item.body`.

A board task from `/api/tree` carries a `status` AND a real `path`, plus a
`type` of `feature|bug|chore` (not a styleguide content type).

## Decision

The slide-over always hands the `Drawer` a **doc-shaped** item —
`{ type, meta: <real path>, body: <fetched markdown> }` — for *every* artifact,
task or not. We deliberately omit `status` so `describeItem` stays on the doc
branch and preserves the real path. The mapping lives in a pure, unit-tested
module, `dashboard/app/slide-over-data.js`:

- `intentToDrawerItem(intent, body)` — builds the doc item; resolves the content
  `type` to a styleguide key (a task → `ticket`; a recognized artifact type kept
  as-is; anything else → `ticket` so the header pill is never the null-pill of an
  unknown type).
- `docUrl(path)` — builds the query-encoded `/api/doc` URL.

This makes tasks and non-task artifacts render through ONE identical code path —
the only difference is which `path` gets fetched (acceptance criterion 3).

## Consequences

- **Positive.** Real in-root paths show in the header; markdown is fetched
  client-side and rendered by the approved `Markdown`; one uniform path for all
  artifact kinds; the styleguide source stays byte-unchanged.
- **Negative.** We forgo the `Drawer`'s ticket-specific header meta (status chip,
  context, "updated" line) that the ticket branch would have rendered. For the
  live dashboard those came from demo-only fields anyway (the read model carries
  pointers/metadata, not those values — ADR-0002), so the loss is nominal. If a
  richer ticket header is later wanted, the right move is a styleguide change
  (a doc item that *opts in* to ticket meta), not a fork in the consumer.
- The mapper is the seam aw-008 (navigation) reuses unchanged to open non-task
  artifacts.
