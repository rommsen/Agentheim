/* eslint-disable */
/* ============================================================
   Agentheim — left navigation / file tree
   Browses the project's agent workspace. Content-type icons
   are colored by their token so a README, an ADR, and a
   research note are distinguishable at a glance.
   ============================================================ */
const { useState } = React;

// ---- A single document row in the tree ----
function TreeItem({ item, selected, onOpen }) {
  const [hover, setHover] = useState(false);
  const t = CONTENT_TYPES[item.type];
  return (
    <button className="focusable"
      onClick={() => onOpen(item)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 9, width: "100%",
        padding: "6px 8px 6px 10px", borderRadius: "var(--radius-sm)",
        border: "none", cursor: "pointer", textAlign: "left",
        background: selected ? "var(--surface-2)" : (hover ? "var(--surface-1)" : "transparent"),
        boxShadow: selected ? "inset 2px 0 0 " + t.color : "none",
        transition: "background var(--duration-fast) var(--ease-base)",
      }}>
      <Icon name={t.icon} size={14.5} color={t.color} />
      <span style={{
        flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        fontFamily: "var(--font-ui)", fontSize: 13,
        fontWeight: selected ? 500 : 400,
        color: selected ? "var(--fg-1)" : "var(--fg-2)",
      }}>{item.title}</span>
    </button>
  );
}

// ---- A collapsible group ----
function TreeGroup({ group, items, selectedId, onOpen, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 4 }}>
      <button className="focusable" onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 6, width: "100%",
        padding: "6px 8px", border: "none", background: "transparent", cursor: "pointer",
      }}>
        <Icon name="chevron-right" size={13} color="var(--fg-3)"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform var(--duration-fast) var(--ease-base)" }} />
        <span style={{
          fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--fg-3)",
        }}>{group}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-4)" }}>{items.length}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 8 }}>
          {items.map((it) => (
            <TreeItem key={it.id} item={it} selected={selectedId === it.id} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Primary nav item (Board / Library) ----
function RailItem({ icon, label, active, badge, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button className="focusable" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", textAlign: "left",
        background: active ? "var(--surface-2)" : (hover ? "var(--surface-1)" : "transparent"),
        color: active ? "var(--fg-1)" : "var(--fg-2)",
        fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: active ? 500 : 400,
        transition: "background var(--duration-fast) var(--ease-base), color var(--duration-fast) var(--ease-base)",
      }}>
      <Icon name={icon} size={15.5} color={active ? "var(--fg-1)" : "var(--fg-3)"} />
      {label}
      <div style={{ flex: 1 }} />
      {badge != null && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{badge}</span>}
    </button>
  );
}

// ---- The full left rail used in the live demo ----
function AppRail({ view, onView, selectedId, onOpen }) {
  return (
    <nav style={{
      width: 248, flexShrink: 0, height: "100%", boxSizing: "border-box",
      background: "var(--surface-0)", borderRight: "1px solid var(--hairline)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 16px 14px" }}>
        <Glyph size={22} />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--fg-1)" }}>Agentheim</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-4)", padding: "2px 6px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)" }}>0.1</span>
      </div>

      {/* Primary nav */}
      <div style={{ padding: "4px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        <RailItem icon="square-kanban" label="Board" active={view === "board"} badge={TICKETS.length} onClick={() => onView("board")} />
        <RailItem icon="library" label="Library" active={view === "library"} badge={LIBRARY.reduce((n, g) => n + g.items.length, 0)} onClick={() => onView("library")} />
      </div>

      <div style={{ height: 1, background: "var(--hairline)", margin: "12px 16px" }} />

      {/* File tree */}
      <div className="scroll-quiet" style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
        <div style={{ padding: "0 8px 8px", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--fg-3)" }}>
          Workspace
        </div>
        {LIBRARY.map((g) => (
          <TreeGroup key={g.group} group={g.group} items={g.items} selectedId={selectedId} onOpen={onOpen} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--hairline)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", lineHeight: 1.6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="folder-git-2" size={11} color="var(--fg-3)" /> ~/projects/agentheim
        </div>
      </div>
    </nav>
  );
}

Object.assign(window, { TreeItem, TreeGroup, RailItem, AppRail });
