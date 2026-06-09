/* ============================================================
   Agentheim — dashboard persisted THEME choice (agentic-workflow-017)

   The dashboard consumes the styleguide's "dark-first with a light toggle"
   theme switch UNFORKED (ADR-0003): the `Segmented` Dark/Light control, the
   `data-theme` documentElement mechanism, the `theme-fade` transition, and the
   light-mode tokens all live in the design-system styleguide. This module is the
   dashboard-side state behind that control — WHICH theme is in effect, and how it
   is remembered.

   It is a SIBLING of the board's per-column view-state store
   (board-view-state.js, aw-014 / ADR-0015) and deliberately mirrors its shape: a
   single versioned localStorage key with safe degradation. A malformed /
   stale-version / absent blob must NEVER blank or break the dashboard — it
   degrades to the SYSTEM default (the OS `prefers-color-scheme`). On first visit,
   with no stored override, the system preference wins; once the user toggles,
   that override is remembered across reloads. Theme gets its OWN small key rather
   than sharing the board view-state envelope: it is a global page concern, not a
   per-column lens, and the two evolve independently.

   Like its sibling, this is presentation view-state ONLY — it never records
   lifecycle truth, so it survives every SSE re-projection of /api/tree untouched.
   The store is pure over INJECTED backends (a storage stub + a matchMedia stub),
   framework-free, and never throws. Unit-tested under `node --test` with no DOM.
   ============================================================ */

// The one localStorage key the dashboard theme choice lives under. Its own key,
// distinct from the board's `agentheim.board.viewState` (a sibling concern).
export const THEME_KEY = 'agentheim.dashboard.theme';

// Bump when the persisted shape changes incompatibly: a blob written by a
// different version is ignored on load (treated as "no stored override"), so an
// old preference can never feed a shape this version does not understand.
export const THEME_VERSION = 1;

// The only valid themes. Matches the styleguide `Segmented` options + the
// `[data-theme]` token sets in colors_and_type.css.
export const THEMES = new Set(['dark', 'light']);

/**
 * The system's preferred theme, read from `prefers-color-scheme`.
 * @param {((q: string) => { matches: boolean }) | null | undefined} matchMedia
 *   the platform `window.matchMedia` (or a stub). When absent (SSR / old env),
 *   falls back to the dark-first default.
 * @returns {'dark' | 'light'}
 */
export function systemTheme(matchMedia) {
  if (typeof matchMedia !== 'function') return 'dark'; // dark-first default.
  try {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark'; // a throwing matchMedia must never break first paint.
  }
}

/**
 * Read the persisted theme OVERRIDE from the injected storage.
 * @param {{ getItem: (k: string) => (string|null) } | null | undefined} storage
 * @returns {'dark' | 'light' | null} the stored choice, or `null` when there is
 *   no backend, no stored blob, a stale version, malformed JSON, or an unknown
 *   theme value. `null` means "defer to the system preference". Never throws.
 */
export function loadTheme(storage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  let raw;
  try {
    raw = storage.getItem(THEME_KEY);
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
  if (parsed.version !== THEME_VERSION) return null; // a different shape — ignore.
  if (!THEMES.has(parsed.theme)) return null; // unknown value — ignore.
  return parsed.theme;
}

/**
 * Persist the chosen theme under the versioned envelope.
 * @param {{ setItem: (k: string, v: string) => void } | null | undefined} storage
 * @param {string} theme — must be a known theme; an unknown value is refused
 *   (no garbage is ever written).
 *
 * A no-op when there is no backend (SSR / no DOM) or the theme is unknown. Storage
 * write failures (quota, disabled) are swallowed — a failed PREFERENCE write must
 * never surface as a dashboard error. Never throws.
 */
export function saveTheme(storage, theme) {
  if (!storage || typeof storage.setItem !== 'function') return;
  if (!THEMES.has(theme)) return;
  try {
    storage.setItem(THEME_KEY, JSON.stringify({ version: THEME_VERSION, theme }));
  } catch {
    /* preference persistence is best-effort; never throw. */
  }
}

/**
 * The single first-paint decision: resolve the theme that should be in effect.
 * A valid stored override beats the system preference; with no valid override
 * (first visit, or a degraded blob) the system preference wins.
 * @param {{ getItem: (k: string) => (string|null) } | null | undefined} storage
 * @param {((q: string) => { matches: boolean }) | null | undefined} matchMedia
 * @returns {'dark' | 'light'}
 */
export function resolveTheme(storage, matchMedia) {
  return loadTheme(storage) || systemTheme(matchMedia);
}
