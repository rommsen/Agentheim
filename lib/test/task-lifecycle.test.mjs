import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { applyTaskMove, LIFECYCLE_FOLDERS } from '../task-lifecycle.mjs';

const BC = 'agentic-workflow';
const FOLDERS = ['backlog', 'todo', 'doing', 'done'];

/**
 * Build a throwaway project: <root>/.agentheim/contexts/<bc>/<folder>/ for each
 * lifecycle folder, with a single task file in `startFolder`.
 */
function makeProject({ id, status, dependsOn = [], startFolder, body = '## Why\n\nstuff\n' } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'aw003-'));
  const bcDir = path.join(root, '.agentheim', 'contexts', BC);
  for (const f of FOLDERS) mkdirSync(path.join(bcDir, f), { recursive: true });
  const depsLine = `depends_on: [${dependsOn.join(', ')}]`;
  const file = path.join(bcDir, startFolder, `${id}.md`);
  const content = `---
id: ${id}
title: A task
status: ${status}
type: feature
context: ${BC}
created: 2026-06-06
completed:
commit:
${depsLine}
blocks: []
tags: []
---

${body}`;
  writeFileSync(file, content);
  return { root, bcDir, file };
}

function fileIn(bcDir, folder, id) {
  return path.join(bcDir, folder, `${id}.md`);
}

function cleanup(root) {
  rmSync(root, { recursive: true, force: true });
}

test('LIFECYCLE_FOLDERS lists the four lifecycle folders in order', () => {
  assert.deepEqual(LIFECYCLE_FOLDERS, FOLDERS);
});

test('legal backlog→todo promote moves the file and rewrites status together', () => {
  const id = 'agentic-workflow-100';
  const { root, bcDir } = makeProject({ id, status: 'backlog', startFolder: 'backlog' });
  try {
    const res = applyTaskMove(root, id, 'backlog', 'todo', { context: BC });
    assert.equal(res.ok, true);
    assert.equal(res.state.from, 'backlog');
    assert.equal(res.state.to, 'todo');
    assert.equal(res.state.status, 'todo');

    // file gone from backlog, present in todo
    assert.equal(existsSync(fileIn(bcDir, 'backlog', id)), false);
    assert.equal(existsSync(fileIn(bcDir, 'todo', id)), true);

    // frontmatter status rewritten to match the new folder
    const moved = readFileSync(fileIn(bcDir, 'todo', id), 'utf8');
    assert.match(moved, /^status: todo$/m);
    assert.doesNotMatch(moved, /^status: backlog$/m);
  } finally {
    cleanup(root);
  }
});

test('illegal doing→done move is rejected with a structured domain reason and no filesystem change', () => {
  const id = 'agentic-workflow-101';
  const { root, bcDir } = makeProject({ id, status: 'doing', startFolder: 'doing' });
  try {
    const res = applyTaskMove(root, id, 'doing', 'done', { context: BC });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'illegal-move');
    assert.equal(typeof res.reason, 'string');
    assert.ok(res.reason.length > 0);

    // nothing moved, status untouched
    assert.equal(existsSync(fileIn(bcDir, 'doing', id)), true);
    assert.equal(existsSync(fileIn(bcDir, 'done', id)), false);
    const still = readFileSync(fileIn(bcDir, 'doing', id), 'utf8');
    assert.match(still, /^status: doing$/m);
  } finally {
    cleanup(root);
  }
});

test('promote blocked by an unmet depends_on (frontend gate) is rejected with no filesystem change', () => {
  const id = 'agentic-workflow-102';
  const dep = 'design-system-001-styleguide';
  const { root, bcDir } = makeProject({
    id,
    status: 'backlog',
    startFolder: 'backlog',
    dependsOn: [dep],
  });
  try {
    // dep is NOT in done/ anywhere → promote must be blocked
    const res = applyTaskMove(root, id, 'backlog', 'todo', { context: BC });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'blocked-dependency');
    assert.match(res.reason, /depends_on|dependency|styleguide|design-system-001-styleguide/i);

    // unchanged on disk
    assert.equal(existsSync(fileIn(bcDir, 'backlog', id)), true);
    assert.equal(existsSync(fileIn(bcDir, 'todo', id)), false);
  } finally {
    cleanup(root);
  }
});

test('promote allowed once the depends_on is satisfied (dependency present in done/)', () => {
  const id = 'agentic-workflow-103';
  const dep = 'design-system-001-styleguide';
  const { root, bcDir } = makeProject({
    id,
    status: 'backlog',
    startFolder: 'backlog',
    dependsOn: [dep],
  });
  try {
    // satisfy the dependency by placing it in another BC's done/ folder
    const depDoneDir = path.join(root, '.agentheim', 'contexts', 'design-system', 'done');
    mkdirSync(depDoneDir, { recursive: true });
    writeFileSync(path.join(depDoneDir, `${dep}.md`), '---\nid: design-system-001-styleguide\nstatus: done\n---\n');

    const res = applyTaskMove(root, id, 'backlog', 'todo', { context: BC });
    assert.equal(res.ok, true);
    assert.equal(existsSync(fileIn(bcDir, 'todo', id)), true);
  } finally {
    cleanup(root);
  }
});

test('stale precondition: expected `from` disagrees with disk → reject, no filesystem change', () => {
  const id = 'agentic-workflow-104';
  // file actually lives in todo, but caller believes it is still in backlog
  const { root, bcDir } = makeProject({ id, status: 'todo', startFolder: 'todo' });
  try {
    const res = applyTaskMove(root, id, 'backlog', 'todo', { context: BC });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'stale-precondition');
    assert.match(res.reason, /already moved|not in|precondition|backlog/i);

    // disk untouched: file is still exactly where it was
    assert.equal(existsSync(fileIn(bcDir, 'todo', id)), true);
    assert.equal(existsSync(fileIn(bcDir, 'backlog', id)), false);
  } finally {
    cleanup(root);
  }
});

