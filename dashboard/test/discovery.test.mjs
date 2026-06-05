import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { discoverRoot, resolveInRoot } from '../discovery.mjs';

function makeProject() {
  const base = mkdtempSync(path.join(tmpdir(), 'aw004-'));
  mkdirSync(path.join(base, '.agentheim'));
  const deep = path.join(base, 'a', 'b', 'c');
  mkdirSync(deep, { recursive: true });
  return { base, deep };
}

test('discoverRoot walks up from a nested dir to the folder holding .agentheim', () => {
  const { base, deep } = makeProject();
  try {
    const root = discoverRoot(deep);
    assert.equal(root, path.resolve(base));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('discoverRoot returns the absolute root even when given the project root itself', () => {
  const { base } = makeProject();
  try {
    assert.equal(discoverRoot(base), path.resolve(base));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('discoverRoot fails loudly when no .agentheim is found up to filesystem root', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'aw004-no-'));
  try {
    assert.throws(() => discoverRoot(base), /\.agentheim/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('resolveInRoot accepts an in-root relative path and returns its absolute path', () => {
  const { base } = makeProject();
  try {
    const root = discoverRoot(base);
    const resolved = resolveInRoot(root, '.agentheim/vision.md');
    assert.equal(resolved, path.resolve(base, '.agentheim', 'vision.md'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('resolveInRoot rejects a traversal path that escapes the root', () => {
  const { base } = makeProject();
  try {
    const root = discoverRoot(base);
    assert.throws(() => resolveInRoot(root, '../../etc/passwd'), /outside|root|traversal/i);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('resolveInRoot rejects an absolute path pointing outside the root', () => {
  const { base } = makeProject();
  try {
    const root = discoverRoot(base);
    const outside = process.platform === 'win32' ? 'C:\\Windows\\system.ini' : '/etc/passwd';
    assert.throws(() => resolveInRoot(root, outside), /outside|root|traversal/i);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('resolveInRoot rejects a sneaky path that normalizes back inside via prefix collision', () => {
  // a sibling dir sharing the root's name prefix must not pass startsWith
  const { base } = makeProject();
  try {
    const root = discoverRoot(base);
    // ../<basename>-evil would startsWith(root) naively without a separator check
    const sibling = path.basename(base) + '-evil/x';
    assert.throws(() => resolveInRoot(root, path.join('..', sibling)), /outside|root|traversal/i);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
