/* eslint-disable */
/* ============================================================
   Agentheim — shared primitives
   Icon, content-type badge, status dot, meta chip, and the
   Markdown renderer used inside the drawer.
   ============================================================ */
const { useState, useRef, useEffect, useMemo, useCallback } = React;
// Icon is provided by app/icons.jsx (inline SVG, no runtime library).

// ---- Content-type badge: colored icon + optional label ----
function TypeBadge({ type, showLabel = true, size = 15 }) {
  const t = CONTENT_TYPES[type];
  if (!t) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: t.color, minWidth: 0 }}>
      <Icon name={t.icon} size={size} color={t.color} />
      {showLabel && (
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 500, color: t.color, whiteSpace: "nowrap" }}>
          {t.label}
        </span>
      )}
    </span>
  );
}

// ---- Content-type pill (tinted chip with icon) ----
function TypePill({ type }) {
  const t = CONTENT_TYPES[type];
  if (!t) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px 3px 7px", borderRadius: "var(--radius-sm)",
      background: t.tint, color: t.color,
      fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 500, letterSpacing: "0.01em",
    }}>
      <Icon name={t.icon} size={13} color={t.color} />
      {t.label}
    </span>
  );
}

// ---- Status dot ----
function StatusDot({ status, size = 8 }) {
  const s = STATUSES[status];
  if (!s) return null;
  const isBacklog = status === "backlog";
  return (
    <span style={{
      width: size, height: size, borderRadius: 99, flexShrink: 0,
      background: isBacklog ? "transparent" : s.color,
      boxShadow: isBacklog ? `inset 0 0 0 1.5px ${s.color}` : "none",
    }} />
  );
}

// ---- Status chip ----
function StatusChip({ status }) {
  const s = STATUSES[status];
  if (!s) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px", borderRadius: 99,
      background: s.tint, color: s.color,
      fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 500,
    }}>
      <StatusDot status={status} size={6} />
      {s.label}
    </span>
  );
}

// ---- Meta chip (neutral, for ticket meta) ----
function MetaChip({ icon, children, mono = false }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 7px", borderRadius: "var(--radius-sm)",
      background: "var(--surface-1)", border: "1px solid var(--hairline)",
      color: "var(--fg-2)",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)",
      fontSize: 11, fontWeight: mono ? 400 : 500,
      fontFeatureSettings: mono ? '"tnum","zero"' : "normal",
    }}>
      {icon && <Icon name={icon} size={12} color="var(--fg-3)" />}
      {children}
    </span>
  );
}

// ---- Mono identifier (ticket id / ADR id) ----
function MonoId({ children, color = "var(--fg-3)" }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 500,
      letterSpacing: "0.01em", color, fontFeatureSettings: '"tnum","zero"',
    }}>{children}</span>
  );
}

// ============================================================
//  Markdown renderer
// ============================================================
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const HL_MASTER = new RegExp(
  "(\\/\\/[^\\n]*|#[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)" +                     // 1 comment
  "|(\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`)" + // 2 string
  "|\\b(type|interface|function|return|const|let|var|import|from|export|new|true|false|null|kind|reduce|reduce|async|await|if|else)\\b" + // 3 keyword
  "|\\b(\\d+(?:\\.\\d+)?)\\b",                                            // 4 number
  "g"
);

function highlightCode(text) {
  let out = "";
  let last = 0;
  let m;
  HL_MASTER.lastIndex = 0;
  while ((m = HL_MASTER.exec(text)) !== null) {
    out += escapeHtml(text.slice(last, m.index));
    if (m[1]) out += `<span class="c-comment">${escapeHtml(m[1])}</span>`;
    else if (m[2]) out += `<span class="c-str">${escapeHtml(m[2])}</span>`;
    else if (m[3]) out += `<span class="c-key">${escapeHtml(m[3])}</span>`;
    else if (m[4]) out += `<span class="c-num">${escapeHtml(m[4])}</span>`;
    last = m.index + m[0].length;
  }
  out += escapeHtml(text.slice(last));
  return out;
}

function Markdown({ source }) {
  const ref = useRef(null);
  const html = useMemo(() => {
    if (!window.marked) return escapeHtml(source);
    return window.marked.parse(source, { gfm: true, breaks: false });
  }, [source]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Task lists
    el.querySelectorAll("li").forEach((li) => {
      const cb = li.querySelector('input[type="checkbox"]');
      if (cb) {
        li.classList.add("task-list-item");
        const ul = li.closest("ul");
        if (ul) ul.classList.add("contains-task-list");
      }
    });
    // Syntax highlight code blocks
    el.querySelectorAll("pre code").forEach((code) => {
      code.innerHTML = highlightCode(code.textContent);
    });
  }, [html]);

  return <div className="prose" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}

Object.assign(window, {
  TypeBadge, TypePill, StatusDot, StatusChip, MetaChip, MonoId, Markdown,
});
