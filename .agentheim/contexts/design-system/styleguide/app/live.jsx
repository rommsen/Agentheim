/* eslint-disable */
/* ============================================================
   Agentheim — live demo pieces: top bar, board topbar,
   library grid, and the framed interactive app.
   ============================================================ */
const { useState } = React;

// ---- Segmented control ----
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", padding: 2, gap: 2, background: "var(--surface-1)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} className="focusable" onClick={() => onChange(o.value)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 11px", border: "none", borderRadius: 3, cursor: "pointer",
            background: active ? "var(--surface-inverse)" : "transparent",
            color: active ? "var(--surface-0)" : "var(--fg-2)",
            fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500,
            transition: "background var(--duration-fast) var(--ease-base), color var(--duration-fast) var(--ease-base)",
          }}>
            {o.icon && <Icon name={o.icon} size={13} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---- The board's own topbar (inside the demo frame) ----
function BoardTopbar({ view }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "0 18px", height: 52, flexShrink: 0,
      borderBottom: "1px solid var(--hairline)", background: "var(--surface-0)",
    }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>
        {view === "board" ? "Board" : "Library"}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
        {view === "board" ? "agentheim / tickets" : "agentheim / docs"}
      </span>
      <div style={{ flex: 1 }} />
      <div style={{
        display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 10px",
        border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", color: "var(--fg-3)",
        background: "var(--surface-0)", minWidth: 168,
      }}>
        <Icon name="search" size={14} />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--fg-3)" }}>Search</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-4)", border: "1px solid var(--hairline)", borderRadius: 3, padding: "0 4px" }}>/</span>
      </div>
      <button className="focusable" style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px",
        border: "1px solid var(--fg-1)", borderRadius: "var(--radius-sm)", cursor: "pointer",
        background: "var(--fg-1)", color: "var(--surface-0)",
        fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 500,
      }}>
        <Icon name="plus" size={14} /> New ticket
      </button>
    </div>
  );
}

// ---- Library main panel ----
function LibraryGrid({ selectedId, onOpen }) {
  return (
    <div className="scroll-quiet" style={{ flex: 1, overflowY: "auto", padding: "26px 28px 40px" }}>
      <div style={{ maxWidth: 720 }}>
        {LIBRARY.map((g) => (
          <div key={g.group} style={{ marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>{g.group}</span>
              <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {g.items.map((it) => (
                <DocRow key={it.id} item={it} selected={selectedId === it.id} onOpen={onOpen} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocRow({ item, selected, onOpen }) {
  const [hover, setHover] = useState(false);
  const t = CONTENT_TYPES[item.type];
  return (
    <button className="focusable" onClick={() => onOpen(item)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left",
        padding: "12px 14px", borderRadius: "var(--radius-md)", cursor: "pointer",
        background: selected ? "var(--surface-2)" : "var(--surface-1)",
        border: "1px solid " + (selected ? "var(--accent-ochre)" : (hover ? "var(--hairline-strong)" : "var(--hairline)")),
        boxShadow: hover ? "var(--shadow-sm)" : "none",
        transition: "border-color var(--duration-fast) var(--ease-base), box-shadow var(--duration-fast) var(--ease-base)",
      }}>
      <div style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)", background: t.tint }}>
        <Icon name={t.icon} size={17} color={t.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--fg-1)" }}>{item.title}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{item.meta}</div>
      </div>
      <span style={{ marginLeft: "auto" }}><TypePill type={item.type} /></span>
      <Icon name="chevron-right" size={16} color="var(--fg-4)" />
    </button>
  );
}

// ---- The framed live application ----
function LiveApp({ cardVariant, headerVariant }) {
  const [view, setView] = useState("board");
  const [open, setOpen] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const openItem = (it) => { setOpen(it); setSelectedId(it.id); };
  const close = () => { setOpen(null); setSelectedId(null); };

  return (
    <div style={{
      position: "relative", height: 580, display: "flex",
      border: "1px solid var(--hairline-strong)", borderRadius: "var(--radius-md)",
      overflow: "hidden", background: "var(--surface-0)", boxShadow: "var(--shadow-md)",
    }}>
      <AppRail view={view} onView={(v) => { setView(v); }} selectedId={selectedId} onOpen={openItem} />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--surface-0)" }}>
        <BoardTopbar view={view} />
        {view === "board" ? (
          <div className="scroll-quiet" style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "20px 18px 28px" }}>
            <div style={{ minWidth: 880 }}>
              <KanbanBoard variant={cardVariant} selectedId={selectedId} onOpen={openItem} />
            </div>
          </div>
        ) : (
          <LibraryGrid selectedId={selectedId} onOpen={openItem} />
        )}
      </div>

      <Drawer item={open} headerVariant={headerVariant} onClose={close} />
    </div>
  );
}

Object.assign(window, { Segmented, BoardTopbar, LibraryGrid, DocRow, LiveApp });
