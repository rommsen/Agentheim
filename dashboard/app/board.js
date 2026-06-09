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

   aw-009 adds the two interactivity concerns, both bound by the rule
   "disk is the source of truth, the board is a projection rebuilt
   from it" (ADR-0001):
   - LIVE-UPDATE: the board subscribes to the SSE stream (GET
     /api/events) via createLiveUpdate; every tree-changed frame
     (or reconnect) just RE-FETCHES /api/tree and re-projects — the
     raw event is never interpreted as a transition.
   - PROMOTE: dragging a card backlog→todo POSTs to /api/task/move,
     which delegates to the shared mover (applyTaskMove). Every other
     column is a non-drop target (isLegalDrop); a rejected/stale move
     surfaces the domain reason and re-fetches. There is NO UI-only
     writer of lifecycle state — the server's applyTaskMove is the
     sole writer.
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

import { COLUMN_ORDER, treeToColumns } from "./board-data.js";
import { SORT_OPTIONS, DEFAULT_SORT, sortTickets } from "./board-sort.js";
import { groupTickets } from "./board-group.js";
import { loadViewState, saveViewState, defaultColumnState } from "./board-view-state.js";
import { SlideOver } from "./slide-over.js";
import { DashboardLibrary } from "./library.js";
import { createLiveUpdate } from "./live-update.js";
import { isLegalDrop, postMove } from "./promote.js";

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
// the styleguide ColumnHeader (the exact precedent DragColumn sets for its drag
// affordances): the styleguide kanban.js is consumed unmodified, never forked
// (ADR-0003). It is a plain native <select> styled off the design-system tokens —
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

// A board-local, collapsible per-BC section header. The styleguide's TreeGroup
// collapsible primitive (design-system library.js) is coupled to TreeItem rows and
// owns its own open state — it does not fit a board section that renders draggable
// TicketCards with externally-PERSISTED collapse state. So this is a board-local
// header matching the SAME styleguide tokens (chevron, uppercase label, mono
// count) as TreeGroup, exactly as the sort <select> is a board-local control
// (ADR-0003 precedent). A design-system capture is filed for the shared collapsible
// primitive this reveals (design-system backlog).
function BCSectionHeader({ bc, count, collapsed, onToggle }) {
  return html`
    <button className="focusable" onClick=${onToggle}
      aria-expanded=${!collapsed}
      style=${{
        display: "flex", alignItems: "center", gap: 6, width: "100%",
        padding: "5px 6px", border: "none", background: "transparent", cursor: "pointer",
        textAlign: "left",
      }}>
      <${Icon} name="chevron-right" size=${13} color="var(--fg-3)"
        style=${{ transform: collapsed ? "rotate(0deg)" : "rotate(90deg)", transition: "transform var(--duration-fast) var(--ease-base)" }} />
      <span style=${{
        flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--fg-3)",
      }}>${bc}</span>
      <span style=${{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-4)" }}>${count}</span>
    </button>`;
}

// A drop-target lifecycle column that COMPOSES the approved styleguide
// sub-components (ColumnHeader, TicketCard, EmptyColumn) exactly as the styleguide
// `Column` does — same pattern, no fork — and adds the HTML5 drag affordances the
// styleguide does not carry: each card is a drag SOURCE, and a column whose drop
// is legal (isLegalDrop, ADR-0001) is a drop TARGET. Non-legal columns set no
// drop handlers, so they are inert non-drop targets. It also hosts the board-only
// per-column sort control (aw-012) as a sibling of ColumnHeader; `tickets` arrives
// already ordered (the board sorts before passing it in).
// One draggable TicketCard. Factored out so the flat list and the grouped
// sections render cards identically (same drag source, same selection ring).
function DraggableCard({ ticket, status, selectedId, onOpen, onDragStart, onDragEnd }) {
  return html`
    <div key=${ticket.id} draggable=${true}
      onDragStart=${(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(ticket, status); }}
      onDragEnd=${onDragEnd}
      style=${{ cursor: "grab" }}>
      <${TicketCard} ticket=${ticket} variant="rail"
        selected=${selectedId === ticket.id} onClick=${() => onOpen(ticket)} />
    </div>`;
}

