/* ============================================================
   Agentheim — dashboard board data transform (agentic-workflow-006)

   The pure, framework-free bridge between the read projection
   (/api/tree, aw-005) and the approved styleguide Kanban
   components (design-system-001/002). Given the tree JSON it
   pools every bounded context's tasks into the four FLAT lifecycle
   columns (no swimlanes — the per-card BC chip tells contexts
   apart, per the aw-006 decision) and maps each tree task into the
   shape the styleguide `TicketCard` renders.

   Kept in its own module (no React, no htm) so it is unit-testable
   under `node --test` without a DOM, and so the React board shell
   stays thin. The styleguide source is the single source of UI
   truth (ADR-0003); this transform shapes DATA for it, it does not
   restyle or fork any component.
   ============================================================ */

// The four lifecycle columns, in board order. Mirrors the styleguide's
// COLUMN_ORDER and the on-disk lifecycle folders (backlog → todo → doing → done).
export const COLUMN_ORDER = ['backlog', 'todo', 'doing', 'done'];

const COLUMN_SET = new Set(COLUMN_ORDER);

/**
 * Map one /api/tree task into the object the styleguide `TicketCard` reads.
 * The tree projection carries { id, title, status, type, context, path }; the
 * card additionally renders `est` and `updated` meta and an `agent` flag. The
 * read model deliberately omits those (pointers/metadata only, ADR-0002), so we
 * supply quiet, defined placeholders rather than letting the card show
 * `undefined`. `path` is carried through unchanged — the slide-over (aw-007)
 * uses it to fetch the body via /api/doc; the open-intent emitted on click
 * carries the whole ticket, path included.
 */
export function treeTicket(task) {
  const t = task || {};
  return {
    id: t.id ?? '',
    title: t.title ?? '',
    status: t.status ?? '',
    type: t.type ?? '',
    context: t.context ?? '',
    path: t.path ?? '',
    // Card meta the read model does not carry — defined, quiet defaults.
    est: '—',
    updated: '',
    agent: false,
  };
}

/** Which lifecycle column a task belongs to — by status, falling back safely. */
function columnFor(task) {
  const status = task && typeof task.status === 'string' ? task.status : '';
  // Disk is the source of truth; status drives placement. An unrecognized status
  // is bucketed into backlog so a malformed/odd task is still shown, never lost.
  return COLUMN_SET.has(status) ? status : 'backlog';
}

/**
 * Pool the whole tree projection into four flat lifecycle columns.
 * @param {object|null} tree — the /api/tree JSON ({ contexts: [{ lifecycle }] }).
 * @returns {{ backlog, todo, doing, done }} arrays of TicketCard-shaped objects.
 *
 * Every bounded context's tasks land in the SAME four columns (flat board, no
 * swimlanes). Degrades to four empty columns for a null/empty/malformed tree so
 * the board renders the styleguide empty-column state rather than throwing.
 */
export function treeToColumns(tree) {
  const cols = {};
  for (const c of COLUMN_ORDER) cols[c] = [];

  const contexts = tree && Array.isArray(tree.contexts) ? tree.contexts : [];
  for (const bc of contexts) {
    const lifecycle = bc && bc.lifecycle ? bc.lifecycle : {};
    for (const folder of COLUMN_ORDER) {
      const tasks = Array.isArray(lifecycle[folder]) ? lifecycle[folder] : [];
      for (const task of tasks) {
        cols[columnFor(task)].push(treeTicket(task));
      }
    }
  }
  return cols;
}
