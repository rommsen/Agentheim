/* ============================================================
   Agentheim — dashboard bridge-launch decision logic (agentic-workflow-020)

   The PURE, framework-free core behind the backlog's "Quick Capture" / "Modeling"
   launch buttons. Each button wants to open a REAL, interactive Claude session
   seeded with its `/agentheim:...` command. The only path to a visible terminal
   from the sandboxed VS Code Simple Browser is the VS Code bridge extension
   (ADR-0018): a 127.0.0.1 HTTP listener the frontend reaches over `fetch`.

   This module is the launch-vs-fallback decision, expressed as a pure function of
   an injected `fetch` and an injected `copy` (clipboard writer), so it is fully
   unit-testable under `node --test` — no React, no DOM, no real network. The React
   shell in board.js is thin glue that supplies window.fetch + the aw-016
   copyToClipboard and renders the buttons.

   The ADR-0018 discovery + launch contract, consumed here EXACTLY:
     1. Discover: `GET /api/bridge` (on the dashboard's OWN origin — the one thing
        the sandboxed frame can reach) → `{ port, token, v }` when the extension is
        live, or `{ present: false }` when absent. Port/token are NEVER hardcoded.
     2. Probe liveness: a token-bearing `GET /health` against `127.0.0.1:<port>`
        with a ~800 ms timeout (a stale bridge.json from a dead host carries a
        token no live listener accepts, so the probe is what stops a false positive).
     3. Launch: `POST /run { prompt }` to `127.0.0.1:<port>` with the
        `X-Agentheim-Bridge-Token` header. The extension wraps the prompt as
        `claude "<prompt>"` and opens the terminal.

   THE ABSENCE CONTRACT (the spine of the task): EVERY failure mode — present:false,
   timeout, connection-refused, non-200, CORS rejection, not-in-Simple-Browser, any
   thrown exception, even no `fetch` at all — collapses SILENTLY to the clipboard
   fallback. This module never throws and never rejects. Absence is a normal mode,
   not an error; the board surfaces no toast, no console crash, no broken button.

   The board is a projection of disk (ADR-0001): launching a session is an EXTERNAL
   side-effect (exactly like the aw-016 clipboard copy), not a lifecycle write.
   ============================================================ */

// The contract header every bridge request carries (ADR-0018). The listener
// rejects any request lacking or mismatching the per-activation token.
export const BRIDGE_TOKEN_HEADER = 'X-Agentheim-Bridge-Token';

// The dashboard-origin discovery endpoint (infrastructure-014). Same-origin, so
// the sandboxed frame can reach it; it carries the on-disk bridge contract out.
const DISCOVERY_URL = '/api/bridge';

// ADR-0018's liveness-probe budget. A bridge that does not answer /health within
// this window is treated as absent and we fall back to clipboard.
const DEFAULT_HEALTH_TIMEOUT_MS = 800;

/**
 * `fetch` with a bounded timeout, via AbortController when available. Returns the
 * Response, or throws (timeout/abort/network) — the caller treats any throw as
 * "bridge unavailable". A missing AbortController (exotic runtime) just races a
 * timer reject against the fetch, so the timeout still bounds the wait.
 */
