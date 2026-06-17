/* ============================================================
   Agentheim — dashboard library/navigation data transform (agentic-workflow-008)

   The pure, framework-free bridge between the read projection's
   ARTIFACT LOCATIONS half (/api/tree, aw-005) and the approved
   styleguide navigation (design-system library.js: TreeGroup /
   RailItem). Given the tree JSON it pools every NON-TASK artifact
   — vision, context map, every BC README, ADRs, research reports —
   into legibly-ordered, collapsible groups, mapping each into the
   open-intent shape the slide-over (aw-007) consumes: a styleguide
   content `type`, a `title`, and the REAL in-root `path` /api/doc
   fetches by.

   Tasks are deliberately EXCLUDED — the board (aw-006) is the task
   surface; this is the discovery surface for everything else. Kept
   in its own module (no React, no htm) so it is unit-testable under
   `node --test` without a DOM. The styleguide is the single source
   of UI truth (ADR-0003); this shapes DATA for it, never forks it.
   ============================================================ */

// The legible rail groups, in display order:
// Product → Bounded contexts → Concepts → Research → Decisions.
// Concepts sit immediately after Bounded contexts (aw-075); the rail keeps its
// own Research-above-Decisions order (aw-056), which is NOT mirrored to search.
const GROUP_ORDER = ['Product', 'Bounded contexts', 'Concepts', 'Research', 'Decisions'];

/** Last path segment without its `.md` extension — a stable id seed. */
function baseName(p) {
  const seg = String(p ?? '').split('/').pop() || '';
  return seg.replace(/\.md$/i, '');
}

/** A library item in the styleguide TreeItem + slide-over open-intent shape. */
function item(id, type, title, path) {
  return { id, type, title, path };
}

/**
 * Pool the tree projection's artifact LOCATIONS into legibly-ordered groups.
 *
 * @param {object|null} tree — the /api/tree JSON ({ locations, contexts }).
 * @returns {Array<{ group: string, items: Array<{id,type,title,path}> }>}
 *
 * Only NON-TASK artifacts are listed (the board owns tasks). Each item carries
 * a styleguide content `type`, a `title`, and the real `path` — exactly the
 * open-intent the slide-over (aw-007) consumes (it reads `type` + `path`).
 * Empty groups are omitted so the nav never shows a 0-item heading. Degrades
 * to `[]` for a null/empty/malformed tree rather than throwing.
 */
export function treeToLibrary(tree) {
  const t = tree && typeof tree === 'object' ? tree : {};
  const locations = t.locations && typeof t.locations === 'object' ? t.locations : {};
  const contexts = Array.isArray(t.contexts) ? t.contexts : [];

  const groups = {
    Product: [],
    'Bounded contexts': [],
    Concepts: [],
    Decisions: [],
    Research: [],
  };

  // ---- Product: vision + context map -------------------------------------
  if (locations.vision) {
    groups.Product.push(item('doc-vision', 'vision', 'Vision', locations.vision));
  }
  if (locations.contextMap) {
    groups.Product.push(item('doc-map', 'map', 'Context map', locations.contextMap));
  }

  // ---- Bounded contexts: each BC's README, titled by context name --------
  for (const bc of contexts) {
    if (bc && bc.readme) {
      const name = bc.name || baseName(bc.readme);
      groups['Bounded contexts'].push(item(`ctx-${name}`, 'context', name, bc.readme));
    }
  }

  // ---- Concepts: each BC's synthesis pages, titled by baseName -----------
  // Concepts are PER-BC (tree.contexts[].concepts is paths-only — aw-005), not a
  // top-level locations array, so iterate contexts. A BC with a missing/empty/
  // non-array concepts field contributes nothing (never throws). Titled by
  // baseName like ADRs/research; type 'concept' (the ds-021 registry entry).
  for (const bc of contexts) {
    const concepts = bc && Array.isArray(bc.concepts) ? bc.concepts : [];
    for (const p of concepts) {
      if (p) groups.Concepts.push(item(`concept-${baseName(p)}`, 'concept', baseName(p), p));
    }
  }

  // ---- Decisions: every ADR ---------------------------------------------
  const adrs = Array.isArray(locations.adrs) ? locations.adrs : [];
  for (const p of adrs) {
    if (p) groups.Decisions.push(item(`adr-${baseName(p)}`, 'adr', baseName(p), p));
  }

  // ---- Research: every report -------------------------------------------
  const research = Array.isArray(locations.research) ? locations.research : [];
  for (const p of research) {
    if (p) groups.Research.push(item(`res-${baseName(p)}`, 'research', baseName(p), p));
  }

  return GROUP_ORDER
    .map((group) => ({ group, items: groups[group] }))
    .filter((g) => g.items.length > 0);
}

/** Total artifact count across all groups — the Library rail badge. */
export function libraryCount(groups) {
  if (!Array.isArray(groups)) return 0;
  return groups.reduce((n, g) => n + (Array.isArray(g.items) ? g.items.length : 0), 0);
}
