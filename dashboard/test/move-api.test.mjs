// Tests for the dashboard write endpoint POST /api/task/move (agentic-workflow-009).
//
// The endpoint is TRANSPORT ONLY: it parses the request body, delegates to the
// ONE shared lifecycle mover (lib/task-lifecycle.applyTaskMove), and translates
// the mover's structured result into HTTP. It NEVER moves a file itself, and it
// NEVER permits a transition the mover would reject. These tests assert the
// transport contract (status-code mapping + the optimistic precondition) over a
// real on-disk project, while the move RULES themselves are covered by the
// mover's own suite (lib/test/task-lifecycle.test.mjs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createDashboardServer } from '../server.mjs';

function makeProject() {
  const base = mkdtempSync(path.join(tmpdir(), 'aw009-move-'));
  const bc = path.join(base, '.agentheim', 'contexts', 'alpha');
  for (const f of ['backlog', 'todo', 'doing', 'done']) {
    mkdirSync(path.join(bc, f), { recursive: true });
  }
  writeFileSync(
    path.join(bc, 'backlog', 'alpha-001-thing.md'),
    '---\nid: alpha-001\ntitle: Thing\nstatus: backlog\ntype: feature\ncontext: alpha\ndepends_on: []\n---\n\nbody'
  );
  return { base, bc };
}

async function start(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

async function postMove(port, body) {
  return fetch(`http://127.0.0.1:${port}/api/task/move`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('POST /api/task/move promotes backlog→todo via applyTaskMove (file actually moves + status rewritten)', async () => {
  const { base, bc } = makeProject();
  const server = createDashboardServer({ root: base });
  try {
    const port = await start(server);
    const res = await postMove(port, { id: 'alpha-001', from: 'backlog', to: 'todo' });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.state.to, 'todo');
    // The file moved on disk and its status was rewritten — the endpoint did not
    // do this itself; applyTaskMove did. We assert the visible result.
    assert.equal(existsSync(path.join(bc, 'backlog', 'alpha-001-thing.md')), false);
    const movedPath = path.join(bc, 'todo', 'alpha-001-thing.md');
    assert.equal(existsSync(movedPath), true);
    assert.match(readFileSync(movedPath, 'utf8'), /^status: todo$/m);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('POST /api/task/move rejects a non-Promote transition with 4xx and the domain reason, moving nothing', async () => {
  const { base, bc } = makeProject();
  const server = createDashboardServer({ root: base });
  try {
    const port = await start(server);
    // todo→doing (Claim) is NOT a legal UI move (ADR-0001) — must be refused.
    const res = await postMove(port, { id: 'alpha-001', from: 'backlog', to: 'doing' });
    assert.ok(res.status >= 400 && res.status < 500, `expected 4xx, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.ok(typeof json.reason === 'string' && json.reason.length > 0, 'carries a domain reason');
    // Nothing moved.
    assert.equal(existsSync(path.join(bc, 'backlog', 'alpha-001-thing.md')), true);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('POST /api/task/move returns 409 when the from precondition is stale (task already moved)', async () => {
  const { base, bc } = makeProject();
  const server = createDashboardServer({ root: base });
  try {
    const port = await start(server);
    // First promote succeeds.
    await postMove(port, { id: 'alpha-001', from: 'backlog', to: 'todo' });
    // A second promote that still believes the card is in backlog is stale.
    const res = await postMove(port, { id: 'alpha-001', from: 'backlog', to: 'todo' });
    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.code, 'stale-precondition');
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('POST /api/task/move returns 409 when the mtime precondition fails', async () => {
  const { base, bc } = makeProject();
  const server = createDashboardServer({ root: base });
  try {
    const port = await start(server);
    const res = await postMove(port, {
      id: 'alpha-001', from: 'backlog', to: 'todo',
      expectedMtimeMs: 1, // a value that cannot match the real file's mtime
    });
    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.code, 'stale-precondition');
    // Nothing moved on a failed precondition.
    assert.equal(existsSync(path.join(bc, 'backlog', 'alpha-001-thing.md')), true);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('POST /api/task/move 404s when the task does not exist anywhere', async () => {
  const { base } = makeProject();
  const server = createDashboardServer({ root: base });
  try {
    const port = await start(server);
    const res = await postMove(port, { id: 'alpha-999', from: 'backlog', to: 'todo' });
    assert.equal(res.status, 404);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('POST /api/task/move 400s on a malformed body or missing fields', async () => {
  const { base } = makeProject();
  const server = createDashboardServer({ root: base });
  try {
    const port = await start(server);
    const bad = await fetch(`http://127.0.0.1:${port}/api/task/move`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    assert.equal(bad.status, 400);
    const missing = await postMove(port, { from: 'backlog', to: 'todo' }); // no id
    assert.equal(missing.status, 400);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('a blocked Promote (unmet depends_on) is refused with the domain reason and moves nothing', async () => {
  const { base, bc } = makeProject();
  // Rewrite the task to depend on something not yet done.
  writeFileSync(
    path.join(bc, 'backlog', 'alpha-001-thing.md'),
    '---\nid: alpha-001\ntitle: Thing\nstatus: backlog\ntype: feature\ncontext: alpha\ndepends_on: [alpha-000]\n---\n\nbody'
  );
  const server = createDashboardServer({ root: base });
  try {
    const port = await start(server);
    const res = await postMove(port, { id: 'alpha-001', from: 'backlog', to: 'todo' });
    assert.ok(res.status >= 400 && res.status < 500, `expected 4xx, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.code, 'blocked-dependency');
    assert.equal(existsSync(path.join(bc, 'backlog', 'alpha-001-thing.md')), true);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('GET /api/task/move is not allowed (405) — the write path is POST only', async () => {
  const { base } = makeProject();
  const server = createDashboardServer({ root: base });
  try {
    const port = await start(server);
    const res = await fetch(`http://127.0.0.1:${port}/api/task/move`);
    assert.equal(res.status, 405);
  } finally {
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
});
