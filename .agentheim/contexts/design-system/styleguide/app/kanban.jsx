/* eslint-disable */
/* ============================================================
   Agentheim — Kanban
   Column header + ticket card (two directions) + board.
   ============================================================ */
const { useState } = React;

// ---- Column header ----
function ColumnHeader({ status, count, onAdd }) {
  const s = STATUSES[status];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "0 4px 12px", marginBottom: 4,
    }}>
      <StatusDot status={status} size={8} />
      <span style={{
        fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
        letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-2)",
      }}>{s.label}</span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-3)",
        fontFeatureSettings: '"tnum"',
      }}>{count}</span>
      <div style={{ flex: 1 }} />
      <button className="focusable" title="Add ticket" onClick={onAdd} style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 22, height: 22, borderRadius: "var(--radius-sm)",
        border: "none", background: "transparent", color: "var(--fg-3)", cursor: "pointer",
        transition: "background var(--duration-fast) var(--ease-base), color var(--duration-fast) var(--ease-base)",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--fg-1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg-3)"; }}>
        <Icon name="plus" size={15} />
      </button>
    </div>
  );
}

// ---- Ticket card ----
// variant: "rail" (status as a colored left edge) | "badge" (status pill on top)
function TicketCard({ ticket, variant = "rail", selected = false, onClick, forceHover = false }) {
  const [hover, setHover] = useState(false);
  const s = STATUSES[ticket.status];
  const isHover = hover || forceHover;

  const base = {
    position: "relative",
    background: "var(--surface-1)",
    border: "1px solid var(--hairline)",
    borderRadius: "var(--radius-md)",
    padding: variant === "rail" ? "13px 14px 13px 16px" : "12px 14px 13px",
    cursor: "pointer",
    overflow: "hidden",
    transition: "border-color var(--duration-fast) var(--ease-base), box-shadow var(--duration-fast) var(--ease-base), transform var(--duration-fast) var(--ease-base)",
    boxShadow: isHover ? "var(--shadow-sm)" : "none",
    transform: isHover ? "translateY(-1px)" : "translateY(0)",
    borderColor: selected ? "var(--accent-ochre)" : (isHover ? "var(--hairline-strong)" : "var(--hairline)"),
  };
  if (selected) base.boxShadow = "0 0 0 1px var(--accent-ochre), var(--shadow-sm)";

  return (
    <div className="focusable" tabIndex={0} role="button" aria-pressed={selected}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick && onClick(); } }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={base}>

      {variant === "rail" && (
        <span style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: s.color, opacity: 0.9,
        }} />
      )}

      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {variant === "badge"
          ? <StatusChip status={ticket.status} />
          : <MonoId color="var(--fg-3)">{ticket.id}</MonoId>}
        <div style={{ flex: 1 }} />
        {ticket.agent && (
          <span title="Assigned to an agent" style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 500,
            color: "var(--ct-context)",
          }}>
            <Icon name="bot" size={13} color="var(--ct-context)" />
          </span>
        )}
        {variant === "badge" && <MonoId color="var(--fg-3)">{ticket.id}</MonoId>}
      </div>

      {/* Title */}
      <div style={{
        fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500,
        lineHeight: 1.4, color: "var(--fg-1)", marginBottom: 12,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden", textWrap: "pretty",
      }}>{ticket.title}</div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <MetaChip icon="folder">{ticket.context}</MetaChip>
        <MetaChip mono>{ticket.est} pt</MetaChip>
        <div style={{ flex: 1 }} />
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-4)",
        }}>{ticket.updated}</span>
      </div>
    </div>
  );
}

// ---- Column (header + stacked cards) ----
function Column({ status, tickets, variant, selectedId, onOpen }) {
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column" }}>
      <ColumnHeader status={status} count={tickets.length} onAdd={() => {}} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
        {tickets.length === 0
          ? <EmptyColumn status={status} />
          : tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} variant={variant}
                selected={selectedId === t.id} onClick={() => onOpen(t)} />
            ))}
      </div>
    </div>
  );
}

// ---- Board ----
function KanbanBoard({ variant = "rail", selectedId, onOpen }) {
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      {COLUMN_ORDER.map((status) => (
        <Column key={status} status={status} variant={variant}
          tickets={TICKETS.filter((t) => t.status === status)}
          selectedId={selectedId} onOpen={onOpen} />
      ))}
    </div>
  );
}

Object.assign(window, { ColumnHeader, TicketCard, Column, KanbanBoard });
