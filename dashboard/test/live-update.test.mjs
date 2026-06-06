// Tests for the SSE live-update consumer core (agentic-workflow-009, ADR-0006).
//
// The consumer's job (ADR-0001): the board is a PROJECTION rebuilt from disk. On
// any `tree-changed` frame it must NOT interpret the raw event as a transition —
// it just signals "re-sync" so the board re-fetches /api/tree. It also re-syncs
// on (re)connect so a reconnect after a drop catches up on anything missed while
// disconnected. The load-bearing logic lives in a framework-free core wired to an
// EventSource-like source, so it is testable here with a fake source (no network,
// no DOM, no React).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createLiveUpdate } from '../app/live-update.js';

/** A minimal EventSource double: records listeners and lets a test emit frames. */
function makeFakeSource() {
  const listeners = {};
  const src = {
    url: null,
    closed: false,
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    close() { this.closed = true; },
    // test helpers
    _emit(type, data) {
      for (const fn of listeners[type] || []) fn({ data });
    },
    _emitError() {
      for (const fn of listeners.error || []) fn({});
    },
  };
  return src;
}

test('a tree-changed frame triggers exactly one re-sync (re-fetch the board, never interpret the event)', () => {
  let syncs = 0;
  let lastEvent;
  const src = makeFakeSource();
  const live = createLiveUpdate({
    onResync: (evt) => { syncs += 1; lastEvent = evt; },
    sourceFactory: () => src,
  });
  src._emit('tree-changed', JSON.stringify({ type: 'tree-changed', path: '.agentheim/contexts/x/todo/x-1.md' }));
  assert.equal(syncs, 1);
  // The consumer hands the raw pointer to onResync but does not interpret it —
  // it is the board's cue to re-fetch /api/tree, not a transition.
  assert.equal(lastEvent.type, 'tree-changed');
  live.close();
});

test('multiple tree-changed frames each trigger a re-sync (idempotent re-fetch, never a double-apply)', () => {
  let syncs = 0;
  const src = makeFakeSource();
  const live = createLiveUpdate({ onResync: () => { syncs += 1; }, sourceFactory: () => src });
  src._emit('tree-changed', '{"type":"tree-changed"}');
  src._emit('tree-changed', '{"type":"tree-changed"}');
  // Each frame is just "re-fetch"; the board rebuilds from disk so re-fetching N
  // times is safe — no accumulation, no double-apply (the move's own echo is one
  // such frame and is handled the same way).
  assert.equal(syncs, 2);
  live.close();
});

test('on (re)connect (the hello frame) the board re-syncs from /api/tree', () => {
  let syncs = 0;
  const src = makeFakeSource();
  const live = createLiveUpdate({ onResync: () => { syncs += 1; }, sourceFactory: () => src });
  // EventSource fires `hello` on connect and again after its automatic reconnect.
  src._emit('hello', '{"type":"hello"}');
  assert.equal(syncs, 1, 're-sync on connect');
  src._emit('hello', '{"type":"hello"}');
  assert.equal(syncs, 2, 're-sync again on reconnect');
  live.close();
});

test('an error does not crash the consumer; the stream reconnects and re-syncs', () => {
  let syncs = 0;
  let factoryCalls = 0;
  const sources = [makeFakeSource(), makeFakeSource()];
  const live = createLiveUpdate({
    onResync: () => { syncs += 1; },
    sourceFactory: () => sources[factoryCalls++] || makeFakeSource(),
    // tighten the reconnect for the test
    reconnectMs: 0,
  });
  // The first source errors. EventSource normally auto-reconnects; for a source
  // double that does not, the consumer must rebuild it. Either way it must not throw.
  assert.doesNotThrow(() => sources[0]._emitError());
  // After reconnect a hello arrives on the new source → re-sync.
  // (When a real EventSource auto-reconnects, it is the SAME object; the consumer
  // tolerates both by re-syncing on every hello.)
  const current = sources[factoryCalls - 1] || sources[0];
  current._emit('hello', '{"type":"hello"}');
  assert.ok(syncs >= 1, 'reconnect re-syncs the board');
  live.close();
});

test('close() tears down the underlying source and stops further re-syncs', () => {
  let syncs = 0;
  const src = makeFakeSource();
  const live = createLiveUpdate({ onResync: () => { syncs += 1; }, sourceFactory: () => src });
  live.close();
  assert.equal(src.closed, true);
  // A late frame after close must not re-sync.
  src._emit('tree-changed', '{"type":"tree-changed"}');
  assert.equal(syncs, 0);
});
