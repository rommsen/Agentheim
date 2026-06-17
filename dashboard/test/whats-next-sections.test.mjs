// Tests for the pure WHAT'S-NEXT body-to-columns splitter (agentic-workflow-q7m4k).
//
// The What's next advisory artifact (ADR-0027 / aw-076) always carries three H2
// sections — `## Where things stand`, `## Recommended move`, `## Next`. The dashboard
// panel (aw-073) used to render the whole body as one stacked markdown stream with a
// folded frontmatter section. aw-q7m4k drops the frontmatter render and lays the three
// sections out as side-by-side columns. `splitWhatsNextSections` is the pure transform
// behind that: strip the leading frontmatter, then split the body on its H2 headings
// into ordered { heading, content } columns. It is LOSS-TOLERANT — a body that does not
// match the expected three-section shape still yields whatever is parseable, never
// throws, never invents content.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { splitWhatsNextSections } from '../app/whats-next-state.js';

const FULL = `---
generated: 2026-06-18T10:18:00Z
---

## Where things stand

Board is clear.

## Recommended move

Run brainstorm on the existing-code path.

## Next

Do the thing.
`;

test('splits the full artifact into its three ordered named columns, frontmatter stripped', () => {
  const cols = splitWhatsNextSections(FULL);
  assert.equal(cols.length, 3);
  assert.deepEqual(cols.map((c) => c.heading), [
    'Where things stand',
    'Recommended move',
    'Next',
  ]);
  assert.equal(cols[0].content.trim(), 'Board is clear.');
  assert.equal(cols[1].content.trim(), 'Run brainstorm on the existing-code path.');
  assert.equal(cols[2].content.trim(), 'Do the thing.');
});

test('the frontmatter never leaks into any column content', () => {
  const cols = splitWhatsNextSections(FULL);
  for (const col of cols) {
    assert.doesNotMatch(col.content, /generated:/);
    assert.doesNotMatch(col.content, /^---/m);
  }
});

test('a missing section simply yields fewer columns (loss-tolerant, no empty filler)', () => {
  const body = `---
generated: 2026-06-18T10:18:00Z
---

## Where things stand

Only one section here.
`;
  const cols = splitWhatsNextSections(body);
  assert.equal(cols.length, 1);
  assert.equal(cols[0].heading, 'Where things stand');
  assert.equal(cols[0].content.trim(), 'Only one section here.');
});

test('an empty / blank body yields no columns (renders nothing upstream)', () => {
  assert.deepEqual(splitWhatsNextSections(''), []);
  assert.deepEqual(splitWhatsNextSections('   \n  \n'), []);
  assert.deepEqual(splitWhatsNextSections('---\ngenerated: x\n---\n'), []);
});

test('a non-string body never throws — yields no columns', () => {
  assert.deepEqual(splitWhatsNextSections(null), []);
  assert.deepEqual(splitWhatsNextSections(undefined), []);
  assert.deepEqual(splitWhatsNextSections(42), []);
});

test('a heading with an empty section keeps the heading with empty content (still a column)', () => {
  const body = `## Where things stand

## Recommended move

Has content.
`;
  const cols = splitWhatsNextSections(body);
  assert.equal(cols.length, 2);
  assert.equal(cols[0].heading, 'Where things stand');
  assert.equal(cols[0].content.trim(), '');
  assert.equal(cols[1].content.trim(), 'Has content.');
});

test('content before the first H2 is preserved as a leading headingless column (loss-tolerant)', () => {
  const body = `Some preamble with no heading.

## Where things stand

Stand.
`;
  const cols = splitWhatsNextSections(body);
  assert.equal(cols.length, 2);
  assert.equal(cols[0].heading, '');
  assert.equal(cols[0].content.trim(), 'Some preamble with no heading.');
  assert.equal(cols[1].heading, 'Where things stand');
});
