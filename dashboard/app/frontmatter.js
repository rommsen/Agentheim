/* ============================================================
   Agentheim — dashboard frontmatter folding (agentic-workflow-043)

   A pure, framework-free string transform that runs UPSTREAM of the styleguide
   `Markdown` primitive (consumed unforked — ADR-0003: marked.parse + gfm +
   dangerouslySetInnerHTML, so raw HTML passes through verbatim).

   Documents fetched from /api/doc (tickets, ADRs, BC READMEs, research) carry a
   leading YAML frontmatter block:

       ---
       id: agentic-workflow-043
       status: todo
       ---
       ## Why
       …

   Handed raw to `Markdown`, marked reads the trailing `---` as a setext heading
   underline and renders the whole `key: value` block as one large bold-white
   heading at the top — on BOTH render surfaces that share the primitive: the task
   slide-over (ADR-0010, Drawer → Markdown) and the main-pane reader (ADR-0021,
   Markdown directly).

   The fix is ONE transform applied at both boundaries:
     1. STRIP the leading `---`…`---` block out of the body (so it never renders
        as a heading or inline text).
     2. RE-EMIT it as a native, token-styled, collapsed-by-default
        `<details><summary>Front matter</summary>…</details>` table prepended to
        the stripped body. Native `<details>` gives collapse + toggle for free —
        no React state, no Drawer/Markdown fork, no design-system child task.

   Because marked passes the raw HTML (and its `style=` attributes) through, the
   SAME composed string flows through the Drawer and the direct Markdown. Quiet
   styling rides on inline, token-referencing styles (var(--fg-3), smaller
   font-size, mono values) — never an <h*> that `.prose` paints large+bold+white.

   Hand-rolled flat key/value parse — NO YAML dependency, no nested parsing;
   values are kept as their trimmed raw string ([], [a, b], feature …). Matches
   the BC's pure-helper precedent (board-sort.js, slide-over-data.js,
   confetti-launch.js), unit-tested under `node --test`.
   ============================================================ */

const DELIM = '---';

/**
 * Split a markdown string into its leading frontmatter fields and the remaining
 * body. Frontmatter is recognised ONLY when the VERY FIRST line is `---` and a
 * later line is a closing `---`; an unterminated opener, a mid-document `---`
 * (horizontal rule), or no opener all yield no fields and the raw body.
 *
 * @param {string} raw — the raw markdown.
 * @returns {{ fields: Array<[string, string]>, body: string }}
 */
export function parseFrontmatter(raw) {
  const text = typeof raw === 'string' ? raw : '';
  const lines = text.split('\n');

  // The opener must be the very first line (exactly `---`, trimmed).
  if (lines.length === 0 || lines[0].trim() !== DELIM) {
    return { fields: [], body: text };
  }

  // Find the closing delimiter among the following lines.
  let close = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === DELIM) { close = i; break; }
  }
  // An unterminated block is not frontmatter — pass the whole string through.
  if (close === -1) {
    return { fields: [], body: text };
  }

  const fields = [];
  for (let i = 1; i < close; i += 1) {
    const line = lines[i];
    const colon = line.indexOf(':');
    if (colon === -1) continue; // skip non key:value lines (blank, comments)
    const key = line.slice(0, colon).trim();
    if (!key) continue;
    const value = line.slice(colon + 1).trim();
    fields.push([key, value]);
  }

  // Body is everything after the closing delimiter, with the leading blank line
  // (the conventional gap between frontmatter and content) trimmed off.
  const body = lines.slice(close + 1).join('\n').replace(/^\n+/, '');
  return { fields, body };
}

/** Escape a string for safe embedding in HTML text/attribute context. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Token-referencing inline styles. marked passes `style=` through verbatim, so
// this is how "subdued, not bold-white" is achieved without touching .prose CSS
// or forking the Markdown primitive (ADR-0003).
const DETAILS_STYLE = 'margin:0 0 1.25rem;font-size:12.5px;color:var(--fg-3);';
const SUMMARY_STYLE = 'cursor:pointer;font-family:var(--font-ui);font-size:11.5px;'
  + 'letter-spacing:0.04em;text-transform:uppercase;color:var(--fg-4);'
  + 'user-select:none;padding:2px 0;';
const TABLE_STYLE = 'border-collapse:collapse;margin:8px 0 0;width:auto;';
const KEY_STYLE = 'padding:2px 16px 2px 0;vertical-align:top;'
  + 'font-family:var(--font-mono);color:var(--fg-4);white-space:nowrap;';
const VAL_STYLE = 'padding:2px 0;vertical-align:top;'
  + 'font-family:var(--font-mono);color:var(--fg-3);';

/**
 * Render frontmatter fields as a native, collapsed-by-default `<details>` with a
 * one-row-per-field table. Returns `""` when there are no fields (no empty
 * section). Keys and values are HTML-escaped — no markup injection, no broken
 * table; array/empty values render as their raw string (never [object Object]).
 *
 * @param {Array<[string, string]>} fields
 * @returns {string} HTML string (empty when no fields).
 */
export function frontmatterSection(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return '';

  const rows = fields.map(([key, value]) =>
    `<tr><td style="${KEY_STYLE}">${escapeHtml(key)}</td>`
    + `<td style="${VAL_STYLE}">${escapeHtml(value)}</td></tr>`,
  ).join('');

  return `<details style="${DETAILS_STYLE}">`
    + `<summary style="${SUMMARY_STYLE}">Front matter</summary>`
    + `<table style="${TABLE_STYLE}"><tbody>${rows}</tbody></table>`
    + `</details>`;
}

/**
 * The one call both render surfaces use: strip the leading frontmatter out of
 * the raw body and prepend the collapsible section. A document with no
 * frontmatter passes through byte-for-byte (no section, no change).
 *
 * @param {string} raw — the raw markdown fetched from /api/doc.
 * @returns {string} section + stripped body.
 */
export function withFrontmatterSection(raw) {
  const { fields, body } = parseFrontmatter(raw);
  return frontmatterSection(fields) + body;
}
