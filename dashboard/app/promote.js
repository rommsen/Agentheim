/* ============================================================
   Agentheim — dashboard Promote write logic (agentic-workflow-009)

   The drag-to-Promote core, framework-free so it is unit-testable
   under `node --test` without a DOM and so the React board (board.js)
   stays a thin shell. Two responsibilities, both bound by ADR-0001:

   1. isLegalDrop(from, to) — the v1 legal UI move set is EXACTLY ONE:
      Promote = backlog→todo. Every other transition is a non-drop
      target. The board uses this to decide which columns accept a drop.

   2. postMove(move) — POSTs the optimistic { id, from, to[, mtime] }
      precondition to /api/task/move (the ONE write path) and returns
      the server's structured result. It is NOT a writer of lifecycle
      state — the server's applyTaskMove is the sole writer; this is a
      transport client. It refuses an illegal drop locally so no junk
      reaches the network, but the server still independently refuses
      (no UI-only writer can exist).
   ============================================================ */

/** The single legal UI move (ADR-0001 §1): Promote. */
export const LEGAL_UI_MOVE = { from: 'backlog', to: 'todo' };

/**
 * Is dragging a card from column `from` to column `to` a legal UI move?
 * v1: Promote (backlog→todo) only. Everything else is a non-drop target.
 */
export function isLegalDrop(from, to) {
  return from === LEGAL_UI_MOVE.from && to === LEGAL_UI_MOVE.to;
}

/**
 * POST a Promote to /api/task/move and return a normalized outcome.
 *
 * @param {{id:string, from:string, to:string, expectedMtimeMs?:number}} move
 * @param {{ fetchImpl?: typeof fetch, url?: string }} [deps]
 * @returns {Promise<{ok:boolean, status:number, code?:string, reason?:string, state?:object}>}
 *
 * A rejected (4xx) move resolves (it does NOT throw) carrying the domain `reason`
 * and `code`, so the board can surface the reason and re-fetch /api/tree. An
 * illegal drop is refused locally without touching the network.
 */
export async function postMove(move, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  const url = deps.url ?? '/api/task/move';
  const { id, from, to, expectedMtimeMs } = move || {};

  if (!isLegalDrop(from, to)) {
    return {
      ok: false,
      status: 0,
      code: 'illegal-move',
      reason: `${from}->${to} is not a legal UI move; the only UI move is Promote (backlog->todo).`,
    };
  }

  const body = { id, from, to };
  if (typeof expectedMtimeMs === 'number') body.expectedMtimeMs = expectedMtimeMs;

  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, status: 0, code: 'network', reason: String(err && err.message ? err.message : err) };
  }

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  return {
    ok: res.ok && payload.ok !== false,
    status: res.status,
    code: payload.code,
    reason: payload.reason,
    state: payload.state,
  };
}
