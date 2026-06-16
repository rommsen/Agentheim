// Tests for the dashboard's pure frontmatter helper (agentic-workflow-043).
//
// Documents fetched from /api/doc carry a leading YAML frontmatter block. When
// the raw body is handed straight to the styleguide `Markdown` primitive
// (consumed unforked, ADR-0003 — marked.parse + dangerouslySetInnerHTML), marked
// reads the trailing `---` of the frontmatter as a setext heading underline and
// renders the whole block as one large bold heading at the top of BOTH render
// surfaces (the task slide-over, ADR-0010, and the main-pane reader, ADR-0021).
//
// frontmatter.js fixes both with ONE pure string transform, upstream of the
// primitive: strip the leading `---`…`---` block out of the body and re-emit it
// as a native, token-styled, collapsed-by-default `<details>` section prepended
// to the stripped body. marked passes the raw HTML through verbatim, so the same
// composed string flows through the Drawer (slide-over) and the direct Markdown
// (main-pane reader). No YAML dependency: a hand-rolled flat key/value parse.
//
// The module is pure and framework-free (the BC precedent: board-sort.js,
// slide-over-data.js, confetti-launch.js), so it is unit-tested here under
// `node --test` without a DOM. Two source-reading static guards confirm both
// render boundaries actually call the helper.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseFrontmatter,
  frontmatterSection,
  withFrontmatterSection,
} from '../app/frontmatter.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(here, '..');

const SAMPLE = [
  '---',
  'id: agentic-workflow-043',
  'title: Hides frontmatter',
  'status: todo',
  'type: feature',
  'depends_on: [design-system-001-styleguide]',
  'tags: []',
  '---',
  '',
  '## Why',
  '',
  'Body text here.',
].join('\n');

// ---- parseFrontmatter ------------------------------------------------------

test('parseFrontmatter splits the leading --- block from the body as flat key/value pairs', () => {
  const { fields, body } = parseFrontmatter(SAMPLE);
  assert.deepEqual(fields, [
    ['id', 'agentic-workflow-043'],
    ['title', 'Hides frontmatter'],
    ['status', 'todo'],
    ['type', 'feature'],
    ['depends_on', '[design-system-001-styleguide]'],
    ['tags', '[]'],
  ]);
  // The frontmatter block (and its delimiters) is gone from the body; the body
  // begins at the first content line after the closing ---.
  assert.equal(body, '## Why\n\nBody text here.');
  assert.doesNotMatch(body, /^---/);
  assert.doesNotMatch(body, /id: agentic-workflow-043/);
});

test('parseFrontmatter returns the raw string unchanged when there is no leading frontmatter', () => {
  const raw = '# A plain document\n\nNo frontmatter at all.';
  const { fields, body } = parseFrontmatter(raw);
  assert.deepEqual(fields, []);
  assert.equal(body, raw);
});

test('parseFrontmatter only treats a --- on the VERY first line as a frontmatter opener', () => {
  // A horizontal rule mid-document, or leading prose, must not be mistaken for
  // a frontmatter block.
  const raw = 'Intro paragraph.\n\n---\n\nAfter a rule.';
  const { fields, body } = parseFrontmatter(raw);
  assert.deepEqual(fields, []);
  assert.equal(body, raw);
});

test('parseFrontmatter keeps array and empty values as their trimmed raw string (no nested parsing)', () => {
  const raw = '---\nempty:\ntags: [a, b, c]\nblank: []\n---\nbody';
  const { fields } = parseFrontmatter(raw);
  assert.deepEqual(fields, [
    ['empty', ''],
    ['tags', '[a, b, c]'],
    ['blank', '[]'],
  ]);
});

test('parseFrontmatter is robust to a frontmatter block with no body following it', () => {
  const raw = '---\nid: x\n---\n';
  const { fields, body } = parseFrontmatter(raw);
  assert.deepEqual(fields, [['id', 'x']]);
  assert.equal(body, '');
});

test('parseFrontmatter does not throw and passes through when an opener has no closing ---', () => {
  // An unterminated block is NOT frontmatter — treat the whole thing as body
  // rather than swallowing the document.
  const raw = '---\nid: x\nnever closes\nmore body';
  const { fields, body } = parseFrontmatter(raw);
  assert.deepEqual(fields, []);
  assert.equal(body, raw);
});

test('parseFrontmatter tolerates null/undefined/empty input', () => {
  assert.deepEqual(parseFrontmatter(''), { fields: [], body: '' });
  assert.deepEqual(parseFrontmatter(null), { fields: [], body: '' });
  assert.deepEqual(parseFrontmatter(undefined), { fields: [], body: '' });
});

// ---- frontmatterSection ----------------------------------------------------

test('frontmatterSection emits a collapsed-by-default native <details> labelled "Front matter"', () => {
  const html = frontmatterSection([['id', 'x'], ['status', 'todo']]);
  assert.match(html, /<details/, 'must be a native <details> element');
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/, 'must NOT carry the open attribute (collapsed by default)');
  assert.match(html, /<summary[^>]*>\s*Front matter\s*<\/summary>/, 'the summary label must read "Front matter"');
});

