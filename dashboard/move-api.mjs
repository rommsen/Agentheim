// Dashboard write endpoint POST /api/task/move (agentic-workflow-009, ADR-0001).
//
// THE ONLY write path in the dashboard runtime, and it is pure TRANSPORT: it
// parses the JSON body, delegates to the ONE shared lifecycle mover
// (lib/task-lifecycle.applyTaskMove — the same operation the skills call), and
// translates the mover's structured result into HTTP. It NEVER moves a file
// itself and NEVER decides what a legal move is — that authority lives entirely
// in applyTaskMove, so the UI and the skills can never drift (ADR-0001 §2).
//
// The mover is consulted with policy 'ui' (Promote-only: backlog→todo). Every
// other transition is rejected there with a structured domain reason, which we
// surface verbatim. The optimistic precondition (`from` folder + optional
// mtime) is honored by the mover (ADR-0001 §3): a stale view rejects WITHOUT
// mutating anything, mapped here to 409 so the board re-fetches /api/tree.

import { applyTaskMove } from '../lib/task-lifecycle.mjs';

const MAX_BODY_BYTES = 64 * 1024; // a move request is tiny; cap defensively.

/**
 * Map a mover rejection `code` to an HTTP status.
 * - stale-precondition  → 409 Conflict (already moved / mtime drift): the UI
 *   re-fetches the board.
 * - not-found           → 404.
 * - illegal-move        → 422 (well-formed request, semantically refused).
 * - blocked-dependency  → 409 (a real conflict with the dependency graph).
 * Anything unrecognized falls back to 422.
 */
function statusForCode(code) {
  switch (code) {
    case 'stale-precondition':
      return 409;
    case 'not-found':
      return 404;
    case 'blocked-dependency':
      return 409;
    case 'illegal-move':
      return 422;
    default:
      return 422;
  }
}

/** Read and JSON-parse the request body, with a size cap. Resolves to an object. */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large'), { httpStatus: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        reject(Object.assign(new Error('Body is not valid JSON'), { httpStatus: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

/**
 * Handle POST /api/task/move.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} root  Absolute project root (the `.agentheim/` holder).
 */
export async function handleMove(req, res, root) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, err.httpStatus ?? 400, { ok: false, code: 'bad-request', reason: err.message });
    return;
  }

  const { id, from, to } = body || {};
  if (typeof id !== 'string' || !id || typeof from !== 'string' || typeof to !== 'string') {
    sendJson(res, 400, {
      ok: false,
      code: 'bad-request',
      reason: 'A move requires string fields { id, from, to }.',
    });
    return;
  }

  // Optimistic mtime precondition (ADR-0001 §3) — optional. Forwarded as-is; the
  // mover compares it against the file's current mtime and rejects on drift.
  const expectedMtimeMs =
    typeof body.expectedMtimeMs === 'number' ? body.expectedMtimeMs : undefined;

  let result;
  try {
    // policy 'ui' = Promote-only. We do NOT widen this — the dashboard's only
    // legal move is backlog→todo (ADR-0001 §1).
    result = applyTaskMove(root, id, from, to, { policy: 'ui', expectedMtimeMs });
  } catch (err) {
    sendJson(res, 500, { ok: false, code: 'internal', reason: err.message });
    return;
  }

  if (result.ok) {
    sendJson(res, 200, result);
    return;
  }
  sendJson(res, statusForCode(result.code), result);
}