test('stale precondition: mtime disagrees with the expected mtime → reject, no filesystem change', () => {
  const id = 'agentic-workflow-105';
  const { root, bcDir } = makeProject({ id, status: 'backlog', startFolder: 'backlog' });
  try {
    const res = applyTaskMove(root, id, 'backlog', 'todo', {
      context: BC,
      expectedMtimeMs: 1, // deliberately wrong
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'stale-precondition');
    assert.match(res.reason, /mtime|already moved|changed|modified/i);

    assert.equal(existsSync(fileIn(bcDir, 'backlog', id)), true);
    assert.equal(existsSync(fileIn(bcDir, 'todo', id)), false);
  } finally {
    cleanup(root);
  }
});

test('matching mtime precondition is honored and the promote succeeds', () => {
  const id = 'agentic-workflow-106';
  const { root, bcDir } = makeProject({ id, status: 'backlog', startFolder: 'backlog' });
  try {
    const mtimeMs = statSync(fileIn(bcDir, 'backlog', id)).mtimeMs;
    const res = applyTaskMove(root, id, 'backlog', 'todo', {
      context: BC,
      expectedMtimeMs: mtimeMs,
    });
    assert.equal(res.ok, true);
    assert.equal(existsSync(fileIn(bcDir, 'todo', id)), true);
  } finally {
    cleanup(root);
  }
});

test('missing task file is rejected, not thrown', () => {
  const id = 'agentic-workflow-107';
  const { root } = makeProject({ id, status: 'backlog', startFolder: 'backlog' });
  try {
    const res = applyTaskMove(root, 'agentic-workflow-999', 'backlog', 'todo', { context: BC });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'not-found');
  } finally {
    cleanup(root);
  }
});

test('resolves a slugged task file (<id>-<slug>.md) from its bare id and preserves the filename across the move', () => {
  // Real task files are named <id>-<slug>.md while the id is the bare <id>. The
  // mover must map id → file and keep the slug when it moves the file.
  const id = 'agentic-workflow-110';
  const root = mkdtempSync(path.join(tmpdir(), 'aw003-slug-'));
  const bcDir = path.join(root, '.agentheim', 'contexts', BC);
  for (const f of FOLDERS) mkdirSync(path.join(bcDir, f), { recursive: true });
  const fileName = `${id}-a-descriptive-slug.md`;
  writeFileSync(
    path.join(bcDir, 'backlog', fileName),
    `---\nid: ${id}\nstatus: backlog\ncontext: ${BC}\ndepends_on: []\n---\nbody`
  );
  try {
    const res = applyTaskMove(root, id, 'backlog', 'todo', { context: BC });
    assert.equal(res.ok, true);
    // The slugged filename rode along — only the folder changed.
    assert.equal(existsSync(path.join(bcDir, 'backlog', fileName)), false);
    assert.equal(existsSync(path.join(bcDir, 'todo', fileName)), true);
    assert.match(readFileSync(path.join(bcDir, 'todo', fileName), 'utf8'), /^status: todo$/m);
  } finally {
    cleanup(root);
  }
});

test('a bare id does not collide with a longer-numbered sibling (alpha-001 vs alpha-0010)', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'aw003-collide-'));
  const bcDir = path.join(root, '.agentheim', 'contexts', BC);
  for (const f of FOLDERS) mkdirSync(path.join(bcDir, f), { recursive: true });
  // Only the longer-numbered sibling exists; resolving the bare id must NOT find it.
  writeFileSync(
    path.join(bcDir, 'backlog', `${BC}-1110-other.md`),
    `---\nid: ${BC}-1110\nstatus: backlog\ncontext: ${BC}\ndepends_on: []\n---\nbody`
  );
  try {
    const res = applyTaskMove(root, `${BC}-111`, 'backlog', 'todo', { context: BC });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'not-found');
    // The sibling was untouched.
    assert.equal(existsSync(path.join(bcDir, 'backlog', `${BC}-1110-other.md`)), true);
  } finally {
    cleanup(root);
  }
});

test('a fuller skill-driven move (todo→doing claim) is legal when policy=skill', () => {
  const id = 'agentic-workflow-108';
  const { root, bcDir } = makeProject({ id, status: 'todo', startFolder: 'todo' });
  try {
    const res = applyTaskMove(root, id, 'todo', 'doing', { context: BC, policy: 'skill' });
    assert.equal(res.ok, true);
    assert.equal(existsSync(fileIn(bcDir, 'doing', id)), true);
    const moved = readFileSync(fileIn(bcDir, 'doing', id), 'utf8');
    assert.match(moved, /^status: doing$/m);
  } finally {
    cleanup(root);
  }
});

test('the same todo→doing claim is rejected under the default UI policy', () => {
  const id = 'agentic-workflow-109';
  const { root, bcDir } = makeProject({ id, status: 'todo', startFolder: 'todo' });
  try {
    const res = applyTaskMove(root, id, 'todo', 'doing', { context: BC }); // default policy = 'ui'
    assert.equal(res.ok, false);
    assert.equal(res.code, 'illegal-move');
    assert.equal(existsSync(fileIn(bcDir, 'todo', id)), true);
    assert.equal(existsSync(fileIn(bcDir, 'doing', id)), false);
  } finally {
    cleanup(root);
  }
});
