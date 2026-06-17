// Content search over the project corpus (agentic-workflow-050, ADR-0023).
//
// The read-only server's FIRST endpoint that reads document BODIES in bulk. A
// pure walk/rank/excerpt transform — the idiom of tree.mjs: stdlib-only,
// DOM-free, `node --test`-able, loss-tolerant (never throws on a malformed or
// unreadable file). The thin HTTP route in read-api.mjs (handleSearch) does
// only: read `q`, guard root, call searchCorpus, serialize.
//
// WHAT is searchable is single-sourced from the tree projection (buildTree) so a
// new artifact kind added to the tree becomes searchable for free. Match scope
// is TITLE + BODY only — frontmatter (ids, tags, type, dates) is deliberately
// NOT searched (ADR-0023). Ranking is title-hits-first, then fixed category
// order: Bounded contexts → Concepts → Decisions → Research → Tickets. Results carry the
// EXISTING open-intent shapes (ADR-0021) so the client routes with no new code:
// non-task docs library-data-compatible ({ type, title, path }); tasks
// board-data-compatible ({ status, id, title, path, context }).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildTree } from './tree.mjs';
import { resolveInRoot } from './discovery.mjs';

export const MIN_QUERY_LENGTH = 2;

// Fixed category order within each ranking tier (ADR-0023). Concepts sits
// immediately after Bounded contexts (aw-075) — kept BYTE-IDENTICAL to
// search-results.js's GROUP_ORDER (the two search orderings must agree).
const CATEGORY_ORDER = ['Bounded contexts', 'Concepts', 'Decisions', 'Research', 'Tickets'];
const CATEGORY_RANK = new Map(CATEGORY_ORDER.map((c, i) => [c, i]));

// Excerpt window: ~60 chars of context each side of the first occurrence.
const EXCERPT_PAD = 60;

/** Last path segment without its `.md` extension — mirrors library-data.js. */
function baseName(p) {
  const seg = String(p ?? '').split('/').pop() || '';
  return seg.replace(/\.md$/i, '');
}

/**
 * Drop a leading `---`-fenced frontmatter block, returning the markdown BODY.
 * Loss-tolerant: a file with no fence, or an unterminated fence, is treated as
 * all-body (we never want to hide content from search because the fence is
 * malformed). Mirrors parseFrontmatter's fence detection (tree.mjs).
 */
export function stripFrontmatter(text) {
  const src = String(text ?? '');
  if (!src.startsWith('---')) return src;
  const lines = src.split(/\r?\n/);
  if (lines[0].trim() !== '---') return src;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      return lines.slice(i + 1).join('\n');
    }
  }
  // Unterminated fence → treat the whole text as body.
  return src;
}

/**
 * Build a short, whitespace-collapsed excerpt around the FIRST occurrence of
 * `term` in `text`, matched case-insensitively but sliced from the ORIGINAL-case
 * text. ~EXCERPT_PAD chars each side. Returns '' when the term is absent.
 *
 * Edge cases (ADR-0023): term at the very start (no left window), at the very
 * end (no right window), repeated (first occurrence wins), case-fold offsets
 * (match lower, slice original), multi-line bodies collapse to one line.
 */
export function buildExcerpt(text, term) {
  const src = String(text ?? '');
  const needle = String(term ?? '').toLowerCase();
  if (!needle) return '';
  const at = src.toLowerCase().indexOf(needle);
  if (at === -1) return '';

  const start = Math.max(0, at - EXCERPT_PAD);
  const end = Math.min(src.length, at + needle.length + EXCERPT_PAD);
  const window = src.slice(start, end);
  // Collapse all runs of whitespace (newlines, tabs, multi-space) to one space.
  return window.replace(/\s+/g, ' ').trim();
}

/** Case-insensitive substring test, null-safe. */
function contains(haystack, needle) {
  return String(haystack ?? '').toLowerCase().includes(needle);
}

/**
 * Read a file's body (frontmatter stripped). Loss-tolerant: an unreadable file
 * yields '' so the walk never aborts — same posture as projectTask.
 */
function readBody(absPath) {
  try {
    return stripFrontmatter(readFileSync(absPath, 'utf8'));
  } catch {
    return '';
  }
}

/**
 * Enumerate the searchable corpus from the tree projection. Each entry pairs a
 * title + an in-root path + the open-intent fields the result must carry, by
 * category. WHAT is searchable stays single-sourced with the board/library.
 */
