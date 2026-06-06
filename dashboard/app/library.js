/* ============================================================
   Agentheim — dashboard library / navigation view (agentic-workflow-008)

   The dashboard's DISCOVERY surface: makes the project's NON-TASK
   knowledge base browsable — vision, context map, every BC README,
   ADRs, research reports — drawn from the artifact-location half of
   the read projection (/api/tree, aw-005). The board (aw-006) owns
   tasks; this owns everything else.

   It fetches the read projection, transforms it into legibly-grouped
   artifacts (library-data.treeToLibrary), and renders each group
   through the APPROVED styleguide navigation imported from the
   design-system single source (ADR-0003) — TreeGroup / TreeItem —
   AS-IS, no fork, no new pattern.

   Clicking any artifact emits the SAME "open this" intent shape the
   board emits (onOpen(item) carrying { type, title, path }); the
   shell routes it into the EXISTING universal slide-over (aw-007),
   which fetches /api/doc and renders the markdown. The board↔library
   toggle lives in the shell (board.js). This is read-only; the
   Promote write path + SSE live-update are aw-009.
   ============================================================ */
import { useState, useEffect, useCallback } from "react";

// Styleguide single source (ADR-0003): import the approved navigation across
// the BC boundary. CONSUMED, never copied.
import { html } from "../../.agentheim/contexts/design-system/styleguide/app/html.js";
import { TreeGroup } from "../../.agentheim/contexts/design-system/styleguide/app/library.js";
import { Icon } from "../../.agentheim/contexts/design-system/styleguide/app/icons.js";

import { treeToLibrary, libraryCount } from "./library-data.js";

// A quiet library header strip — sized off the styleguide tokens, no new pattern.
function LibraryHeader({ count }) {
  return html`
    <header style=${{
      display: "flex", alignItems: "center", gap: 12,
      padding: "0 4px 18px",
    }}>
      <span style=${{
        fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600,
        letterSpacing: "-0.01em", color: "var(--fg-1)",
      }}>Library</span>
      <span style=${{
        fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-3)",
        fontFeatureSettings: '"tnum"',
      }}>${count} ${count === 1 ? "artifact" : "artifacts"}</span>
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

function EmptyState() {
  return html`
    <div style=${{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 8, padding: "72px 16px", textAlign: "center",
    }}>
      <${Icon} name="library" size=${22} color="var(--fg-4)" />
      <span style=${{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--fg-3)" }}>
        No artifacts to browse yet.
      </span>
      <span style=${{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--fg-4)" }}>
        A vision, context map, BC READMEs, ADRs, and research will appear here.
      </span>
    </div>`;
}

/**
 * The dashboard library/navigation view. Self-contained: fetches /api/tree,
 * transforms its artifact locations into legible groups, and renders the
 * styleguide TreeGroup per group. Selection state is tracked here so the clicked
 * row shows the styleguide selected edge; the open-intent is emitted to `onOpen`
 * so the shell's universal slide-over (aw-007) consumes it.
 *
 * @param {(artifact: object) => void} [onOpen] — open-intent sink (the shell wires it).
 * @param {string} [treeUrl] — overridable for tests / alternate mounts.
 */
export function DashboardLibrary({ onOpen, treeUrl = "/api/tree" }) {
  const [groups, setGroups] = useState([]);
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
        setGroups(treeToLibrary(tree));
        setPhase("ready");
      })
      .catch(() => {
        if (!alive) return;
        setGroups([]);
        setPhase("error");
      });
    return () => { alive = false; };
  }, [treeUrl]);

  // Row click → emit the open intent (the slide-over consumes it). Selection is
  // tracked here so the clicked row shows the styleguide selected edge.
  const handleOpen = useCallback((artifact) => {
    setSelectedId(artifact.id);
    if (typeof onOpen === "function") onOpen(artifact);
  }, [onOpen]);

  const total = libraryCount(groups);

  if (phase === "loading") {
    return html`<${LoadState}><${Icon} name="loader" size=${15} color="var(--fg-4)" /> Loading library…</${LoadState}>`;
  }
  if (phase === "error") {
    return html`<${LoadState}><${Icon} name="triangle-alert" size=${15} color="var(--st-doing)" /> Could not load the library. Is the dashboard server running?</${LoadState}>`;
  }

  return html`
    <div>
      <${LibraryHeader} count=${total} />
      ${total === 0
        ? html`<${EmptyState} />`
        : html`
          <div style=${{ maxWidth: 460 }}>
            ${groups.map((g) => html`
              <${TreeGroup} key=${g.group} group=${g.group} items=${g.items}
                selectedId=${selectedId} onOpen=${handleOpen}
                defaultOpen=${g.group !== "Research"} />`)}
          </div>`}
    </div>`;
}
