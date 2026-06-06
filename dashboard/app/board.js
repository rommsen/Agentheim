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
   board↔library toggle. This is the read-only board; the
   drag-to-Promote write path is aw-009.
   ============================================================ */
import { useState, useEffect, useCallback } from "react";

// Styleguide single source (ADR-0003): import the approved Kanban components
// across the BC boundary. They are CONSUMED, never copied — the design-system
// styleguide remains the one source of UI truth, the dashboard is a consumer.
import { html } from "../../.agentheim/contexts/design-system/styleguide/app/html.js";
import { Column } from "../../.agentheim/contexts/design-system/styleguide/app/kanban.js";
import { Icon } from "../../.agentheim/contexts/design-system/styleguide/app/icons.js";
import { Glyph, ThemeCtx } from "../../.agentheim/contexts/design-system/styleguide/app/foundations.js";
import { RailItem } from "../../.agentheim/contexts/design-system/styleguide/app/library.js";

import { COLUMN_ORDER, treeToColumns } from "./board-data.js";
import { SlideOver } from "./slide-over.js";
import { DashboardLibrary } from "./library.js";

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

/**
 * The dashboard board. Self-contained: fetches /api/tree, transforms it into the
 * four flat columns, and renders the styleguide Column per lifecycle. Selection
 * + open-intent are lifted here so aw-007's slide-over can later read `selectedId`
 * and consume the emitted ticket.
 *
 * @param {(ticket: object) => void} [onOpen] — open-intent sink (aw-007 wires it).
 * @param {string} [treeUrl] — overridable for tests / alternate mounts.
 */
export function DashboardBoard({ onOpen, treeUrl = "/api/tree" }) {
  const [columns, setColumns] = useState(EMPTY_COLUMNS);
  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let alive = true;
    setPhase("loading");
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
              <${Column} key=${status} status=${status} variant="rail"
                tickets=${columns[status]}
                selectedId=${selectedId} onOpen=${handleOpen} />`)}
          </div>
        </div>
      </div>
    </div>`;
}

// The shell's surface switch — Board (aw-006) vs Library (aw-008). Built from the
// approved styleguide RailItem (ADR-0003), the same primary-nav pattern the
// styleguide demo uses for exactly this toggle. No new pattern.
function ShellRail({ view, onView }) {
  return html`
    <header style=${{
      display: "flex", alignItems: "center", gap: 14,
      padding: "0 4px 22px",
    }}>
      <div style=${{ display: "flex", alignItems: "center", gap: 9 }}>
        <${Glyph} size=${22} />
        <span style=${{
          fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600,
          letterSpacing: "-0.01em", color: "var(--fg-1)",
        }}>Agentheim</span>
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
        <${ShellRail} view=${view} onView=${setView} />
        ${view === "library"
          ? html`<${DashboardLibrary} onOpen=${onOpen} />`
          : html`<${DashboardBoard} onOpen=${onOpen} />`}
      </main>
      <${SlideOver} intent=${openIntent} onClose=${onClose} />
    </${ThemeCtx.Provider}>`;
}