function fetchWithTimeout(fetchImpl, url, opts, timeoutMs) {
  const AC = typeof AbortController !== "undefined" ? AbortController : null;
  if (AC) {
    const ctrl = new AC();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    return Promise.resolve(fetchImpl(url, { ...opts, signal: ctrl.signal }))
      .finally(() => clearTimeout(timer));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("bridge probe timeout")), timeoutMs);
    Promise.resolve(fetchImpl(url, opts)).then(
      (r) => { clearTimeout(timer); resolve(r); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Discover the live bridge via the dashboard-origin `GET /api/bridge`.
 * @returns {Promise<{port:number, token:string}|null>} the advertised port+token,
 *   or null for ANY absence/failure (present:false, missing fields, non-200, throw).
 *   Never throws.
 */
async function discoverBridge(fetchImpl) {
  try {
    const res = await fetchImpl(DISCOVERY_URL, { headers: { Accept: "application/json" } });
    if (!res || !res.ok) return null;
    const body = await res.json();
    if (!body || body.present === false) return null;
    const { port, token } = body;
    if (typeof port !== "number" || !port || typeof token !== "string" || !token) return null;
    return { port, token };
  } catch {
    // present:false is normal; so is "not in Simple Browser" (fetch throws). Quiet.
    return null;
  }
}

/**
 * Confirm a live listener with a token-bearing `GET /health` (≈800 ms timeout).
 * A stale bridge.json (dead host) advertises a port whose token no live listener
 * accepts, so a non-200 / refusal / timeout here correctly reads as "no bridge".
 * @returns {Promise<boolean>} Never throws.
 */
async function probeHealth(fetchImpl, { port, token }, timeoutMs) {
  try {
    const res = await fetchWithTimeout(
      fetchImpl,
      `http://127.0.0.1:${port}/health`,
      { method: "GET", headers: { [BRIDGE_TOKEN_HEADER]: token } },
      timeoutMs,
    );
    return !!(res && res.ok);
  } catch {
    return false;
  }
}

/**
 * Launch the seeded session via `POST /run { prompt }` (token header). The custom
 * header makes this a CORS-preflighted request — the extension answers the
 * preflight (ADR-0018); a CORS rejection here just throws and we fall back.
 * @returns {Promise<boolean>} Never throws.
 */
async function runOnBridge(fetchImpl, { port, token, prompt }) {
  try {
    const res = await fetchImpl(`http://127.0.0.1:${port}/run`, {
      method: "POST",
      headers: {
        [BRIDGE_TOKEN_HEADER]: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });
    return !!(res && res.ok);
  } catch {
    return false;
  }
}

/**
 * Launch `prompt` through the bridge, or fall back to copying it to the clipboard.
 *
 * Try, in order: discover the bridge (`GET /api/bridge`) → confirm it is live
 * (token-bearing `GET /health`, bounded) → seed the session (`POST /run`). The
 * FIRST failure at any step collapses SILENTLY to the clipboard fallback — every
 * failure mode is normal, none is surfaced. This function NEVER throws or rejects.
 *
 * @param {object} args
 * @param {string} args.prompt — the exact command string (e.g. `/agentheim:modeling`),
 *   produced by the pure modeling-command.js module. Both the launched POST body
 *   and the copied clipboard text are this same string — one source of truth.
 * @param {(url:string, opts?:object)=>Promise<Response>} [args.fetchImpl] — injected
 *   `fetch`. Absent/undefined → straight to clipboard (no origin to reach).
 * @param {(text:string)=>Promise<boolean>} args.copy — injected no-throw clipboard
 *   writer (board.js supplies aw-016's copyToClipboard). Resolves to whether the
 *   write landed; a false just means no "copied" feedback flashes.
 * @param {number} [args.healthTimeoutMs] — liveness-probe budget (default ~800 ms).
 * @returns {Promise<{via:'bridge'}|{via:'clipboard', copied:boolean}>} which path
 *   handled it; for the clipboard path, whether the copy itself landed.
 */
export async function launchOrCopy({ prompt, fetchImpl, copy, healthTimeoutMs = DEFAULT_HEALTH_TIMEOUT_MS }) {
  // Try the bridge only when we actually have a fetch to reach it with.
  if (typeof fetchImpl === "function") {
    const bridge = await discoverBridge(fetchImpl);
    if (bridge) {
      const live = await probeHealth(fetchImpl, bridge, healthTimeoutMs);
      if (live) {
        const launched = await runOnBridge(fetchImpl, { ...bridge, prompt });
        if (launched) return { via: "bridge" };
      }
    }
  }

  // Fallback: copy the command to the clipboard (aw-016 behavior). The copy is
  // itself no-throw; a false result just means no "copied" feedback should flash.
  let copied = false;
  try {
    copied = await copy(prompt);
  } catch {
    copied = false;
  }
  return { via: "clipboard", copied: !!copied };
}