test('frontmatterSection renders one structured row per field (not a single concatenated line)', () => {
  const html = frontmatterSection([['id', 'x'], ['status', 'todo'], ['type', 'feature']]);
  const rows = html.match(/<tr/g) || [];
  assert.equal(rows.length, 3, 'one <tr> per field — a structured key/value layout');
  // Each key and value is present and associated row-wise.
  assert.match(html, /id[\s\S]*?x/);
  assert.match(html, /status[\s\S]*?todo/);
  assert.match(html, /type[\s\S]*?feature/);
});

test('frontmatterSection is quiet/subdued: token-referencing inline styles, not a bold-white heading', () => {
  const html = frontmatterSection([['id', 'x']]);
  // Styling rides on inline style= attributes (marked passes them through), using
  // design-system tokens — never an <h1>/<h2> that .prose paints large+bold+white.
  assert.match(html, /style=/, 'styling must ride on inline style attributes');
  assert.match(html, /var\(--/, 'styling must reference design-system CSS tokens');
  assert.doesNotMatch(html, /<h[1-6]/, 'the section must not introduce a heading element');
});

test('frontmatterSection HTML-escapes keys and values (no markup injection, no broken table)', () => {
  const html = frontmatterSection([['evil', '<script>alert(1)</script>'], ['amp', 'a & b'], ['"q"', "x<y"]]);
  // The raw markup must NOT survive — angle brackets/ampersands/quotes are entities.
  assert.doesNotMatch(html.replace(/<\/?(details|summary|table|thead|tbody|tr|td|th)[^>]*>/g, ''),
    /<script>/, 'field content must not inject live markup');
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/, 'angle brackets must be escaped');
  assert.match(html, /a &amp; b/, 'ampersands must be escaped');
  assert.match(html, /x&lt;y/, 'value angle brackets must be escaped');
});

test('frontmatterSection renders array and empty values readably (never [object Object], never a throw)', () => {
  const html = frontmatterSection([['tags', '[a, b]'], ['depends_on', '[]'], ['empty', '']]);
  assert.doesNotMatch(html, /\[object Object\]/);
  assert.match(html, /\[a, b\]/);
  assert.match(html, /\[\]/);
});

test('frontmatterSection returns "" when there are no fields (no empty section)', () => {
  assert.equal(frontmatterSection([]), '');
});

// ---- withFrontmatterSection ------------------------------------------------

test('withFrontmatterSection prepends the section to the stripped body', () => {
  const out = withFrontmatterSection(SAMPLE);
  // The section comes first, then the body with the raw frontmatter removed.
  assert.match(out, /^<details/);
  assert.match(out, /## Why/);
  // The raw `key: value` block no longer appears as renderable body text.
  assert.doesNotMatch(out, /\n---\n/);
  // The body content is preserved after the section.
  assert.ok(out.indexOf('## Why') > out.indexOf('Front matter'));
});

test('withFrontmatterSection passes a no-frontmatter document straight through (no section, identical body)', () => {
  const raw = '# Plain\n\nNothing to fold.';
  assert.equal(withFrontmatterSection(raw), raw);
});

test('withFrontmatterSection tolerates empty/null input', () => {
  assert.equal(withFrontmatterSection(''), '');
  assert.equal(withFrontmatterSection(null), '');
});

// ---- render-boundary wiring (source-reading static guards) -----------------

test('the slide-over folds the fetched body through withFrontmatterSection before it becomes the Drawer item', () => {
  const src = readFileSync(path.join(dashboardDir, 'app', 'slide-over.js'), 'utf8');
  assert.match(src, /import\s*\{[^}]*\bwithFrontmatterSection\b[^}]*\}\s*from\s*["']\.\/frontmatter\.js["']/,
    'slide-over.js must import withFrontmatterSection');
  // The transform wraps the FETCHED markdown (the success path), not the loading/error bodies.
  assert.match(src, /withFrontmatterSection\(\s*md\s*\)/,
    'the fetched markdown (md) must pass through withFrontmatterSection before intentToDrawerItem');
  // aw-039's onOpenFullScreen prop thread must remain undisturbed.
  assert.match(src, /onOpenFullScreen=\$\{onOpenFullScreen\}/,
    'the aw-039 onOpenFullScreen Drawer thread must stay intact');
});

test('the main-pane reader folds the fetched body through withFrontmatterSection before <Markdown>', () => {
  const src = readFileSync(path.join(dashboardDir, 'app', 'main-pane-reader.js'), 'utf8');
  assert.match(src, /import\s*\{[^}]*\bwithFrontmatterSection\b[^}]*\}\s*from\s*["']\.\/frontmatter\.js["']/,
    'main-pane-reader.js must import withFrontmatterSection');
  assert.match(src, /withFrontmatterSection\(/,
    'the reader must pass the fetched body through withFrontmatterSection');
  // It still renders through the unforked styleguide Markdown primitive.
  assert.match(src, /<\$\{Markdown\}\s+source=/,
    'the reader must still feed the composed string to the styleguide Markdown primitive');
});