function enumerateCorpus(root, tree) {
  const entries = [];
  const contexts = Array.isArray(tree.contexts) ? tree.contexts : [];
  const locations = tree.locations && typeof tree.locations === 'object' ? tree.locations : {};

  // Bounded contexts — each BC README, titled by context name (library-compat).
  for (const bc of contexts) {
    if (bc && bc.readme) {
      const name = bc.name || baseName(bc.readme);
      entries.push({
        category: 'Bounded contexts',
        title: name,
        relPath: bc.readme,
        intent: { type: 'context', title: name, path: bc.readme },
      });
    }
  }

  // Concepts — each BC's synthesis pages (per-BC, paths-only — aw-005), titled
  // by baseName, library-compatible intent (type 'concept'). Loss-tolerant: a BC
  // with a missing/empty concepts field contributes nothing.
  for (const bc of contexts) {
    const concepts = bc && Array.isArray(bc.concepts) ? bc.concepts : [];
    for (const p of concepts) {
      if (!p) continue;
      const title = baseName(p);
      entries.push({
        category: 'Concepts',
        title,
        relPath: p,
        intent: { type: 'concept', title, path: p },
      });
    }
  }

  // Decisions — every ADR, titled by baseName (library-compat).
  const adrs = Array.isArray(locations.adrs) ? locations.adrs : [];
  for (const p of adrs) {
    if (!p) continue;
    const title = baseName(p);
    entries.push({
      category: 'Decisions',
      title,
      relPath: p,
      intent: { type: 'adr', title, path: p },
    });
  }

  // Research — every report, titled by baseName (library-compat).
  const research = Array.isArray(locations.research) ? locations.research : [];
  for (const p of research) {
    if (!p) continue;
    const title = baseName(p);
    entries.push({
      category: 'Research',
      title,
      relPath: p,
      intent: { type: 'research', title, path: p },
    });
  }

  // Tickets — every task in every BC lifecycle folder. The task carries the full
  // board-compatible intent (status/id/title/path/context).
  for (const bc of contexts) {
    const lifecycle = bc && bc.lifecycle ? bc.lifecycle : {};
    for (const folder of Object.keys(lifecycle)) {
      const tasks = Array.isArray(lifecycle[folder]) ? lifecycle[folder] : [];
      for (const task of tasks) {
        if (!task || !task.path) continue;
        entries.push({
          category: 'Tickets',
          title: task.title || '',
          relPath: task.path,
          intent: {
            status: task.status,
            id: task.id,
            title: task.title || '',
            path: task.path,
            context: task.context,
          },
        });
      }
    }
  }

  return entries;
}

/**
 * Search the project corpus for `query`. Returns an array of result rows shaped
 * `{ category, title, excerpt, path, ...intent }`, ranked title-tier first then
 * by fixed category order.
 *
 * Empty/whitespace query or a query shorter than MIN_QUERY_LENGTH returns `[]`
 * WITHOUT walking the corpus (no bodies read).
 *
 * @param {string} root  discovered project root (the .agentheim/ holder).
 * @param {string} query the raw search term.
 */
export function searchCorpus(root, query) {
  const q = String(query ?? '').trim();
  if (q.length < MIN_QUERY_LENGTH) return [];
  const needle = q.toLowerCase();

  let tree;
  try {
    tree = buildTree(root);
  } catch {
    return [];
  }
  const absRoot = path.resolve(root);

  const rows = [];
  for (const entry of enumerateCorpus(root, tree)) {
    const titleHit = contains(entry.title, needle);

    // Resolve the body path through the in-root guard; a body is only read for an
    // in-root artifact (the walk can never traverse out).
    let body = '';
    try {
      const abs = resolveInRoot(absRoot, entry.relPath);
      body = readBody(abs);
    } catch {
      body = '';
    }
    const bodyHit = contains(body, needle);

    if (!titleHit && !bodyHit) continue;

    // Excerpt: from the body when it matched; otherwise from the title.
    const excerpt = bodyHit ? buildExcerpt(body, q) : buildExcerpt(entry.title, q);

    rows.push({
      category: entry.category,
      title: entry.title,
      excerpt,
      path: entry.relPath,
      ...entry.intent,
      // Internal sort key — stripped before returning.
      _titleTier: titleHit ? 0 : 1,
    });
  }

  // Rank: title tier first, then fixed category order. Stable within a bucket so
  // the tree's own ordering (sorted file enumeration) is preserved.
  rows.sort((a, b) => {
    if (a._titleTier !== b._titleTier) return a._titleTier - b._titleTier;
    const ra = CATEGORY_RANK.get(a.category) ?? 99;
    const rb = CATEGORY_RANK.get(b.category) ?? 99;
    return ra - rb;
  });

  return rows.map(({ _titleTier, ...row }) => row);
}
