/* ============================================================
   Agentheim — dashboard board view (agentic-workflow-006)

   The dashboard's home view: the FLAT Kanban board rendered over
   live project data. It fetches the read projection (/api/tree,
   aw-005), pools every bounded context's tasks into the four
   lifecycle columns (board-data.treeToColumns), and renders them
   through the APPROVED styleguide components imported from the
   design-system single source (ADR-0003) — Column / TicketCard /
   ColumnHeader / EmptyColumn — AS-IS, no fork, no new pattern.

   Clicking a card emits an "open this task" intent (onOpen(ticket))
   the slide-over (aw-007) consumes. The shell below (DashboardApp)
   also mounts the library/navigation surface (aw-008) and the
   board↔library toggle.

   The board is READ-ONLY (ADR-0017): it never writes lifecycle
   state. The dashboard has no write path at all — skills (`modeling`
   / `work`) are the sole owners of task-lifecycle transitions. The
   board's single interactivity concern is staying current:
   - LIVE-UPDATE: the board subscribes to the SSE stream (GET
     /api/events) via createLiveUpdate; every tree-changed frame
     (or reconnect) just RE-FETCHES /api/tree and re-projects — the
     raw event is never interpreted as a transition. As skills move
     files on disk, the board reflects it within a frame.
   ============================================================ */
import { useState, useEffect, useCallback, useRef } from "react";

// Styleguide single source (ADR-0003): import the approved Kanban components
// across the BC boundary. They are CONSUMED, never copied — the design-system
// styleguide remains the one source of UI truth, the dashboard is a consumer.
import { html } from "../../.agentheim/contexts/design-system/styleguide/app/html.js";
import { ColumnHeader, TicketCard } from "../../.agentheim/contexts/design-system/styleguide/app/kanban.js";
import { EmptyColumn } from "../../.agentheim/contexts/design-system/styleguide/app/empty.js";
import { Icon } from "../../.agentheim/contexts/design-system/styleguide/app/icons.js";
import { Glyph, ThemeCtx } from "../../.agentheim/contexts/design-system/styleguide/app/foundations.js";
import { RailItem } from "../../.agentheim/contexts/design-system/styleguide/app/library.js";
import { Collapsible } from "../../.agentheim/contexts/design-system/styleguide/app/collapsible.js";
import { ThemeToggle } from "../../.agentheim/contexts/design-system/styleguide/app/live.js";

import { COLUMN_ORDER, treeToColumns } from "./board-data.js";
import { resolveTheme, saveTheme } from "./theme-state.js";
import { loadSkipPermissions, saveSkipPermissions } from "./skip-permissions-state.js";
import { SORT_OPTIONS, DEFAULT_SORT, sortTickets } from "./board-sort.js";
import { refineCommandFor, promoteCommandFor, MODELING_COMMAND, QUICK_CAPTURE_COMMAND } from "./modeling-command.js";
import { launchOrCopy } from "./bridge-launch.js";
import { groupTickets } from "./board-group.js";
import { loadViewState, saveViewState, defaultColumnState } from "./board-view-state.js";
import { SlideOver } from "./slide-over.js";
import { DashboardLibrary } from "./library.js";
import { createLiveUpdate } from "./live-update.js";

/**
 * React hook: subscribe to the SSE live-update stream and call `onResync` on
 * connect and every tree-changed frame. The board passes a /api/tree re-fetch;
 * the consumer never interprets the raw event (ADR-0001). `onResync` is held in a
 * ref so the subscription is established ONCE, not re-built on every render.
 */
function useLiveTree(onResync) {
  const cb = useRef(onResync);
  cb.current = onResync;
  useEffect(() => {
    if (typeof EventSource === "undefined") return undefined;
    const live = createLiveUpdate({ onResync: (evt) => cb.current && cb.current(evt) });
    return () => live.close();
  }, []);
}

const EMPTY_COLUMNS = (() => {
  const c = {};
  for (const k of COLUMN_ORDER) c[k] = [];
  return c;
})();

// A quiet board header strip — sized off the styleguide tokens, no new pattern.
function BoardHeader({ count }) {
  return html`
    <header style=${{
      display: "flex", alignItems: "center", gap: 12,
      padding: "0 4px 18px",
    }}>
      <span style=${{
        fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600,
        letterSpacing: "-0.01em", color: "var(--fg-1)",
      }}>Board</span>
      <span style=${{
        fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-3)",
        fontFeatureSettings: '"tnum"',
      }}>${count} ${count === 1 ? "task" : "tasks"}</span>
    </header>`;
}

