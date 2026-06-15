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

### Source architecture (ESM single source — ADR-0003, ADR-0005)

As of `design-system-002`, the styleguide source under `styleguide/app/*.js` is **native
ES modules** — the single source of truth feeding two consumers (ADR-0003): the buildless
reviewable canvas and the esbuild-bundled dashboard dist (`infrastructure-002`). Every
cross-file symbol is an explicit `export`/`import`; there are no `window.*` globals and no
in-browser Babel. Views are authored with **htm tagged templates** (`app/html.js`), parsed
at runtime — **no JSX is shipped to the browser** (ADR-0005). The canvas
(`styleguide/index.html`) loads `app/app.js` via `<script type="module">` with an
**import map** resolving `react`, `react-dom/client`, `marked`, and `htm` to pinned esm.sh
URLs; opening the file needs no toolchain. Tokens (`styles/*.css`) are unchanged.

> **Gate status after the ESM migration (`design-system-002`): OPEN — re-approved by the
> builder 2026-06-06** ("looks good, everything works"). The builder reviewed the migrated
> canvas (`styleguide/index.html` — sections 05–10 + the live kanban→drawer demo) and
> confirmed visual parity. The gate now stands open against the **migrated ESM source**, not
> just the original in-browser-Babel artifact.

> **Gate re-confirmed after the offline-webfonts change (`design-system-003`): OPEN —
> re-approved by the builder 2026-06-06.** Vendoring the webfonts locally edited the gated
> token CSS (`styles/colors_and_type.css`), lightly reopening the gate; the visual delta was
> nil (same Inter Tight / JetBrains Mono families and weights, now served from `styles/fonts/`
> instead of the Google Fonts CDN), and the builder re-confirmed. The gate stands open against
> the now-fully-offline styleguide.

> **Approved by the builder 2026-06-05** — the styleguide gate is open. Frontend tasks in
> any BC may now be promoted (each still subject to its own other dependencies). See
> `design-system-001` (done).

### Webfonts — vendored locally (offline, ADR-0008)

As of `design-system-003` the type families are **committed locally**, not pulled from a
CDN. The token CSS no longer `@import`s Google Fonts; instead `styles/colors_and_type.css`
declares `@font-face` rules pointing at `styles/fonts/`:

- `InterTight-latin.woff2` — Inter Tight, variable weight axis (covers 400/500/600).
- `JetBrainsMono-latin.woff2` — JetBrains Mono, variable weight axis (covers 400/500).

These are the Google Fonts **latin-subset** woff2 (variable fonts), so one file per family
covers every weight the tokens use; only the latin subset is vendored (the styleguide is
latin-only content). OFL 1.1 licenses sit beside the fonts (`*-OFL.txt`). The `url()` is
`fonts/<file>.woff2`, **relative to the CSS**, so it resolves both in the source canvas
(`styleguide/styles/fonts/`) and in the dashboard dist (`infrastructure`'s `build.mjs`
copies `styles/fonts/` → `dist/fonts/`). Result: the canvas and the bundled dashboard
render the correct type with **no network at view time**. Adding non-latin glyphs later
requires vendoring the matching subset. See ADR-0008.

### Motion — transitions plus one ambient cue (ADR-0014)

Motion is **quiet and mostly transition-only**: short, event-triggered eases
(`--duration-fast` / `--duration-base`, `--ease-base`) on hover, theme flip, and
the drawer. The `TicketCard` hover reads as a **raise, not a jump**
(`design-system-008`): hover deepens the shadow one step on the scale
(`--shadow-sm` → `--shadow-md`, `styles/agentheim.css`) and applies **no
`transform`/`translateY` offset**, so the card's content stays put rather than
nudging upward. The `selected` state's shadow (accent ring + `--shadow-sm`) is
unchanged. As of `design-system-004` the language admits **one ambient
(looping) cue**: a doing-status ticket card's ochre rail **breathes** — a calm,
low-amplitude pulse — so the doing column reads as *actively worked* at a glance.
This is the system's first `@keyframes` and its first loop token,
`--duration-ambient` (`styles/colors_and_type.css`); the pulse keyframes +
`.ticket-rail--pulse` class live in `styles/agentheim.css`. It is **status-keyed**
(`status === "doing"`, never the `agent` field) via `doingPulseClass()` in
`app/motion.js`, applied by the styleguide `TicketCard`; the dashboard inherits it
unforked (ADR-0003), no dashboard-side change. The cue stays inside the quiet-by-
default law: **ochre-only** (draws solely from `--st-doing`, no new hue) and
**low amplitude**. Under `prefers-reduced-motion: reduce` it is **fully stripped**
to a plain rail (pure progressive enhancement) — the standing contract for any
future ambient motion: always strippable to a still-legible static baseline.

