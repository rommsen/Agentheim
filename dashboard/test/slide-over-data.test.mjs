// Tests for the dashboard slide-over's pure, framework-free logic
// (agentic-workflow-007). The slide-over itself is a thin React wrapper around
// the APPROVED styleguide Drawer (imported, never forked — ADR-0003); the
// load-bearing logic that warrants unit coverage is (a) turning an open-intent
// (a board task OR any non-task artifact) into the doc-shaped `item` the
// styleguide Drawer renders, and (b) building the /api/doc URL from a path.
// Both are pure, so they are tested here under `node --test` (no DOM).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { docUrl, intentToDrawerItem } from '../app/slide-over-data.js';

// ---- docUrl ---------------------------------------------------------------

test('docUrl builds /api/doc with the path query-encoded', () => {
  assert.equal(
    docUrl('.agentheim/contexts/alpha/todo/alpha-002.md'),
    '/api/doc?path=.agentheim%2Fcontexts%2Falpha%2Ftodo%2Falpha-002.md',
  );
});

test('docUrl encodes spaces and reserved characters in the path', () => {
  assert.equal(
    docUrl('.agentheim/research/a b&c.md'),
    '/api/doc?path=.agentheim%2Fresearch%2Fa%20b%26c.md',
  );
});

// ---- intentToDrawerItem ---------------------------------------------------

test('a board task intent becomes a ticket-typed doc item carrying its real path and body', () => {
  const item = intentToDrawerItem(
    { id: 'alpha-002', title: 'A todo task', status: 'todo', type: 'feature',
      context: 'alpha', path: '.agentheim/contexts/alpha/todo/alpha-002.md' },
    '# A todo task\n\nbody',
  );
  // Doc-shaped (no `status`) so the styleguide describeItem keeps the REAL path
  // instead of synthesizing tickets/<id>.md, and renders the fetched markdown.
  assert.equal(item.status, undefined);
  assert.equal(item.type, 'ticket');
  assert.equal(item.meta, '.agentheim/contexts/alpha/todo/alpha-002.md');
  assert.equal(item.body, '# A todo task\n\nbody');
  // The doc item carries the intent's title so the styleguide Drawer header
  // (ds-014) leads with it rather than the bare path (aw-047).
  assert.equal(item.title, 'A todo task');
});

test('the doc item carries the intent title so the Drawer header leads with it, not the path (aw-047)', () => {
  // ds-014 keyed the Drawer's HeaderContextual title on a `title` field carried
  // by describeItem's doc branch; this is the dashboard half that feeds it.
  const item = intentToDrawerItem(
    { type: 'adr', title: 'ADR-0009 — Some decision',
      path: '.agentheim/knowledge/decisions/0009-x.md' },
    '# ADR-0009',
  );
  assert.equal(item.title, 'ADR-0009 — Some decision');
});

test('a title-less intent yields an empty-string title (the Drawer falls back to the path)', () => {
  const item = intentToDrawerItem({ path: 'p.md' }, 'b');
  assert.equal(item.title, '');
});

test('a non-task artifact intent keeps its own content-type and renders uniformly', () => {
  // aw-008 navigation will emit artifacts carrying an explicit content type.
  const item = intentToDrawerItem(
    { type: 'adr', title: 'ADR-0009', path: '.agentheim/knowledge/decisions/0009-x.md' },
    '# ADR-0009',
  );
  assert.equal(item.type, 'adr');
  assert.equal(item.meta, '.agentheim/knowledge/decisions/0009-x.md');
  assert.equal(item.body, '# ADR-0009');
});

test('a concept intent keeps its concept content-type so the type pill resolves (aw-075)', () => {
  // aw-075 surfaces Concepts in the rail + search; a concept row opening in the
  // main pane must keep type 'concept' so the ds-021 registry pill resolves.
  const item = intentToDrawerItem(
    { type: 'concept', title: 'aggregate-lifecycle',
      path: '.agentheim/contexts/alpha/concepts/aggregate-lifecycle.md' },
    '# Aggregate lifecycle',
  );
  assert.equal(item.type, 'concept');
  assert.equal(item.meta, '.agentheim/contexts/alpha/concepts/aggregate-lifecycle.md');
});

test('an intent with an unknown/absent content type falls back to a recognized one (never null pill)', () => {
  // The /api/tree task `type` is feature/bug/chore — not a styleguide content
  // type. A task (has status) maps to `ticket`; a typeless artifact falls back
  // to a defined content type so the Drawer header never renders an empty pill.
  const task = intentToDrawerItem(
    { id: 'x-1', status: 'doing', type: 'bug', path: 'p.md' }, 'b',
  );
  assert.equal(task.type, 'ticket');

  const typeless = intentToDrawerItem({ path: 'q.md' }, 'b');
  assert.ok(['adr', 'context', 'vision', 'map', 'research', 'concept', 'ticket'].includes(typeless.type));
});

test('a null/undefined intent yields null (nothing to open)', () => {
  assert.equal(intentToDrawerItem(null, 'b'), null);
  assert.equal(intentToDrawerItem(undefined, 'b'), null);
});

test('the path is taken verbatim from the intent (it is what /api/doc validates)', () => {
  const p = '.agentheim/contexts/agentic-workflow/done/aw-005.md';
  const item = intentToDrawerItem({ id: 'aw-005', status: 'done', path: p }, 'x');
  assert.equal(item.meta, p);
  assert.equal(docUrl(item.meta), `/api/doc?path=${encodeURIComponent(p)}`);
});