function LoadState({ children }) {
  return html`
    <div style=${{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 10, padding: "80px 16px",
      fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--fg-3)",
    }}>${children}</div>`;
}

// The per-column sort control. A board-only affordance rendered as a SIBLING of
// the styleguide ColumnHeader (the board composes the styleguide sub-components and
// adds its own controls beside them): the styleguide kanban.js is consumed
// unmodified, never forked (ADR-0003). A plain native <select> styled off the
// design-system tokens —
// no new styleguide pattern. Changing it lifts the column's choice into board
// view-state via onChange; it never reorders anything itself (the pure
// board-sort.sortTickets does that, board-side, after the projection).
function ColumnSortControl({ status, value, onChange }) {
  return html`
    <label style=${{
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      <span style=${{
        fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--fg-4)",
      }}>Sort</span>
      <select
        aria-label=${`Sort ${status} column`}
        value=${value}
        onChange=${(e) => onChange(e.target.value)}
        className="focusable"
        style=${{
          fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--fg-2)",
          background: "var(--surface-1)", border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-sm)", padding: "3px 6px", cursor: "pointer",
        }}>
        ${SORT_OPTIONS.map((o) => html`<option key=${o.value} value=${o.value}>${o.label}</option>`)}
      </select>
    </label>`;
}

// The per-column group-by-BC toggle (aw-014). A board-only affordance, SIBLING of
// the sort control — same precedent: the styleguide kanban.js is consumed
// unmodified (ADR-0003), the control is native and token-styled, no new styleguide
// pattern. Flipping it lifts the column's grouped choice into persisted board
// view-state; the pure board-group.groupTickets does the partitioning at render
// time, so a live re-projection re-applies the choice rather than resetting it.
function ColumnGroupToggle({ status, grouped, onToggle }) {
  return html`
    <button
      type="button"
      className="focusable"
      aria-pressed=${grouped}
      aria-label=${`Group ${status} column by bounded context`}
      onClick=${() => onToggle(!grouped)}
      style=${{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: "var(--font-ui)", fontSize: 11.5,
        color: grouped ? "var(--fg-1)" : "var(--fg-2)",
        background: grouped ? "var(--surface-2)" : "var(--surface-1)",
        border: `1px solid ${grouped ? "var(--hairline-strong)" : "var(--hairline)"}`,
        borderRadius: "var(--radius-sm)", padding: "3px 7px", cursor: "pointer",
        transition: "background var(--duration-fast) var(--ease-base)",
      }}>
      <${Icon} name="box" size=${12.5} color=${grouped ? "var(--fg-1)" : "var(--fg-3)"} />
      <span>Group</span>
    </button>`;
}

// The board-only control strip beneath the styleguide ColumnHeader: sort + group,
// laid out as siblings. Both are board view-state affordances; neither forks the
// styleguide (ADR-0003).
function ColumnControls({ status, sort, onSortChange, grouped, onGroupToggle }) {
  return html`
    <div style=${{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: "0 4px 12px", marginTop: -4,
    }}>
      <${ColumnSortControl} status=${status} value=${sort} onChange=${onSortChange} />
      <${ColumnGroupToggle} status=${status} grouped=${grouped} onToggle=${onGroupToggle} />
    </div>`;
}

// Write `text` to the system clipboard with a graceful, no-throw fallback. The
// board's copy affordance is a convenience — a blocked/absent clipboard API (no
// secure context, denied permission, an old browser) must NEVER crash the board
// or surface an error (aw-016 AC). Returns a Promise<boolean> that resolves to
// whether the write succeeded; the caller only uses it for the transient
// "copied" feedback, so a false (or a rejection swallowed here) just means no
// feedback flashes — never a thrown error.
function copyToClipboard(text) {
  try {
    const clip = typeof navigator !== "undefined" ? navigator.clipboard : null;
    if (clip && typeof clip.writeText === "function") {
      return clip.writeText(text).then(() => true, () => false);
    }
  } catch {
    // navigator access itself threw (exotic sandbox) — fall through.
  }
  return Promise.resolve(false);
}

