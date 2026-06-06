// Tests for the frontend Promote logic (agentic-workflow-009, ADR-0001).
//
// The drag-to-Promote write path has a small, load-bearing, framework-free core
// kept out of the React board so it is unit-testable under `node --test` without
// a DOM: WHICH drop is legal (Promote-only: backlog→todo) and HOW a move request
// is posted + its structured result interpreted. The board (board.js) is a thin
// shell that calls these; the rules live here AND, authoritatively, in the
// server's applyTaskMove — the frontend predicate is a courtesy that disables
// non-drop targets, never a second source of truth (the server still refuses).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LEGAL_UI_MOVE, isLegalDrop, postMove } from '../app/promote.js';

test('the only legal UI drop is Promote (backlog→todo)', () => {
  assert.deepEqual(LEGAL_UI_MOVE, { from: 'backlog', to: 'todo' });
  assert.equal(isLegalDrop('backlog', 'todo'), true);
});

test('every non-Promote transition is a non-drop target', () => {
  // forward skips / claims / completes
  assert.equal(isLegalDrop('todo', 'doing'), false);
  assert.equal(isLegalDrop('doing', 'done'), false);
  assert.equal(isLegalDrop('backlog', 'doing'), false);
  assert.equal(isLegalDrop('backlog', 'done'), false);
  // backward moves
  assert.equal(isLegalDrop('todo', 'backlog'), false);
  assert.equal(isLegalDrop('doing', 'todo'), false);
  // no-op / same column
  assert.equal(isLegalDrop('backlog', 'backlog'), false);
  assert.equal(isLegalDrop('todo', 'todo'), false);
  // junk
  assert.equal(isLegalDrop(undefined, 'todo'), false);
  assert.equal(isLegalDrop('backlog', null), false);
});

test('postMove POSTs the optimistic { id, from, to } precondition to /api/task/move', async () => {
  let captured = null;
  const fakeFetch = async (url, opts) => {
    captured = { url, opts };
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, state: { id: 'alpha-001', to: 'todo' } }),
    };
  };
  const res = await postMove(
    { id: 'alpha-001', from: 'backlog', to: 'todo', expectedMtimeMs: 123 },
    { fetchImpl: fakeFetch },
  );
  assert.equal(captured.url, '/api/task/move');
  assert.equal(captured.opts.method, 'POST');
  const body = JSON.parse(captured.opts.body);
  assert.deepEqual(body, { id: 'alpha-001', from: 'backlog', to: 'todo', expectedMtimeMs: 123 });
  assert.equal(res.ok, true);
});

test('postMove surfaces the domain reason on a rejected (4xx) move so the board can show it + refetch', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 409,
    json: async () => ({ ok: false, code: 'stale-precondition', reason: 'already moved' }),
  });
  const res = await postMove({ id: 'alpha-001', from: 'backlog', to: 'todo' }, { fetchImpl: fakeFetch });
  assert.equal(res.ok, false);
  assert.equal(res.status, 409);
  assert.equal(res.code, 'stale-precondition');
  assert.equal(res.reason, 'already moved');
});

test('postMove refuses to send an illegal drop without touching the network (no UI-only writer)', async () => {
  let called = false;
  const fakeFetch = async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; };
  const res = await postMove({ id: 'alpha-001', from: 'todo', to: 'doing' }, { fetchImpl: fakeFetch });
  assert.equal(called, false, 'an illegal drop must not reach the server');
  assert.equal(res.ok, false);
  assert.equal(res.code, 'illegal-move');
});