function DragColumn({
  status, tickets, sort, onSortChange, grouped, onGroupToggle,
  collapsed, onToggleSection,
  selectedId, onOpen, draggingFrom, onDragStart, onDragEnd, onDrop,
}) {
  const isTarget = draggingFrom != null && isLegalDrop(draggingFrom, status);
  const [over, setOver] = useState(false);

  // Only a legal target wires drop handlers; every other column stays inert.
  const dropProps = isTarget
    ? {
        onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (!over) setOver(true); },
        onDragLeave: () => setOver(false),
        onDrop: (e) => { e.preventDefault(); setOver(false); onDrop(status); },
      }
    : {};

  // Pipeline: tickets arrive ALREADY sorted (the board sorts before passing them
  // in); group them into sections here (board-group.groupTickets, pure). A flat
  // column yields one null-bc section; the toggle re-shapes presentation only.
  const sections = groupTickets(tickets, { grouped, collapsed });

  const renderCard = (t) => html`
    <${DraggableCard} key=${t.id} ticket=${t} status=${status}
      selectedId=${selectedId} onOpen=${onOpen}
      onDragStart=${onDragStart} onDragEnd=${onDragEnd} />`;

  return html`
    <div ...${dropProps} style=${{
      flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column",
      borderRadius: "var(--radius-md)",
      outline: isTarget && over ? "1px dashed var(--accent-ochre)" : "1px dashed transparent",
      outlineOffset: 4,
      background: isTarget && over ? "var(--accent-ochre-soft)" : "transparent",
      transition: "background var(--duration-fast) var(--ease-base)",
    }}>
      <${ColumnHeader} status=${status} count=${tickets.length} onAdd=${() => {}} />
      <${ColumnControls} status=${status} sort=${sort} onSortChange=${onSortChange}
        grouped=${grouped} onGroupToggle=${onGroupToggle} />
      ${tickets.length === 0
        ? html`<div style=${{ paddingBottom: 8 }}><${EmptyColumn} status=${status} /></div>`
        : grouped
          ? html`
            <div style=${{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 8 }}>
              ${sections.map((sec) => html`
                <div key=${sec.bc} style=${{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <${BCSectionHeader} bc=${sec.bc} count=${sec.count}
                    collapsed=${sec.collapsed} onToggle=${() => onToggleSection(sec.bc)} />
                  ${!sec.collapsed && html`
                    <div style=${{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 2 }}>
                      ${sec.tickets.map(renderCard)}
                    </div>`}
                </div>`)}
            </div>`
          : html`
            <div style=${{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
              ${sections[0].tickets.map(renderCard)}
            </div>`}
    </div>`;
}

/**
 * The dashboard board. Self-contained: fetches /api/tree, transforms it into the
 * four flat columns, renders a drop-target column per lifecycle, and (aw-009)
 * stays live via the SSE stream + drives the one UI write (Promote).
 *
 * Live-update: subscribes to GET /api/events; every tree-changed frame (or
 * reconnect) re-fetches /api/tree and re-projects — the raw event is never
 * interpreted as a transition (ADR-0001). Promote: dragging backlog→todo POSTs to
 * /api/task/move (→ applyTaskMove); a rejected/stale move surfaces the domain
 * reason and re-fetches. No UI-only writer of lifecycle state exists.
 *
 * @param {(ticket: object) => void} [onOpen] — open-intent sink (aw-007 wires it).
 * @param {string} [treeUrl] — overridable for tests / alternate mounts.
 */
export function DashboardBoard({ onOpen, treeUrl = "/api/tree" }) {
  const [columns, setColumns] = useState(EMPTY_COLUMNS);
  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState(null); // a refused-move domain reason
  const [dragging, setDragging] = useState(null); // { id, from } | null

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
  // Called on mount, on every SSE tree-changed frame / reconnect, and after a
  // Promote (success OR rejection) — the board is always rebuilt from disk.
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

  const handleDragStart = useCallback((ticket, from) => {
    setNotice(null);
    setDragging({ id: ticket.id, from });
  }, []);
  const handleDragEnd = useCallback(() => setDragging(null), []);

  // The one UI write: a legal Promote drop. Delegates to the server's
  // applyTaskMove via postMove; on rejection surfaces the domain reason. EITHER
  // way the board re-fetches (the projection is rebuilt from disk).
  const handleDrop = useCallback(async (to) => {
    const move = dragging;
    setDragging(null);
    if (!move) return;
    const res = await postMove({ id: move.id, from: move.from, to });
    if (!res.ok) {
      setNotice(res.reason || `Move refused (${res.code || res.status}).`);
    } else {
      setNotice(null);
    }
    // Rebuild from disk regardless — disk is the source of truth (ADR-0001).
    loadTree();
  }, [dragging, loadTree]);

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
      ${notice && html`
        <div role="alert" style=${{
          display: "flex", alignItems: "center", gap: 8,
          margin: "0 4px 14px", padding: "9px 12px",
          borderRadius: "var(--radius-md)", border: "1px solid var(--hairline-strong)",
          background: "var(--surface-1)", fontFamily: "var(--font-ui)", fontSize: 12.5,
          color: "var(--fg-2)",
        }}>
          <${Icon} name="triangle-alert" size=${14} color="var(--st-doing)" />
          <span>${notice}</span>
        </div>`}
      <div className="scroll-quiet" style=${{ overflowX: "auto", paddingBottom: 8 }}>
        <div style=${{ minWidth: 880 }}>
          <div style=${{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            ${COLUMN_ORDER.map((status) => html`
              <${DragColumn} key=${status} status=${status}
                tickets=${sortTickets(columns[status], view[status].sort)}
                sort=${view[status].sort} onSortChange=${(v) => setColumnSort(status, v)}
                grouped=${view[status].grouped} onGroupToggle=${(g) => setColumnGrouped(status, g)}
                collapsed=${view[status].collapsed} onToggleSection=${(bc) => toggleSection(status, bc)}
                selectedId=${selectedId} onOpen=${handleOpen}
                draggingFrom=${dragging ? dragging.from : null}
                onDragStart=${handleDragStart} onDragEnd=${handleDragEnd}
                onDrop=${handleDrop} />`)}
          </div>
        </div>
      </div>
    </div>`;
}

// The shell's surface switch — Board (aw-006) vs Library (aw-008). Built from the
// approved styleguide RailItem (ADR-0003), the same primary-nav pattern the
// styleguide demo uses for exactly this toggle. No new pattern.
function ShellRail({ view, onView, projectName }) {
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
  const [theme] = useState("dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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
        <${ShellRail} view=${view} onView=${setView} projectName=${projectName} />
        ${view === "library"
          ? html`<${DashboardLibrary} onOpen=${onOpen} />`
          : html`<${DashboardBoard} onOpen=${onOpen} />`}
      </main>
      <${SlideOver} intent=${openIntent} onClose=${onClose} />
    </${ThemeCtx.Provider}>`;
}
