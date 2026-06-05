/* eslint-disable */
/* ============================================================
   Agentheim — empty states
   ============================================================ */

function EmptyColumn({ status }) {
  const s = STATUSES[status];
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 8, padding: "26px 16px", textAlign: "center",
      border: "1px dashed var(--hairline-strong)", borderRadius: "var(--radius-md)",
      background: "transparent",
    }}>
      <Icon name="inbox" size={18} color="var(--fg-4)" />
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--fg-3)" }}>
        No tickets in {s.label.toLowerCase()}.
      </div>
      <button className="focusable" style={{
        border: "none", background: "transparent", cursor: "pointer",
        fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500, color: "var(--fg-2)",
        display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 4px",
      }}>
        Add ticket <Icon name="arrow-right" size={12} color="var(--fg-2)" />
      </button>
    </div>
  );
}

function EmptyDrawer() {
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 14, padding: 40, textAlign: "center",
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: "var(--radius-md)",
        border: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--surface-1)",
      }}>
        <Icon name="file-text" size={20} color="var(--fg-3)" />
      </div>
      <div style={{ maxWidth: 240 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--fg-2)", marginBottom: 4 }}>
          Nothing open
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-3)" }}>
          Select a ticket or a document to read it here.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EmptyColumn, EmptyDrawer });
