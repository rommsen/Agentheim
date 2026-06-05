import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { watchAgentheim } from '../watcher.mjs';

function makeProject() {
  const base = mkdtempSync(path.join(tmpdir(), 'inf003-watch-'));
  const ah = path.join(base, '.agentheim');
  mkdirSync(path.join(ah, 'contexts', 'demo', 'backlog'), { recursive: true });
  mkdirSync(path.join(ah, 'contexts', 'demo', 'todo'), { recursive: true });
  return { base, ah };
}

/** Collect the first event (or time out) from a watcher started on `root`. */
function nextEvent(root, trigger, opts = {}) {
  return new Promise((resolve, reject) => {
    const events = [];
    const watcher = watchAgentheim(root, (evt) => events.push(evt), { debounceMs: 30, ...opts });
    const timer = setTimeout(() => {
      watcher.close();
      events.length ? resolve(events) : reject(new Error('no event within timeout'));
    }, 1500);
    // give the watch a beat to attach, then mutate
    setTimeout(() => {
      try {
        trigger();
      } catch (e) {
        clearTimeout(timer);
        watcher.close();
        reject(e);
      }
    }, 80);
    // resolve early once we have at least one event past the debounce window
    const poll = setInterval(() => {
      if (events.length) {
        clearInterval(poll);
        clearTimeout(timer);
        watcher.close();
        resolve(events);
      }
    }, 40);
  });
}

test('emits a tree-changed pointer when a file under .agentheim/ changes', async () => {
  const { base, ah } = makeProject();
  try {
    const events = await nextEvent(base, () => {
      writeFileSync(path.join(ah, 'contexts', 'demo', 'backlog', 'demo-001.md'), '# task');
    });
    assert.ok(events.length >= 1);
    assert.equal(events[0].type, 'tree-changed');
    assert.equal(typeof events[0].path, 'string');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('detects a task-file move (rename across lifecycle folders)', async () => {
  const { base, ah } = makeProject();
  const src = path.join(ah, 'contexts', 'demo', 'backlog', 'demo-002.md');
  const dst = path.join(ah, 'contexts', 'demo', 'todo', 'demo-002.md');
  writeFileSync(src, '# task');
  try {
    const events = await nextEvent(base, () => renameSync(src, dst));
    assert.ok(events.length >= 1);
    assert.equal(events[0].type, 'tree-changed');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('every emitted path resolves inside the project root', async () => {
  const { base, ah } = makeProject();
  try {
    const events = await nextEvent(base, () => {
      writeFileSync(path.join(ah, 'contexts', 'demo', 'todo', 'demo-003.md'), 'x');
    });
    for (const evt of events) {
      const resolved = path.resolve(base, evt.path);
      const withSep = base.endsWith(path.sep) ? base : base + path.sep;
      assert.ok(resolved === base || resolved.startsWith(withSep), `escaped root: ${evt.path}`);
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('debounces a burst of changes into few events', async () => {
  const { base, ah } = makeProject();
  const collected = [];
  const watcher = watchAgentheim(base, (e) => collected.push(e), { debounceMs: 60 });
  try {
    // let watch attach
    await new Promise((r) => setTimeout(r, 80));
    const dir = path.join(ah, 'contexts', 'demo', 'backlog');
    for (let i = 0; i < 10; i++) {
      writeFileSync(path.join(dir, `burst-${i}.md`), String(i));
    }
    await new Promise((r) => setTimeout(r, 400));
    assert.ok(collected.length >= 1, 'expected at least one event');
    assert.ok(collected.length < 10, `expected debounced (<10), got ${collected.length}`);
  } finally {
    watcher.close();
    rmSync(base, { recursive: true, force: true });
  }
});

test('close() stops further emission', async () => {
  const { base, ah } = makeProject();
  const collected = [];
  const watcher = watchAgentheim(base, (e) => collected.push(e), { debounceMs: 30 });
  await new Promise((r) => setTimeout(r, 80));
  watcher.close();
  writeFileSync(path.join(ah, 'contexts', 'demo', 'backlog', 'after-close.md'), 'x');
  await new Promise((r) => setTimeout(r, 250));
  rmSync(base, { recursive: true, force: true });
  assert.equal(collected.length, 0);
});
