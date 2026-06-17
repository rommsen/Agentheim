/* ============================================================
   Agentheim — dashboard WHAT'S-NEXT panel state (agentic-workflow-073)

   The `whats-next` skill writes a single-latest ADVISORY recommendation artifact
   (ADR-0027) at `.agentheim/state/whats-next.md` — frontmattered markdown carrying
   a `generated` ISO-8601 timestamp and three body sections. The dashboard READS it
   (never writes it) and renders it as a dismissible panel above the board prompt
   bar. This module is the dashboard-side state behind that panel:

     1. The DISMISS store — whether the panel is dismissed, persisted across reloads.
        It is a SIBLING of theme-state.js (aw-017) and board-view-state.js (aw-014 /
        ADR-0015): a single versioned localStorage key with safe degradation. It is
        KEYED BY the artifact's `generated` timestamp, so dismissing one
        recommendation does NOT suppress the next — a NEWER write (a different
        `generated`) re-shows the panel.
     2. `formatStaleness` — a PURE staleness formatter over the `generated` stamp.
        This is a rendering cue ONLY (ADR-0027 §4: the frontmatter is descriptive,
        nothing keys behaviour off it).

   Every degraded path — malformed JSON, a stale version, an absent blob, a
   non-string value, no backend, a throwing storage — resolves to "NOT dismissed",
   never throws. A corrupt preference must never hide a fresh recommendation. Like
   its siblings, this is presentation view-state ONLY; it records no lifecycle truth
   and survives every SSE re-projection untouched. Pure over an INJECTED storage
   backend, framework-free, unit-tested under `node --test` with no DOM.
   ============================================================ */

// The single in-root path of the advisory artifact (ADR-0027 §2). The panel fetches
// it via the existing GET /api/doc carrier (the same in-root-guarded body transport
// the slide-over and main-pane reader use — ADR-0021 / ADR-0023).
export const WHATS_NEXT_DOC_PATH = '.agentheim/state/whats-next.md';

// The one localStorage key the dismiss state lives under. Its own key, distinct from
// the board view-state envelope and the theme key (a sibling concern).
export const WHATS_NEXT_KEY = 'agentheim.dashboard.whatsNext';

// Bump when the persisted shape changes incompatibly: a blob written by a different
// version is ignored on load (treated as "not dismissed"), so an old preference can
// never feed a shape this version does not understand.
export const WHATS_NEXT_VERSION = 1;

/**
 * Read the dismissed `generated` stamp from the injected storage.
 * @param {{ getItem: (k: string) => (string|null) } | null | undefined} storage
 * @returns {string | null} the `generated` stamp that was dismissed, or `null` when
 *   there is no backend, no stored blob, a stale version, malformed JSON, or a
 *   non-string value. `null` means "nothing dismissed". Never throws.
 */
export function loadDismissed(storage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  let raw;
  try {
    raw = storage.getItem(WHATS_NEXT_KEY);
  } catch {
    return null; // storage access can throw (disabled / private mode).
  }
  if (raw == null) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null; // a corrupt blob must never crash the dashboard.
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.version !== WHATS_NEXT_VERSION) return null; // a different shape — ignore.
  if (typeof parsed.dismissedGenerated !== 'string') return null; // not a stamp — ignore.
  return parsed.dismissedGenerated;
}

/**
 * Persist the `generated` stamp of the dismissed recommendation under the versioned
 * envelope. A no-op when there is no backend or the stamp is not a string (no garbage
 * is ever written). Storage write failures are swallowed. Never throws.
 * @param {{ setItem: (k: string, v: string) => void } | null | undefined} storage
 * @param {string} generated — the artifact's `generated` stamp being dismissed.
 */
export function saveDismissed(storage, generated) {
  if (!storage || typeof storage.setItem !== 'function') return;
  if (typeof generated !== 'string') return;
  try {
    storage.setItem(
      WHATS_NEXT_KEY,
      JSON.stringify({ version: WHATS_NEXT_VERSION, dismissedGenerated: generated }),
    );
  } catch {
    /* preference persistence is best-effort; never throw. */
  }
}

/**
 * Whether the panel for the CURRENT recommendation is dismissed. True ONLY when the
 * stored dismissed stamp equals the current artifact's `generated` stamp — so a NEWER
 * recommendation (a different, non-empty stamp) is NOT dismissed and re-shows. A
 * missing/blank current stamp is never dismissed (it can match no stored stamp).
 * Every degraded store resolves to `false`. Never throws.
 * @param {{ getItem: (k: string) => (string|null) } | null | undefined} storage
 * @param {string} generated — the current artifact's `generated` stamp.
 * @returns {boolean}
 */
export function isDismissed(storage, generated) {
  if (typeof generated !== 'string' || generated === '') return false;
  return loadDismissed(storage) === generated;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Pluralise a whole-number count + unit ("1 minute" / "5 minutes"). */
function ago(count, unit) {
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}

/**
 * Format the age of a recommendation as a human staleness cue — RENDERING ONLY
 * (ADR-0027 §4). Under a minute (or a future-stamped clock) reads "just now"; older
 * reads "N minutes/hours/days ago". An unparseable / missing timestamp returns ""
 * (the panel then shows no cue) rather than throwing.
 * @param {string|null|undefined} generated — the ISO-8601 `generated` stamp.
 * @param {number} now — the current epoch ms (injected so it stays pure/testable).
 * @returns {string} the staleness label, or "" when unparseable.
 */
export function formatStaleness(generated, now) {
  if (typeof generated !== 'string' || generated === '') return '';
  const then = Date.parse(generated);
  if (Number.isNaN(then)) return '';
  const elapsed = Number(now) - then;
  if (!Number.isFinite(elapsed) || elapsed < MINUTE) return 'just now'; // also clamps future.
  if (elapsed < HOUR) return ago(Math.floor(elapsed / MINUTE), 'minute');
  if (elapsed < DAY) return ago(Math.floor(elapsed / HOUR), 'hour');
  return ago(Math.floor(elapsed / DAY), 'day');
}
