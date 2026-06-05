/* eslint-disable */
/* ============================================================
   Agentheim — slide-over drawer
   Animates in from the right (in-context, Notion-like).
   Two header directions: "minimal" and "contextual".
   ============================================================ */
const { useState, useEffect } = React;

// ---- Ghost icon button ----
function IconButton({ name, title, onClick, size = 16 }) {
  const [hover, setHover] = useState(false);
  return (
    <button className="focusable" title={title} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, borderRadius: "var(--radius-sm)",
        border: "none", cursor: "pointer",
        background: hover ? "var(--surface-2)" : "transparent",
        color: hover ? "var(--fg-1)" : "var(--fg-3)",
        transition: "background var(--duration-fast) var(--ease-base), color var(--duration-fast) var(--ease-base)",
      }}>
      <Icon name={name} size={size} />
    </button>
  );
}

// Normalize a ticket or doc into a common shape for the drawer
function describeItem(item) {
  if (!item) return null;
  if (item.status) {
    // ticket
    return {
      kind: "ticket", type: "ticket",
      path: `tickets/${item.id}.md`,
      id: item.id, status: item.status,
      context: item.context, est: item.est, agent: item.agent, updated: item.updated,
      body: item.body,
    };
  }
  return {
    kind: "doc", type: item.type,
    path: item.meta, id: null, body: item.body,
  };
}

// ---- Drawer header: minimal ----
function HeaderMinimal({ info, onClose }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 16px 14px 22px", borderBottom: "1px solid var(--hairline)",
      flexShrink: 0,
    }}>
      <TypePill type={info.type} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-3)" }}>{info.path}</span>
      <div style={{ flex: 1 }} />
      <IconButton name="copy" title="Copy path" />
      <IconButton name="square-arrow-out-up-right" title="Open in editor" />
      <div style={{ width: 1, height: 18, background: "var(--hairline)", margin: "0 2px" }} />
      <IconButton name="x" title="Close" onClick={onClose} size={17} />
    </div>
  );
}

// ---- Drawer header: contextual (tinted band + meta) ----
function HeaderContextual({ info, onClose }) {
  const t = CONTENT_TYPES[info.type];
  return (
    <div style={{
      padding: "16px 16px 14px 22px", borderBottom: "1px solid var(--hairline)",
      background: t.tint, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <TypePill type={info.type} />
        {info.kind === "ticket" && <StatusChip status={info.status} />}
        <div style={{ flex: 1 }} />
        <IconButton name="copy" title="Copy path" />
        <IconButton name="square-arrow-out-up-right" title="Open in editor" />
        <IconButton name="x" title="Close" onClick={onClose} size={17} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11, paddingLeft: 1 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-3)" }}>{info.path}</span>
        {info.kind === "ticket" && (
          <>
            <span style={{ color: "var(--fg-4)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--fg-3)" }}>
              <Icon name="folder" size={12} color="var(--fg-3)" />{info.context}
            </span>
            <span style={{ color: "var(--fg-4)" }}>·</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-3)" }}>updated {info.updated}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Drawer ----
function Drawer({ item, headerVariant = "minimal", onClose, contained = true }) {
  const [render, setRender] = useState(!!item);
  const [shown, setShown] = useState(false);
  const [cur, setCur] = useState(item);

  useEffect(() => {
    if (item) {
      setCur(item);
      setRender(true);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(r);
    } else if (render) {
      setShown(false);
      const tmo = setTimeout(() => setRender(false), 200);
      return () => clearTimeout(tmo);
    }
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!render) return null;
  const info = describeItem(cur);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40, overflow: "hidden", borderRadius: "inherit" }}>
      {/* Scrim */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(8,9,12,0.40)",
        opacity: shown ? 1 : 0,
        transition: "opacity var(--duration-base) var(--ease-base)",
        backdropFilter: "saturate(0.9)",
      }} />

      {/* Panel */}
      <div className="scroll-quiet" style={{
        position: "absolute", top: 0, right: 0, bottom: 0,
        width: "min(560px, 78%)",
        background: "var(--surface-0)",
        borderLeft: "1px solid var(--hairline)",
        boxShadow: "var(--shadow-drawer)",
        display: "flex", flexDirection: "column",
        transform: shown ? "translateX(0)" : "translateX(100%)",
        transition: "transform var(--duration-base) var(--ease-base)",
        willChange: "transform",
      }}>
        {headerVariant === "contextual"
          ? <HeaderContextual info={info} onClose={onClose} />
          : <HeaderMinimal info={info} onClose={onClose} />}

        {/* Scrollable body */}
        <div className="scroll-quiet" style={{ flex: 1, overflowY: "auto", padding: "30px 40px 56px" }}>
          <Markdown source={info.body} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Drawer, IconButton, describeItem, HeaderMinimal, HeaderContextual });
