import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildTree, projectTask } from '../tree.mjs';

/**
 * Build a small but realistic .agentheim/ fixture:
 *  - one BC (alpha) with a task in backlog and a task in done
 *  - vision.md, one ADR, one research report
 *  - the BC has a README, an INDEX, and a concepts/ page
 */
function makeProject() {
  const base = mkdtempSync(path.join(tmpdir(), 'aw005-tree-'));
  const ah = path.join(base, '.agentheim');
  mkdirSync(ah);
  writeFileSync(path.join(ah, 'vision.md'), '# Vision');
  writeFileSync(path.join(ah, 'context-map.md'), '# Context map');

  const knowledge = path.join(ah, 'knowledge');
  mkdirSync(path.join(knowledge, 'decisions'), { recursive: true });
  mkdirSync(path.join(knowledge, 'research'), { recursive: true });
  writeFileSync(path.join(knowledge, 'decisions', '0001-foo.md'), '# ADR 0001');
  writeFileSync(path.join(knowledge, 'research', 'spike-bar.md'), '# Research');

  const bc = path.join(ah, 'contexts', 'alpha');
  for (const f of ['backlog', 'todo', 'doing', 'done']) {
    mkdirSync(path.join(bc, f), { recursive: true });
  }
  writeFileSync(path.join(bc, 'README.md'), '# Alpha');
  writeFileSync(path.join(bc, 'INDEX.md'), '# Alpha index');
  mkdirSync(path.join(bc, 'concepts'), { recursive: true });
  writeFileSync(path.join(bc, 'concepts', 'thing.md'), '# Thing');

  writeFileSync(
    path.join(bc, 'backlog', 'alpha-001-do-a-thing.md'),
    [
      '---',
      'id: alpha-001',
      'title: Do a thing',
      'status: backlog',
      'type: feature',
      'context: alpha',
      '---',
      '',
      '## Body that must not appear in the tree',
    ].join('\n')
  );
  writeFileSync(
    path.join(bc, 'done', 'alpha-002-done-thing.md'),
    [
      '---',
      'id: alpha-002',
      'title: Done thing',
      'status: done',
      'type: bug',
      'context: alpha',
      '---',
      '',
      'secret body',
    ].join('\n')
  );

  return { base };
}

test('buildTree lists every BC with its four lifecycle folders', () => {
  const { base } = makeProject();
  try {
    const tree = buildTree(base);
    const bcNames = tree.contexts.map((c) => c.name);
    assert.deepEqual(bcNames, ['alpha']);
    const alpha = tree.contexts[0];
    assert.deepEqual(Object.keys(alpha.lifecycle).sort(), ['backlog', 'doing', 'done', 'todo']);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('tasks carry id/title/status/type/context/path from frontmatter, no body', () => {
  const { base } = makeProject();
  try {
    const tree = buildTree(base);
    const alpha = tree.contexts[0];
    const t = alpha.lifecycle.backlog[0];
    assert.equal(t.id, 'alpha-001');
    assert.equal(t.title, 'Do a thing');
    assert.equal(t.status, 'backlog');
    assert.equal(t.type, 'feature');
    assert.equal(t.context, 'alpha');
    // path is project-relative, forward-slashed, points at the file
    assert.equal(t.path, '.agentheim/contexts/alpha/backlog/alpha-001-do-a-thing.md');
    // no document body leaks into the projection
    assert.equal(JSON.stringify(t).includes('must not appear'), false);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('every task carries its BC and status so a flat board needs no second request', () => {
  const { base } = makeProject();
  try {
    const tree = buildTree(base);
    const all = tree.contexts.flatMap((c) =>
      Object.values(c.lifecycle).flat()
    );
    assert.ok(all.length >= 2);
    for (const t of all) {
      assert.ok(typeof t.context === 'string' && t.context.length > 0, 'task has context');
      assert.ok(typeof t.status === 'string' && t.status.length > 0, 'task has status');
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('artifact LOCATIONS are projected as pointers, not bodies', () => {
  const { base } = makeProject();
  try {
    const tree = buildTree(base);
    assert.equal(tree.locations.vision, '.agentheim/vision.md');
    assert.equal(tree.locations.contextMap, '.agentheim/context-map.md');
    assert.deepEqual(tree.locations.adrs, ['.agentheim/knowledge/decisions/0001-foo.md']);
    assert.deepEqual(tree.locations.research, ['.agentheim/knowledge/research/spike-bar.md']);
    const alpha = tree.contexts[0];
    assert.equal(alpha.readme, '.agentheim/contexts/alpha/README.md');
    assert.equal(alpha.index, '.agentheim/contexts/alpha/INDEX.md');
    assert.deepEqual(alpha.concepts, ['.agentheim/contexts/alpha/concepts/thing.md']);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('absent vision/context-map/research degrade to null/empty, walk does not abort', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'aw005-bare-'));
  try {
    mkdirSync(path.join(base, '.agentheim', 'contexts', 'beta', 'todo'), { recursive: true });
    const tree = buildTree(base);
    assert.equal(tree.locations.vision, null);
    assert.equal(tree.locations.contextMap, null);
    assert.deepEqual(tree.locations.adrs, []);
    assert.deepEqual(tree.locations.research, []);
    assert.equal(tree.contexts[0].name, 'beta');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('each task carries a numeric mtimeMs (file modification time) for board sort (aw-013)', () => {
  const { base } = makeProject();
  try {
    const tree = buildTree(base);
    const all = tree.contexts.flatMap((c) => Object.values(c.lifecycle).flat());
    assert.ok(all.length >= 2);
    for (const t of all) {
      assert.equal(typeof t.mtimeMs, 'number', 'task has numeric mtimeMs');
      assert.ok(Number.isFinite(t.mtimeMs) && t.mtimeMs > 0, 'mtimeMs is a real epoch ms');
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('an unstattable task file projects mtimeMs: null without throwing (aw-013)', () => {
  // projectTask must never throw; a path that cannot be stat'd (does not exist)
  // exercises the same graceful-degradation branch as an unreadable file.
  const root = mkdtempSync(path.join(tmpdir(), 'aw013-stat-'));
  try {
    const missing = path.join(root, '.agentheim', 'contexts', 'h', 'backlog', 'h-001-gone.md');
    const t = projectTask(root, missing, 'backlog', 'h');
    assert.equal(t.mtimeMs, null, 'unstattable file → mtimeMs null');
    // id still derives from the filename — the projection stays usable.
    assert.equal(t.id, 'h-001-gone');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('malformed / missing frontmatter degrades gracefully — task still listed', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'aw005-bad-'));
  try {
    const bl = path.join(base, '.agentheim', 'contexts', 'g', 'backlog');
    mkdirSync(bl, { recursive: true });
    // no frontmatter fence at all
    writeFileSync(path.join(bl, 'g-001-nofm.md'), '# Just a heading, no frontmatter');
    // unterminated frontmatter
    writeFileSync(path.join(bl, 'g-002-broken.md'), '---\nid: g-002\ntitle: Broken');
    const tree = buildTree(base);
    const tasks = tree.contexts[0].lifecycle.backlog;
    assert.equal(tasks.length, 2, 'both files still listed');
    const byPath = Object.fromEntries(tasks.map((t) => [path.basename(t.path), t]));
    // a file with no parseable id falls back to its filename-derived id, never crashes
    assert.ok(byPath['g-001-nofm.md']);
    assert.ok(byPath['g-001-nofm.md'].path.endsWith('g-001-nofm.md'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