> Live-board note: the served dashboard `dist/` is a derived artifact (ADR-0003)
> and must be **rebuilt** to pick up this styleguide change; the source edit alone
> does not update the bundle.

### TicketCard — estimate chip is conditional; an optional corner-action slot (design-system-006)

The `TicketCard` (`app/kanban.js`) is consumed by the dashboard **unforked**
(ADR-0003), so consumer-shaped affordances live here, not board-side. Two
contracts:

- **Estimate chip is conditional.** The `… pt` meta chip renders **only when
  there is a real estimate**. An absent / empty / whitespace value, or the
  em-dash `—` placeholder the dashboard feeds (the `/api/tree` read projection
  carries no estimate, ADR-0002), hides the chip — no dead `— pt` space. The
  decision is the pure, React-free `showEstimate(est)` in `app/card.js` (testable
  under `node --test` without the canvas import map, mirroring `doingPulseClass`).
- **Optional `cornerAction` render-prop.** The card accepts an optional
  `cornerAction` function rendering a single quiet control in the **bottom-right
  of the meta row** (the former estimate-chip position). The **styleguide owns the
  slot's look/placement and click isolation**; the **consumer owns the control's
  behavior**. The card wraps the slot in a `stopPropagation` container so
  activating the action never bubbles to the card's own `onClick` (the card is a
  button that opens the slide-over). Absent → the card is unchanged. The downstream
  consumer (a backlog card's copy-command button) is `agentic-workflow-016`.

> Live-board note: same as Motion — the served dashboard `dist/` is a derived
> artifact (ADR-0003) and must be **rebuilt** to pick up this styleguide change.

### Collapsible — the shared section primitive (design-system-005)

The chevron-header + revealed-body affordance is now a single shared primitive,
`Collapsible` (`app/collapsible.js`), instead of two near-identical headers (the
tree's `TreeGroup` and a board-local clone). Both consume it **unforked**
(ADR-0003) — the styleguide owns the look, the consumer drives the state:

- **One canonical header look** — chevron rotating to 90° when open, an
  ellipsis-truncating uppercase `--font-ui` label that takes the row (`flex:1`),
  and a right-aligned `--font-mono` count (or an arbitrary trailing slot). This
  **unified** the two pre-existing headers (a small redesign, not pure dedup):
  the tree's count moved to the right edge and its label gained truncation.
- **Owns the reveal; body-agnostic.** The primitive holds the open truth and
  conditionally renders the body it reveals — so the `{open && …}` logic lives in
  ONE place. Children are arbitrary (`TreeItem` rows in the tree, `TicketCard`s
  on the board); each consumer passes its own spacing via a
  **`bodyStyle`** override.
- **Controlled OR uncontrolled.** Controlled when `open` + `onToggle` are
  supplied — the board drives it from collapse state persisted per `(column, BC)`
  (ADR-0015); the primitive writes no internal state, only announces every
  toggle. Uncontrolled when `open` is omitted and `defaultOpen` is given — the
  `TreeGroup` behavior, the primitive holds its own `useState`. The pure
  resolution (`isControlled(open)`) lives React-free in `app/collapsible-state.js`
  so it is testable under `node --test` (mirroring `showEstimate` / `doingPulseClass`).

The canvas documents the pattern in BOTH modes (section 09, `CollapsibleSpecimen`).

> **Gate re-confirmed after the shared-Collapsible extraction (`design-system-005`):
> OPEN — re-approved by the builder 2026-06-09.** The unified header is a **visual
> change to the library tree** (`TreeGroup`'s count moved to the right edge; its label
> now truncates with an ellipsis), which lightly reopened the gate per the
> `design-system-002` / `003` / `004` precedent. The builder reviewed the canvas
> (`styleguide/index.html` → section 09 — the tree specimen wearing the unified header,
> and the new Collapsible specimen in both controlled and uncontrolled modes) and
> re-confirmed. The gate now stands open against the **unified canonical header**.

> Live-board note: same as Motion — the served dashboard `dist/` is a derived
> artifact (ADR-0003) and was **rebuilt** (`node build.mjs`) to pick up this change.

### ThemeToggle — the swatched theme control (design-system-007, ADR-0016)

The Dark/Light theme control is a **dedicated `ThemeToggle`** (`app/live.js`,
alongside the generic `Segmented`), not `Segmented` itself. `Segmented` fills the
**selected** option with `--surface-inverse` — a token that **flips under
`[data-theme]`** — which read *backwards* for a theme toggle (in dark mode the
selected "Dark" button went bright). Two rules fix it (ADR-0016):

- **Fixed, non-theming swatch tokens.** Each button **previews** the theme it
  switches to via two `:root` tokens that are **deliberately NOT redefined under
  `.dark` / `[data-theme="dark"]`**: `--swatch-light` (`#FAF8F4`) and
  `--swatch-dark` (`#0F1115`), plus fixed on-swatch foregrounds
  (`--swatch-light-fg`, `--swatch-dark-fg`) so the label + moon/sun icon stay
  legible on each swatch in **both** themes. The "Dark" button is always dark and
  the "Light" button always light, in either theme. These are the system's first
  **frozen** (theme-independent) tokens — the precedent: a control that *previews*
  a mode paints from frozen tokens, never the live surface tokens.
- **Selection by de-emphasis, never accent.** The selected option is at full
  strength; the unselected one is **dimmed** (opacity). No ring, no ochre, no new
  hue — keeping the accent reserved for status / focus (ADR-0014) and "color =
  status / content-type only" intact.

`Segmented` is **unchanged** — its inverse-fill selection still serves the
card-variant, drawer-header, and dashboard Board↔Library switchers (those are mode
switches, not theme previews, and read correctly inverse-filled). Both consumers
swap unforked (ADR-0003): the styleguide `TopBar` and the dashboard `ShellRail`
header — same `value` / `onChange` / `options` contract, same persistence
(`dashboard/app/theme-state.js`, agentic-workflow-017); only the control's look
changed.

> **Gate re-confirmed after the ThemeToggle redesign (`design-system-007`): OPEN —
> re-approved by the builder 2026-06-09.** The theme control in the styleguide
> `TopBar` (every page) now wears the swatched look (each button its own theme, the
> inactive one dimmed) instead of the inverse-filled `Segmented`. This visible change
> rode the same re-review as `design-system-005`; the builder reviewed the live
> control in the canvas header and re-confirmed. The gate stands open against the
> **swatched theme control**.

> Live-board note: same as Motion — the served dashboard `dist/` is a derived
> artifact (ADR-0003) and was **rebuilt** (`node build.mjs`) to pick up the new
> control + swatch tokens.

## Relationships with other contexts

- **agentic-workflow** — depends on this BC's styleguide for its `dashboard` feature.
- **infrastructure** — the styleguide ships as plain static assets (no install); the
  dashboard's runtime (`infrastructure-001`) should vendor/pre-bundle the CDN scripts the
  canvas currently loads. See `design-system-001` → Delivery.

## Pointers

- Styleguide artifact: `styleguide/index.html` (+ `styleguide/styles/`, `styleguide/app/*.js` ES modules; entry `app/app.js`)
- Shared `Collapsible` primitive: `styleguide/app/collapsible.js` (+ React-free `collapsible-state.js`), consumed by `TreeGroup` and the dashboard board (design-system-005)
- BC index: `INDEX.md`
