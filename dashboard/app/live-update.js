/* ============================================================
   Agentheim — dashboard SSE live-update consumer (agentic-workflow-009)

   Subscribes to GET /api/events (the SSE transport, infrastructure-003 /
   ADR-0006) and turns every server push into a single instruction: RE-SYNC.

   The discipline (ADR-0001): disk is the source of truth, the board is a
   projection rebuilt from it. So this consumer NEVER interprets a raw
   `tree-changed` frame as a Task transition — it simply calls onResync, the
   board's cue to re-fetch /api/tree and re-project. Re-fetching is idempotent,
   so a burst of frames (or the echo of the board's own Promote) collapses into
   re-fetches with no double-apply.

   It also re-syncs on (re)connect (the `hello` frame the transport opens with),
   so a reconnect after a dropped connection catches up on anything that changed
   while disconnected. EventSource auto-reconnects natively; for environments /
   tests with a non-reconnecting source double, an optional reconnectMs rebuilds
   the source via the factory.

   This module is framework-free (no react import) so createLiveUpdate is
   unit-testable under `node --test` with a fake source — matching the dashboard's
   pure-logic-in-a-data-module convention. The React board (board.js) wires it to
   a real EventSource + a /api/tree re-fetch.
   ============================================================ */

export const EVENTS_URL = "/api/events";

/**
 * Wire an EventSource-like stream to a re-sync callback.
 *
 * @param {object} opts
 * @param {(evt: object|null) => void} opts.onResync  Called on every connect and
 *        every tree-changed frame. The argument is the parsed pointer (or null on
 *        connect) — orientation only; the consumer never interprets it.
 * @param {() => { addEventListener, close }} [opts.sourceFactory]  Builds the
 *        underlying source (defaults to a real EventSource on EVENTS_URL).
 * @param {number} [opts.reconnectMs]  If a number, manually rebuild the source
 *        this many ms after an `error` (for non-auto-reconnecting sources). Omit
 *        to rely on EventSource's native auto-reconnect.
 * @returns {{ close: () => void }}
 */
export function createLiveUpdate({ onResync, sourceFactory, reconnectMs } = {}) {
  const factory = sourceFactory ?? (() => new EventSource(EVENTS_URL));
  let closed = false;
  let source = null;
  let reconnectTimer = null;

  const resync = (raw) => {
    if (closed) return;
    let parsed = null;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
    } else if (raw && typeof raw === "object") {
      parsed = raw;
    }
    if (typeof onResync === "function") onResync(parsed);
  };

  function connect() {
    if (closed) return;
    source = factory();

    // `hello` opens the stream (and re-fires after a native reconnect): re-sync
    // so we catch up on anything missed while disconnected.
    source.addEventListener("hello", () => resync(null));

    // `tree-changed`: the project's tree mutated. Re-fetch — never interpret.
    source.addEventListener("tree-changed", (e) => resync(e && e.data));

    // On error, EventSource reconnects on its own (re-firing `hello`). For a
    // non-auto-reconnecting source (tests), optionally rebuild after reconnectMs.
    source.addEventListener("error", () => {
      if (closed) return;
      if (typeof reconnectMs === "number") {
        try { source.close(); } catch { /* already closed */ }
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, reconnectMs);
      }
    });
  }

  connect();

  return {
    close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { source && source.close(); } catch { /* already closed */ }
    },
  };
}
