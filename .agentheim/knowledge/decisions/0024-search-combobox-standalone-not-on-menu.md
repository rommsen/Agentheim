# ADR-0024 — The search combobox's floating panel is STANDALONE — it matches the Menu's `--shadow-md` Popover elevation by convention, not by composition

- Status: Accepted
- Date: 2026-06-16
- Context (BC): design-system
- Supersedes: —
- Related: ADR-0003 (styleguide single source of UI truth — the search pattern lives in the styleguide source, consumed unforked; this ADR is about how it is *built*, not where it lives), ADR-0005 (buildless htm view factory — the combobox is authored with htm tagged templates), design-system-015 (the shared `Menu` / `Popover` primitive whose elevation this convention mirrors and whose composition it deliberately declines), design-system-005 / design-system-006 (the "styleguide owns the look, consumer drives behavior" body-agnostic seam this pattern reuses), agentic-workflow-052 (the dashboard global-search UI consumer), agentic-workflow-050 / ADR-0023 (the `/api/search` backend that feeds the consumer)

## Context

`design-system-015` shipped a shared `Menu` / `Popover` primitive (`app/menu.js`) — a trigger that toggles an anchored, dismissible floating panel at `--shadow-md` elevation, with its own Esc + outside-click dismissal. Its own Notes anticipated extracting a generic popover "when a second popover consumer appears."

`design-system-016` is that second consumer: the dashboard's global search needs a text input that, as you type, opens a floating panel of grouped results. On the surface this looks like a Menu — a control that reveals an anchored, dismissible floating panel — so the obvious move is to compose the search panel **on** the `Menu` primitive and inherit its panel chrome + dismissal for free.

But a combobox and a menu differ on the one axis that matters most for a floating-panel primitive: **where focus lives while the panel is open.**

- A **`Menu`** moves focus **INTO** its items: the trigger opens the panel and the user tabs/arrows through focusable rows, each of which holds the document's focus in turn.
- A **combobox** keeps focus **IN THE INPUT** the entire time. The user never leaves the text field; up/down move a single *visual* highlight across the result rows while the input retains focus, and the highlighted row is announced to assistive tech via **`aria-activedescendant`** (the input points at the active row's id; the rows themselves are never focused).

Composing the combobox on `Menu` would mean fighting the primitive's focus model — suppressing the focus-into-items behavior the Menu is built around, then re-adding active-descendant on top. That is more code and more coupling than building the panel directly, and it would leave the Menu primitive carrying a second, contradictory focus contract.

## Decision

**Build the search combobox's floating panel + dismiss machinery STANDALONE in `app/search.js` — NOT composed on `design-system-015`'s `Menu`. Make the two popovers read identically by matching the Menu's Popover elevation as a CONVENTION (the same token values), not by sharing code.**

### 1. Standalone panel, standalone dismiss

`SearchField` owns its own floating panel: it conditionally renders the listbox it reveals (the open/close truth derived purely from the query + result count via `panelState` in `search-state.js`), and wires its own `mousedown` outside-click + Esc dismissal. It does **not** import `Menu`. The dismissal *predicate* is the same shape as the Menu's (`shouldDismissOnOutsideClick(open, targetInsideRoot)`, `isDismissKey(key)`) — re-stated in `search-state.js` so the two popovers dismiss by the **same rule** — but the wiring is the combobox's own, because the combobox's keyboard model (active-descendant, Enter-selects-highlight, arrows-move-highlight) is foreign to the Menu's.

### 2. Elevation by convention, not composition

The panel matches the Menu's Popover elevation **by convention**: the same `--shadow-md` shadow, `--surface-1` surface, `--hairline` border, and `--radius-md` radius. The two popovers therefore read as the *same surface* to the eye without sharing a line of code. This keeps the token discipline (no drift) that composition would have enforced, while leaving each primitive's behavior independent.

### 3. The seam stays the same

The body-agnostic, data-driven seam is unchanged from `Menu` / `Collapsible` / `cornerAction`: the consumer supplies the grouped result data + an `onSelect` callback, and the styleguide owns the look, placement, and keyboard mechanics. The styleguide never fetches or ranks — it is *fed* (ADR-0023's `/api/search` is the backend; aw-052 the wiring).

### 4. When to revisit

If a **third** popover-ish consumer appears whose focus model is the input-retaining combobox kind (or whose needs otherwise overlap this dismiss machinery), the standalone outside-click/Esc machinery here becomes an extraction candidate — a small shared `usePopoverDismiss`-style seam both `Menu` and `SearchField` could consume. That is out of scope here, exactly per the BC's "promote the shared primitive only when a second consumer appears" doctrine (the same doctrine that kept the token-styled text **input** search-scoped rather than extracted as a general `Input` primitive on its first appearance).

## Consequences

- **The two popovers stay visually unified but behaviorally independent.** A reader of the canvas sees the Menu panel (section 10) and the search panel (section 11) as the same elevated surface; a reader of the source sees two primitives that do not depend on each other.
- **The combobox's a11y is honest.** Focus stays in the input, the listbox carries `role="listbox"` with `role="option"` rows, and `aria-activedescendant` tracks the highlight — the standard ARIA combobox pattern, not a menu bent into a combobox shape.
- **Token drift risk is carried by convention, not the type system.** Because the elevation match is a convention, a future change to the Menu's Popover elevation would not automatically propagate to the search panel. The `search.test.mjs` source-guards (asserting `--shadow-md` / `--surface-1` / `--hairline` on the panel) are the tripwire that keeps the convention honest; if the two ever need to move together, that is the signal to extract the shared shell (point 4).
- **No new shared abstraction is introduced prematurely.** One consumer does not a primitive make; the extraction is deferred until a third consumer justifies it.