// A backlog LAUNCH button (agentic-workflow-020, extended aw-022). Clicking it
// tries to open a REAL, interactive Claude session seeded with `command` through
// the VS Code bridge (ADR-0018); if the bridge is unavailable for ANY reason — not
// in VS Code's Simple Browser, listener unreachable, timeout, CORS rejection — it
// SILENTLY falls back to copying `command` to the clipboard (the aw-016 behavior),
// flashing the same quiet "Copied" feedback. The whole try-bridge-then-copy
// decision is the pure `launchOrCopy` (bridge-launch.js); this is thin glue that
// supplies window.fetch + the no-throw copyToClipboard and renders the feedback.
// The board stays a projection of disk (ADR-0001): launching is an external
// side-effect, never a lifecycle write.
//
// `emphasis` (aw-022): "default" (the column pair's look) | "primary" (filled,
// emphasised — the expected card default) | "quiet" (text-weight, de-emphasised —
// the rarer/committing card action). All three stay within the styleguide's
// quiet-by-default law: token-styled, no new hue (the flash is the existing
// --st-done). When this button sits inside the styleguide card's cornerAction slot
// (aw-022) the slot already stops propagation; `isolateClick` adds a defensive
// stopPropagation here too so a future change to that wrapper can't re-open the
// card from this button (mirrors CopyCommandButton's belt-and-suspenders).
// `skipPermissions` (aw-021): when ARMED (true), each launch threads
// `skipPermissions: true` into launchOrCopy so the bridge seeds
// `claude --dangerously-skip-permissions`. When armed, the button ALSO carries an
// at-a-glance per-launch DANGER indicator (a "skips permissions" cue) so the
// conscious moment is each launch, not the one-time arm (amended ADR-0018). The
// indicator reflects the armed TOGGLE state, not a live bridge probe — it never
// probes /api/bridge on render (that would break the silent-absence contract and
// add a probe to every paint); it signals armed INTENT.
function LaunchButton({ label, command, icon, emphasis = "default", isolateClick = false, skipPermissions = false }) {
  // feedback: "idle" | "launched" | "copied". A transient label/colour swap, same
  // quiet treatment as CopyCommandButton — never an error state (absence is normal).
  const [feedback, setFeedback] = useState("idle");
  const timer = useRef(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onClick = useCallback((e) => {
    if (isolateClick && e && typeof e.stopPropagation === "function") e.stopPropagation();
    const fetchImpl = typeof window !== "undefined" && typeof window.fetch === "function"
      ? window.fetch.bind(window)
      : undefined;
    launchOrCopy({ prompt: command, fetchImpl, copy: copyToClipboard, skipPermissions: skipPermissions === true }).then((res) => {
      // Bridge launched -> a real terminal opened (flash "Launched"). Bridge absent
      // -> the command was copied (flash "Copied" only if the copy actually landed,
      // matching CopyCommandButton's quiet contract). Either way: never an error.
      if (res.via === "bridge") setFeedback("launched");
      else if (res.copied) setFeedback("copied");
      else return; // clipboard blocked too — stay silent.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFeedback("idle"), 1100);
    });
  }, [command, isolateClick, skipPermissions]);

  const flashed = feedback !== "idle";
  const labelText = feedback === "launched" ? "Launched" : feedback === "copied" ? "Copied" : label;
  const primary = emphasis === "primary";
  const quiet = emphasis === "quiet";
  // Idle treatment by emphasis (all token-styled, no new hue):
  //   primary -> filled surface-2 + stronger hairline + fg-1 (draws the eye);
  //   quiet   -> transparent, no border, fg-3 (recedes — text-weight);
  //   default -> the column pair's bordered surface-1 chip.
  const idleColor = primary ? "var(--fg-1)" : quiet ? "var(--fg-3)" : "var(--fg-2)";
  const idleBg = primary ? "var(--surface-2)" : quiet ? "transparent" : "var(--surface-1)";
  const idleBorder = quiet ? "1px solid transparent" : `1px solid ${primary ? "var(--hairline-strong)" : "var(--hairline)"}`;
  // ARMED per-launch indicator (aw-021, amended ADR-0018). When the toggle is on,
  // each launch button carries a danger-tinted border + a "skips permissions" dot
  // so THIS launch reads, at a glance, as a permission-bypassing one. The hue is
  // the EXISTING --obligation token (the styleguide's negative/red family) —
  // consumed unforked (ADR-0003), and deliberately NOT the reserved selection
  // accent --accent-ochre-soft (ADR-0016). The cue reflects the armed toggle, not
  // a live bridge probe. The flash (launched/copied) still wins so feedback reads.
  const armed = skipPermissions === true && !flashed;
  return html`
    <button
      type="button"
      className="focusable"
      title=${armed
        ? `${label} — launch ${command} with --dangerously-skip-permissions (armed; copies to clipboard if the bridge is unavailable — the clipboard copy does NOT skip permissions)`
        : `${label} — launch ${command} (copies to clipboard if the bridge is unavailable)`}
      aria-label=${armed
        ? `${label} — launch ${command} (skips permissions)`
        : `${label} — launch ${command}`}
      onClick=${onClick}
      style=${{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: "var(--font-ui)", fontSize: 11.5,
        fontWeight: primary ? 600 : 500,
        color: flashed ? "var(--st-done)" : (armed ? "var(--obligation)" : idleColor),
        background: flashed ? "var(--surface-1)" : idleBg,
        border: flashed ? "1px solid var(--st-done)" : (armed ? "1px solid var(--obligation)" : idleBorder),
        borderRadius: "var(--radius-sm)", padding: "4px 9px", cursor: "pointer",
        transition: "color var(--duration-fast) var(--ease-base), border-color var(--duration-fast) var(--ease-base)",
      }}
      onMouseEnter=${(e) => { if (!flashed && !armed && !quiet) e.currentTarget.style.borderColor = "var(--hairline-strong)"; }}
      onMouseLeave=${(e) => { if (!flashed && !armed && !quiet) e.currentTarget.style.borderColor = primary ? "var(--hairline-strong)" : "var(--hairline)"; }}>
      ${armed
        ? html`<span aria-hidden="true" title="This launch skips permissions" style=${{
            width: 6, height: 6, borderRadius: 99, background: "var(--obligation)", flexShrink: 0,
          }} />`
        : html`<${Icon} name=${icon} size=${12.5}
            color=${flashed ? "var(--st-done)" : (primary ? "var(--fg-2)" : "var(--fg-3)")} />`}
      <span>${labelText}</span>
    </button>`;
}

// The backlog add affordance (agentic-workflow-020): the single "Add ticket" `+`
// is REPLACED by TWO labelled launch buttons — Quick Capture (the fast idea-dump,
// `/agentheim:quick-capture`, aw-019) and Modeling (the full Socratic session,
// `/agentheim:modeling`). Each starts a seeded Claude session through the bridge,
// with the clipboard fallback. Rendered as a board-composed sibling of the
// styleguide ColumnHeader (the same precedent as ColumnSortControl /
// ColumnGroupToggle): the styleguide kanban.js / empty.js stay consumed UNFORKED
// (ADR-0003); these are native, token-styled board controls beside the primitive,
// not a fork of it. Backlog-only — todo/doing/done carry no add affordance (aw-018).
function BacklogLaunchPair({ skipPermissions = false }) {
  return html`
    <div role="group" aria-label="Start a new backlog entry" style=${{
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      padding: "0 4px 12px", marginTop: -4,
    }}>
      <${LaunchButton} label="Quick Capture" command=${QUICK_CAPTURE_COMMAND} icon="plus" skipPermissions=${skipPermissions} />
      <${LaunchButton} label="Modeling" command=${MODELING_COMMAND} icon="compass" skipPermissions=${skipPermissions} />
    </div>`;
}

// The per-CARD backlog launch group (agentic-workflow-022). The single per-card
// Copy affordance (aw-016) is REPLACED by TWO launch buttons composed INTO the
// styleguide TicketCard's existing single `cornerAction` render-prop slot
// (design-system-006): cornerAction's contract is "consumer owns what renders", so
// the board hands it a two-button group rather than one icon button — consuming the
// primitive UNFORKED (ADR-0003), not extending it. The styleguide keeps owning the
// slot's placement + its propagation-stopping wrapper; the board owns the group's
// internal layout and each button's launch behavior.
//
// A backlog card invites two real actions, so the pair is:
//   - Refine  (PRIMARY, emphasised) -> `/agentheim:modeling refine <id>` — the full
//     Socratic refinement; the expected default, since most backlog items need
//     deepening before they're ready.
//   - Promote (QUIET, de-emphasised) -> `/agentheim:modeling promote <id>` — the
//     readiness check + backlog → todo move; the rarer, more committing action.
// Each opens a real seeded terminal through the bridge, with the silent clipboard
// fallback (reusing aw-020's LaunchButton/launchOrCopy unchanged). Promote only
// ever runs backlog → todo, so this group belongs on backlog cards only.
function BacklogCardLaunchPair({ id, skipPermissions = false }) {
  return html`
    <div role="group" aria-label="Refine or promote this backlog item" style=${{
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      <${LaunchButton} label="Refine" command=${refineCommandFor(id)}
        icon="compass" emphasis="primary" isolateClick=${true} skipPermissions=${skipPermissions} />
      <${LaunchButton} label="Promote" command=${promoteCommandFor(id)}
        icon="arrow-right" emphasis="quiet" isolateClick=${true} skipPermissions=${skipPermissions} />
    </div>`;
}

// The board's per-BC section now COMPOSES the shared styleguide Collapsible
// primitive (design-system-005), CONTROLLED: the board owns each (column, BC)
// collapse state in its persisted view-state store (ADR-0015), so it supplies
// `open` + `onToggle` and the primitive writes no internal state of its own. The
// former board-local section header (a token-matched clone) is retired — the
// header look now lives once, in the styleguide, consumed unforked (ADR-0003).

// A read-only lifecycle column that COMPOSES the approved styleguide
// sub-components (ColumnHeader, TicketCard, EmptyColumn) exactly as the styleguide
// `Column` does — same pattern, no fork. The board carries NO drag affordances
// (ADR-0017): columns are inert projections of disk, never drop targets, and the
// dashboard never writes a lifecycle move. It hosts the board-only per-column sort
// control (aw-012) as a sibling of ColumnHeader; `tickets` arrives already ordered
// (the board sorts before passing it in).
// One TicketCard. Factored out so the flat list and the grouped sections render
// cards identically (same selection ring).
function BoardCard({ ticket, status, selectedId, onOpen, skipPermissions = false }) {
  // Backlog cards carry a Refine / Promote launch pair (aw-022) in the styleguide
  // card's bottom-right cornerAction slot (design-system-006), replacing aw-016's
  // single Copy affordance: Refine (primary) seeds `/agentheim:modeling refine
  // <id>` and Promote (quiet) seeds `/agentheim:modeling promote <id>`, each
  // opening a real seeded terminal through the bridge (clipboard fallback). The
  // board hands the slot's consumer-owned render-prop a two-button GROUP — unforked
  // consumption (ADR-0003), not an extension of the slot. Other columns pass no
  // cornerAction, so their cards render the slot empty (and, since ds-006, no dead
  // estimate chip either). The slot is click-isolated by the styleguide, so
  // launching never opens the slide-over.
  const cornerAction = status === "backlog"
    ? () => html`<${BacklogCardLaunchPair} id=${ticket.id} skipPermissions=${skipPermissions} />`
    : undefined;
  return html`
    <${TicketCard} key=${ticket.id} ticket=${ticket} variant="rail"
      selected=${selectedId === ticket.id} onClick=${() => onOpen(ticket)}
      cornerAction=${cornerAction} />`;
}

function BoardColumn({
  status, tickets, sort, onSortChange, grouped, onGroupToggle,
  collapsed, onToggleSection,
  selectedId, onOpen, skipPermissions = false,
}) {
  // Pipeline: tickets arrive ALREADY sorted (the board sorts before passing them
  // in); group them into sections here (board-group.groupTickets, pure). A flat
  // column yields one null-bc section; the toggle re-shapes presentation only.
  const sections = groupTickets(tickets, { grouped, collapsed });

  const renderCard = (t) => html`
    <${BoardCard} key=${t.id} ticket=${t} status=${status}
      selectedId=${selectedId} onOpen=${onOpen} skipPermissions=${skipPermissions} />`;

  return html`
    <div style=${{
      flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column",
      borderRadius: "var(--radius-md)",
    }}>
      <${ColumnHeader} status=${status} count=${tickets.length} />
      ${status === "backlog" && html`<${BacklogLaunchPair} skipPermissions=${skipPermissions} />`}
      <${ColumnControls} status=${status} sort=${sort} onSortChange=${onSortChange}
        grouped=${grouped} onGroupToggle=${onGroupToggle} />
      ${tickets.length === 0
        ? html`<div style=${{ paddingBottom: 8 }}><${EmptyColumn} status=${status} /></div>`
        : grouped
          ? html`
            <div style=${{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 8 }}>
              ${sections.map((sec) => html`
                <${Collapsible} key=${sec.bc} label=${sec.bc} count=${sec.count}
                  open=${!sec.collapsed} onToggle=${() => onToggleSection(sec.bc)}
                  bodyStyle=${{ gap: 10, paddingLeft: 2 }}>
                  ${sec.tickets.map(renderCard)}
                </${Collapsible}>`)}
            </div>`
          : html`
            <div style=${{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
              ${sections[0].tickets.map(renderCard)}
            </div>`}
    </div>`;
}

/**
 * The dashboard board. Self-contained: fetches /api/tree, transforms it into the
 * four flat columns, renders a read-only column per lifecycle, and (aw-009) stays
 * live via the SSE stream. It is READ-ONLY (ADR-0017): the dashboard never writes
 * lifecycle state — skills are the sole owners.
 *
 * Live-update: subscribes to GET /api/events; every tree-changed frame (or
 * reconnect) re-fetches /api/tree and re-projects — the raw event is never
 * interpreted as a transition. As skills move files on disk the board reflects it.
 *
 * @param {(ticket: object) => void} [onOpen] — open-intent sink (aw-007 wires it).
 * @param {string} [treeUrl] — overridable for tests / alternate mounts.
 */
export function DashboardBoard({ onOpen, treeUrl = "/api/tree", skipPermissions = false }) {
  const [columns, setColumns] = useState(EMPTY_COLUMNS);
  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [selectedId, setSelectedId] = useState(null);

  // Per-column VIEW LENS — { grouped, sort, collapsed } per column, independent
  // per column. PERSISTED across reloads via the single versioned localStorage
  // store (aw-014, reversing ADR-0009's no-localStorage clause; supersedes
  // aw-012's in-session-only sort). It is VIEW-STATE ONLY: the board's CONTENT
  // stays a projection of disk, re-fetched on every SSE frame. A column with no
  // stored state defaults to flat + default sort + all-expanded. The order and
  // grouping are DERIVED below at render time, so every loadTree re-projection
  // (SSE tree-changed / reconnect) re-applies the current choice — never resets.
  const [view, setView] = useState(() => {
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    const stored = loadViewState(storage);
    const v = {};
    for (const c of COLUMN_ORDER) v[c] = { ...defaultColumnState(), ...(stored[c] || {}) };
    return v;
  });

  // Persist on every change. A failed preference write is swallowed by the store;
  // it must never surface as a board error.
  useEffect(() => {
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    saveViewState(storage, view);
  }, [view]);

  const setColumnSort = useCallback((status, value) => {
    setView((prev) => (prev[status].sort === value
      ? prev
      : { ...prev, [status]: { ...prev[status], sort: value } }));
  }, []);

  const setColumnGrouped = useCallback((status, grouped) => {
    setView((prev) => (prev[status].grouped === grouped
      ? prev
      : { ...prev, [status]: { ...prev[status], grouped } }));
  }, []);

  // Toggle one (column, BC) section's collapse state. Stored as the list of
  // COLLAPSED BC names per column — absent = expanded (the all-expanded default).
  const toggleSection = useCallback((status, bc) => {
    setView((prev) => {
      const col = prev[status];
      const has = col.collapsed.includes(bc);
      const collapsed = has ? col.collapsed.filter((x) => x !== bc) : [...col.collapsed, bc];
      return { ...prev, [status]: { ...col, collapsed } };
    });
  }, []);

  // The single board re-projection: re-fetch /api/tree and rebuild the columns.
  // Called on mount and on every SSE tree-changed frame / reconnect — the board
  // is always rebuilt from disk, never mutated in place.
  const loadTree = useCallback(() => {
    let alive = true;
    fetch(treeUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`/api/tree ${r.status}`);
        return r.json();
      })
      .then((tree) => {
        if (!alive) return;
        setColumns(treeToColumns(tree));
        setPhase("ready");
      })
      .catch(() => {
        if (!alive) return;
        setColumns(EMPTY_COLUMNS);
        setPhase("error");
      });
    return () => { alive = false; };
  }, [treeUrl]);

  // Initial load.
  useEffect(() => { setPhase("loading"); return loadTree(); }, [loadTree]);

  // Live-update: re-sync the board on connect and every tree-changed frame. The
  // move's own SSE echo is just another tree-changed frame → one more re-fetch,
  // idempotent, no double-apply (ADR-0001).
  useLiveTree(loadTree);

  // Card click → emit the open intent (aw-007 consumes it). Selection state is
  // tracked here so the clicked card shows the styleguide selected ring.
  const handleOpen = useCallback((ticket) => {
    setSelectedId(ticket.id);
    if (typeof onOpen === "function") onOpen(ticket);
  }, [onOpen]);

  const total = COLUMN_ORDER.reduce((n, c) => n + columns[c].length, 0);

  if (phase === "loading") {
    return html`<${LoadState}><${Icon} name="loader" size=${15} color="var(--fg-4)" /> Loading board…</${LoadState}>`;
  }
  if (phase === "error") {
    return html`<${LoadState}><${Icon} name="triangle-alert" size=${15} color="var(--st-doing)" /> Could not load the board. Is the dashboard server running?</${LoadState}>`;
  }

  return html`
    <div>
      <${BoardHeader} count=${total} />
      <div className="scroll-quiet" style=${{ overflowX: "auto", paddingBottom: 8 }}>
        <div style=${{ minWidth: 880 }}>
          <div style=${{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            ${COLUMN_ORDER.map((status) => html`
              <${BoardColumn} key=${status} status=${status}
                tickets=${sortTickets(columns[status], view[status].sort)}
                sort=${view[status].sort} onSortChange=${(v) => setColumnSort(status, v)}
                grouped=${view[status].grouped} onGroupToggle=${(g) => setColumnGrouped(status, g)}
                collapsed=${view[status].collapsed} onToggleSection=${(bc) => toggleSection(status, bc)}
                selectedId=${selectedId} onOpen=${handleOpen} skipPermissions=${skipPermissions} />`)}
          </div>
        </div>
      </div>
    </div>`;
}

// The shell-header SKIP-PERMISSIONS armed toggle (aw-021). It lives in the
// ShellRail header next to the theme toggle (the aw-017 persisted-control
// precedent) — NOT a settings panel, since there is one setting today. It carries
// an ARMED / DANGER visual treatment so it never reads as a neutral preference:
// when on, it is filled with the existing --obligation token (the styleguide's
// negative/red family), consumed UNFORKED (ADR-0003) — deliberately NOT the
// reserved selection accent --accent-ochre-soft (ADR-0016). Off, it is a quiet,
// recessed control. Toggling it flips the persisted store (skip-permissions-state.js)
// in DashboardApp, which threads the armed flag into every launchOrCopy.
function SkipPermissionsToggle({ armed, onToggle }) {
  return html`
    <button
      type="button"
      className="focusable"
      role="switch"
      aria-checked=${armed}
      aria-label="Arm skip-permissions for bridge launches"
      title=${armed
        ? "Skip-permissions ARMED — every bridge launch starts claude --dangerously-skip-permissions. Click to disarm."
        : "Skip-permissions off — bridge launches prompt for permissions normally. Click to arm (launches will skip permission prompts)."}
      onClick=${() => onToggle(!armed)}
      style=${{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: armed ? 600 : 500,
        color: armed ? "var(--obligation)" : "var(--fg-3)",
        background: armed ? "var(--obligation-soft)" : "transparent",
        border: `1px solid ${armed ? "var(--obligation)" : "var(--hairline)"}`,
        borderRadius: "var(--radius-sm)", padding: "4px 9px", cursor: "pointer",
        transition: "color var(--duration-fast) var(--ease-base), border-color var(--duration-fast) var(--ease-base), background var(--duration-fast) var(--ease-base)",
      }}>
      <span aria-hidden="true" style=${{
        width: 7, height: 7, borderRadius: 99,
        background: armed ? "var(--obligation)" : "transparent",
        border: `1.5px solid ${armed ? "var(--obligation)" : "var(--fg-4)"}`,
        flexShrink: 0,
      }} />
      <span>${armed ? "Skips permissions" : "Skip permissions"}</span>
    </button>`;
}

// The shell's surface switch — Board (aw-006) vs Library (aw-008). Built from the
// approved styleguide RailItem (ADR-0003), the same primary-nav pattern the
// styleguide demo uses for exactly this toggle. No new pattern.
function ShellRail({ view, onView, projectName, theme, setTheme, skipPermissions, setSkipPermissions }) {
  return html`
    <header style=${{
      display: "flex", alignItems: "center", gap: 14,
      padding: "0 4px 22px",
    }}>
      <div style=${{ display: "flex", alignItems: "center", gap: 9 }}>
        <${Glyph} size=${22} />
        <span style=${{
          display: "flex", alignItems: "baseline", gap: 7,
          fontFamily: "var(--font-ui)", letterSpacing: "-0.01em",
        }}>
          <span style=${{ fontSize: 15, fontWeight: 600, color: "var(--fg-1)" }}>Agentheim</span>
          ${projectName ? html`
            <span aria-hidden="true" style=${{ color: "var(--fg-4)", fontSize: 13 }}>·</span>
            <span style=${{ fontSize: 13.5, fontWeight: 500, color: "var(--fg-3)" }}>${projectName}</span>` : null}
        </span>
      </div>
      <span style=${{ width: 1, height: 18, background: "var(--hairline-strong)" }} />
      <div style=${{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style=${{ width: 116 }}>
          <${RailItem} icon="square-kanban" label="Board"
            active=${view === "board"} onClick=${() => onView("board")} />
        </div>
        <div style=${{ width: 116 }}>
          <${RailItem} icon="library" label="Library"
            active=${view === "library"} onClick=${() => onView("library")} />
        </div>
      </div>
      <div style=${{ flex: 1 }} />
      <${SkipPermissionsToggle} armed=${skipPermissions} onToggle=${setSkipPermissions} />
      <${ThemeToggle} value=${theme} onChange=${setTheme} options=${[
        { value: "dark", label: "Dark", icon: "moon" },
        { value: "light", label: "Light", icon: "sun" },
      ]} />
    </header>`;
}

/**
 * The dashboard application shell. Minimal and composable: it owns the theme,
 * the page chrome, the board↔library surface toggle, and mounts whichever
 * surface is active. Both surfaces (board aw-006, library aw-008) emit the SAME
 * open-intent shape; the shell routes it into ONE universal slide-over
 * (SlideOver, aw-007), which fetches /api/doc and renders the markdown
 * client-side. Esc / scrim close by clearing the intent.
 */
export function DashboardApp() {
  // Theme is owned here and fed to the ThemeCtx.Provider + the data-theme effect.
  // First paint resolves from a persisted override (versioned localStorage) or,
  // on a first visit, the OS prefers-color-scheme — mirroring the styleguide's
  // "dark-first with a light toggle". The resolution is pure (theme-state.js) and
  // safe-degrades a malformed/stale/absent blob to the system default. The lazy
  // initializer keeps it a ONE-TIME read on mount, so an SSE re-projection of
  // /api/tree (a re-render of the surfaces below) never resets the chosen theme.
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return resolveTheme(window.localStorage, window.matchMedia);
  });
  // Reflect the theme onto the documentElement and animate the flip with the
  // styleguide's theme-fade transition, matching the styleguide App() behaviour.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.add("theme-fade");
    const t = setTimeout(() => document.documentElement.classList.remove("theme-fade"), 320);
    return () => clearTimeout(t);
  }, [theme]);
  // The user's explicit toggle is the only thing we persist — once set, it
  // overrides the system preference on the next reload.
  const onThemeChange = useCallback((next) => {
    setTheme(next);
    if (typeof window !== "undefined") saveTheme(window.localStorage, next);
  }, []);

  // The SKIP-PERMISSIONS armed toggle (aw-021), owned here and threaded down to
  // every launch button so each bridge launch posts `skipPermissions: true` when
  // armed (else omits it). DEFAULT OFF, and a malformed/stale/absent persisted
  // blob degrades to OFF (the bypass is never silently on — skip-permissions-state.js).
  // The lazy initializer keeps it a one-time read on mount, so an SSE re-projection
  // never resets the armed choice. It is presentation view-state only — never a
  // disk lifecycle write — so the dashboard stays read-only over .agentheim/.
  const [skipPermissions, setSkipPermissions] = useState(() => {
    if (typeof window === "undefined") return false;
    return loadSkipPermissions(window.localStorage);
  });
  const onSkipPermissionsChange = useCallback((next) => {
    const armed = next === true;
    setSkipPermissions(armed);
    if (typeof window !== "undefined") saveSkipPermissions(window.localStorage, armed);
  }, []);

  // Which surface is shown — the task board or the non-task library/discovery.
  const [view, setView] = useState("board"); // board | library

  // Project name for the header (aw-015) — disambiguates WHICH project's
  // .agentheim is being viewed (Agentheim is installed across many repos). It
  // rides the existing /api/tree projection (project.name, parsed server-side
  // from vision.md's `# Vision:` heading). The vision name is static within a
  // session, so a one-time read on mount suffices — no SSE re-read needed.
  const [projectName, setProjectName] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/tree")
      .then((r) => (r.ok ? r.json() : null))
      .then((tree) => { if (alive && tree && tree.project) setProjectName(tree.project.name); })
      .catch(() => {}); // header name is non-essential; failure leaves "Agentheim" alone
    return () => { alive = false; };
  }, []);

  // The clicked task/artifact, or null when the slide-over is closed. Either
  // surface emits the open-intent on click; the slide-over consumes it, fetches
  // the doc, and renders it.
  const [openIntent, setOpenIntent] = useState(null);
  const onOpen = useCallback((item) => {
    setOpenIntent(item);
    if (typeof window !== "undefined") window.__agentheimLastOpen = item;
  }, []);
  const onClose = useCallback(() => setOpenIntent(null), []);

  return html`
    <${ThemeCtx.Provider} value=${theme}>
      <main style=${{ maxWidth: 1160, margin: "0 auto", padding: "28px 28px 56px" }}>
        <${ShellRail} view=${view} onView=${setView} projectName=${projectName}
          theme=${theme} setTheme=${onThemeChange}
          skipPermissions=${skipPermissions} setSkipPermissions=${onSkipPermissionsChange} />
        ${view === "library"
          ? html`<${DashboardLibrary} onOpen=${onOpen} />`
          : html`<${DashboardBoard} onOpen=${onOpen} skipPermissions=${skipPermissions} />`}
      </main>
      <${SlideOver} intent=${openIntent} onClose=${onClose} />
    </${ThemeCtx.Provider}>`;
}
