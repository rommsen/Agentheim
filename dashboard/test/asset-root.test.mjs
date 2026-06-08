// Regression for infrastructure-004 (ADR-0002 + ADR-0004): the dashboard's
// default asset root must resolve relative to the dashboard MODULE (where the
// committed dist/ always lives), NOT the discovered project root. When the
// plugin is installed and run against a foreign project, root !== plugin dir,
// so resolving dist/ against root yields a false "assets not built" 404.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defaultAssetRoot, createDashboardServer } from '../server.mjs';

const moduleDir = path.dirname(fileURLToPath(new URL('../server.mjs', import.meta.url)));

async function start(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

test('defaultAssetRoot resolves to the module-relative dist/, independent of project root', () => {
  const foreignRoot = mkdtempSync(path.join(tmpdir(), 'infra004-foreign-'));
  try {
    const expected = path.join(moduleDir, 'dist');
    // Same answer whether root is a foreign project or omitted entirely.
    assert.equal(defaultAssetRoot(foreignRoot), expected);
    assert.equal(defaultAssetRoot(), expected);
  } finally {
    rmSync(foreignRoot, { recursive: true, force: true });
  }
});

test('plugin scenario: foreign project root, dist beside the module — asset served 200', async () => {
  // Simulate the installed-plugin layout: the project being inspected lives in a
  // temp dir with only .agentheim/ — it has NO dashboard/dist of its own. The
  // built dist/ lives beside server.mjs (committed by infrastructure-002), and
  // the default server must serve from there.
  const foreignRoot = mkdtempSync(path.join(tmpdir(), 'infra004-plugin-'));
  mkdirSync(path.join(foreignRoot, '.agentheim'));
  // No assetRoot passed: exercise the production default-caller path.
  const server = createDashboardServer({ root: foreignRoot });
  try {
    const port = await start(server);
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200, 'index.html must be served from the module-relative dist/');
    assert.match(res.headers.get('content-type'), /text\/html/);
  } finally {
    server.close();
    rmSync(foreignRoot, { recursive: true, force: true });
  }
});
